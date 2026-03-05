"""
ML Pipeline Service — ported from Gradio app.py, Gradio removed.
Loads PyTorch models from private HuggingFace repo at startup.
All inference stays server-side.
"""
import io
import base64
import json
import logging
import os
import warnings
from typing import Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, Draw, QED, rdMolDescriptors

warnings.filterwarnings("ignore")
RDLogger.DisableLog("rdApp.*")
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# 1. Architecture definitions (exact port from app.py)
# ──────────────────────────────────────────────

class SmilesVocabulary:
    def __init__(self):
        self.pad_token, self.bos_token, self.eos_token = "<pad>", "<bos>", "<eos>"
        self.token_to_idx: dict = {}
        self.idx_to_token: dict = {}

    def load(self, path: str):
        with open(path, "r") as f:
            self.token_to_idx = json.load(f)
        self.idx_to_token = {int(v): k for k, v in self.token_to_idx.items()}

    def decode(self, token_ids) -> str:
        tokens = []
        for idx in token_ids:
            idx_int = idx.item() if isinstance(idx, torch.Tensor) else int(idx)
            if idx_int == self.token_to_idx.get(self.eos_token, -1):
                break
            if idx_int in (
                self.token_to_idx.get(self.pad_token, -1),
                self.token_to_idx.get(self.bos_token, -1),
            ):
                continue
            tokens.append(self.idx_to_token.get(idx_int, ""))
        return "".join(tokens)

    def __len__(self):
        return len(self.token_to_idx)


class FiLM(nn.Module):
    def __init__(self, cond_dim: int, hidden_dim: int):
        super().__init__()
        self.gamma = nn.Linear(cond_dim, hidden_dim)
        self.beta = nn.Linear(cond_dim, hidden_dim)

    def forward(self, x, cond):
        return x * (1 + self.gamma(cond).unsqueeze(1)) + self.beta(cond).unsqueeze(1)


class ConditionalVAE(nn.Module):
    def __init__(
        self, smiles_embedding_layer, vocab_size, smiles_embedding_dim,
        protein_embedding_dim, hidden_dim, latent_dim, num_layers,
    ):
        super().__init__()
        self.latent_dim, self.num_layers = latent_dim, num_layers
        self.smiles_embedding_layer = smiles_embedding_layer
        self.encoder_rnn = nn.GRU(smiles_embedding_dim, hidden_dim, num_layers=num_layers, batch_first=True)
        self.encoder_protein_mlp = nn.Sequential(
            nn.Linear(protein_embedding_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, hidden_dim)
        )
        self.fc_mu = nn.Linear(hidden_dim * 2, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim * 2, latent_dim)
        self.decoder_init = nn.Sequential(
            nn.Linear(latent_dim + protein_embedding_dim, hidden_dim), nn.ReLU()
        )
        self.decoder_rnn = nn.GRU(smiles_embedding_dim, hidden_dim, num_layers=num_layers, batch_first=True)
        self.film = FiLM(protein_embedding_dim, hidden_dim)
        self.out_proj = nn.Linear(hidden_dim, smiles_embedding_dim, bias=False)
        self.fc_out = nn.Linear(smiles_embedding_dim, vocab_size, bias=False)
        self.fc_out.weight = self.smiles_embedding_layer.weight
        self.bos_id, self.eos_id = 1, 2

    @torch.no_grad()
    def generate(self, protein_embedding, num_samples, max_len, top_k, top_p, temperature):
        B = num_samples
        pe_batch = protein_embedding.repeat(B, 1)
        z = torch.randn(B, self.latent_dim, device=protein_embedding.device)
        h = self.decoder_init(torch.cat([z, pe_batch], dim=1)).unsqueeze(0).repeat(self.num_layers, 1, 1)
        cur = torch.full((B, 1), self.bos_id, dtype=torch.long, device=protein_embedding.device)
        seq = [cur]
        for _ in range(max_len):
            out, h = self.decoder_rnn(self.smiles_embedding_layer(cur[:, -1:]), h)
            logits = self.fc_out(self.out_proj(self.film(out, pe_batch)[:, -1, :])) / max(1e-8, temperature)
            probs = torch.softmax(logits, dim=-1)
            next_tok = torch.multinomial(probs, 1).squeeze(1).unsqueeze(1)
            seq.append(next_tok)
            cur = torch.cat([cur, next_tok], dim=1)
            if torch.all(next_tok.squeeze(1) == self.eos_id):
                break
        return torch.cat(seq, dim=1)


class BioGenesisDualModel(nn.Module):
    def __init__(self, vocab_size: int, protein_dim: int = 1280):
        super().__init__()
        self.smi_embed = nn.Embedding(vocab_size + 1, 128)
        self.smi_conv = nn.Sequential(
            nn.Conv1d(128, 256, 3, padding=1), nn.ReLU(),
            nn.Conv1d(256, 512, 3, padding=1), nn.ReLU(),
            nn.AdaptiveMaxPool1d(1),
        )
        self.prot_fc = nn.Sequential(nn.Linear(protein_dim, 512), nn.ReLU(), nn.Dropout(0.2))
        self.shared_fc = nn.Sequential(
            nn.Linear(512 + 512, 1024), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(1024, 512), nn.ReLU(),
        )
        self.head_class = nn.Linear(512, 2)
        self.head_aff = nn.Linear(512, 1)

    def forward(self, smi, prot):
        x_s = self.smi_embed(smi).permute(0, 2, 1)
        x_s = self.smi_conv(x_s).squeeze(-1)
        x_p = self.prot_fc(prot)
        combined = torch.cat((x_s, x_p), dim=1)
        shared = self.shared_fc(combined)
        return self.head_class(shared), self.head_aff(shared).squeeze(-1)


# ──────────────────────────────────────────────
# 2. Global model state
# ──────────────────────────────────────────────

_vocab: Optional[SmilesVocabulary] = None
_gen_model: Optional[ConditionalVAE] = None
_pred_model: Optional[BioGenesisDualModel] = None
_esm_tokenizer = None
_esm_model = None
_device: torch.device = torch.device("cpu")
_models_loaded: bool = False


def is_loaded() -> bool:
    return _models_loaded


def _download_model_files() -> dict[str, str]:
    """Download model files from private HF repo. Returns local paths."""
    from huggingface_hub import hf_hub_download
    from core.config import get_settings
    s = get_settings()
    
    paths = {}
    files = [s.HF_GEN_MODEL_FILE, s.HF_PRED_MODEL_FILE, s.HF_SMILE_VOCAB_FILE]
    for fname in files:
        logger.info("Downloading %s from %s …", fname, s.HF_GEN_MODEL_REPO)
        local = hf_hub_download(
            repo_id=s.HF_GEN_MODEL_REPO,
            filename=fname,
            token=s.HF_TOKEN,
        )
        paths[fname] = local
        logger.info("Saved → %s", local)
    return paths


def load_models():
    """Called once at app startup. Downloads and loads all models."""
    global _vocab, _gen_model, _pred_model, _device, _models_loaded, _esm_tokenizer, _esm_model

    logger.info("Loading BioGenesis ML models …")
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Using device: %s", _device)

    try:
        paths = _download_model_files()
        from core.config import get_settings
        s = get_settings()

        vocab_path = paths[s.HF_SMILE_VOCAB_FILE]
        gen_path = paths[s.HF_GEN_MODEL_FILE]
        pred_path = paths[s.HF_PRED_MODEL_FILE]

        _vocab = SmilesVocabulary()
        _vocab.load(vocab_path)

        embedding = nn.Embedding(len(_vocab), 768, padding_idx=0)
        _gen_model = ConditionalVAE(embedding, len(_vocab), 768, 1280, 768, 768, 3).to(_device)
        _gen_model.load_state_dict(torch.load(gen_path, map_location=_device))
        _gen_model.eval()
        logger.info("Generator model loaded ✓")

        _pred_model = BioGenesisDualModel(vocab_size=len(_vocab)).to(_device)
        ckpt = torch.load(pred_path, map_location=_device)
        _pred_model.load_state_dict(ckpt["model_state_dict"])
        _pred_model.eval()
        logger.info("Predictor model loaded ✓")

        # Load ESM2 tokenizer + model once at startup
        logger.info("Loading ESM2 protein model …")
        from transformers import AutoTokenizer, EsmModel
        _esm_tokenizer = AutoTokenizer.from_pretrained(s.HF_ESM_MODEL_NAME, token=s.HF_TOKEN or None)
        _esm_model = EsmModel.from_pretrained(s.HF_ESM_MODEL_NAME, token=s.HF_TOKEN or None).to(_device).eval()
        logger.info("ESM2 loaded ✓")

        _models_loaded = True
        logger.info("All models ready.")
    except Exception as exc:
        logger.error("Failed to load models: %s", exc, exc_info=True)
        _models_loaded = False
        raise


# ──────────────────────────────────────────────
# 3. ESM protein embedding
# ──────────────────────────────────────────────

@torch.no_grad()
def _get_esm_embedding(sequence: str) -> torch.Tensor:
    global _esm_tokenizer, _esm_model
    logger.debug("Computing ESM embedding …")
    # Use globally cached model; fallback-load if somehow called before startup
    if _esm_tokenizer is None or _esm_model is None:
        from transformers import AutoTokenizer, EsmModel
        from core.config import get_settings
        s = get_settings()
        logger.warning("ESM2 not pre-loaded — loading now (slow path)")
        _esm_tokenizer = AutoTokenizer.from_pretrained(s.HF_ESM_MODEL_NAME, token=s.HF_TOKEN or None)
        _esm_model = EsmModel.from_pretrained(s.HF_ESM_MODEL_NAME, token=s.HF_TOKEN or None).to(_device).eval()
    inputs = _esm_tokenizer(sequence, return_tensors="pt", truncation=True, max_length=1000).to(_device)
    emb = _esm_model(**inputs).last_hidden_state.mean(dim=1)
    return emb


# ──────────────────────────────────────────────
# 4. Chemistry analysis
# ──────────────────────────────────────────────

def _analyze_lead(mol) -> dict | None:
    if mol is None:
        return None
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)
    hba = rdMolDescriptors.CalcNumHBA(mol)
    tpsa = Descriptors.TPSA(mol)
    qed_val = QED.qed(mol)
    num_rot = rdMolDescriptors.CalcNumRotatableBonds(mol)
    synt = 1.0 / (1 + num_rot + (mw / 500))
    violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    return {
        "MW": round(mw, 2), "LogP": round(logp, 2), "HBD": hbd, "HBA": hba,
        "TPSA": round(tpsa, 2), "QED": round(qed_val, 4),
        "Synthetizability": round(synt, 2), "Ro5_Pass": "Yes" if violations <= 1 else "No",
    }


# ──────────────────────────────────────────────
# 5. Main inference function (sync — run in thread pool)
# ──────────────────────────────────────────────

def run_prediction(
    sequence: str,
    min_qed: float = 0.6,
    temperature: float = 0.8,
    min_smiles_len: int = 40,
    max_smiles_len: int = 100,
    num_leads: int = 9,
) -> dict:
    """
    Full ML pipeline. Returns {"leads": [...], "image_base64": "...", "csv_str": "..."}.
    NOTE: This is CPU/GPU-bound. Call from a thread pool (asyncio.to_thread).
    """
    if not _models_loaded:
        raise RuntimeError("Models not loaded yet. Try again shortly.")

    prot_emb = _get_esm_embedding(sequence)

    collected: list[dict] = []
    unique_pool: set[str] = set()
    max_attempts = 30  # safety cap on generation loops

    attempt = 0
    while len(collected) < num_leads and attempt < max_attempts:
        attempt += 1
        ids = _gen_model.generate(prot_emb, 500, int(max_smiles_len) + 15, 50, 0.9, temperature)
        smis = [_vocab.decode(g).replace(" ", "") for g in ids]
        for s in smis:
            if not s or s in unique_pool:
                continue
            if not (min_smiles_len <= len(s) <= max_smiles_len):
                continue
            mol = Chem.MolFromSmiles(s)
            if mol is None:
                continue
            metrics = _analyze_lead(mol)
            if metrics is None or metrics["QED"] < min_qed:
                continue
            tokens = [_vocab.token_to_idx.get(c, 0) for c in str(s)][:100]
            tokens += [0] * (100 - len(tokens))
            with torch.no_grad():
                o_c, o_a = _pred_model(
                    torch.LongTensor([tokens]).to(_device), prot_emb
                )
                cls_name = "Inhibitor" if torch.argmax(o_c).item() == 0 else "Activator"
                affinity = float(o_a.item())

            entry = {
                "compound_id": f"Lead_{len(collected) + 1}",
                "smiles": s,
                "mw": metrics["MW"],
                "logp": metrics["LogP"],
                "hbd": metrics["HBD"],
                "hba": metrics["HBA"],
                "tpsa": metrics["TPSA"],
                "qed": metrics["QED"],
                "synthetizability": metrics["Synthetizability"],
                "ro5_pass": metrics["Ro5_Pass"],
                "predicted_p_affinity": round(affinity, 3),
                "activity_class": cls_name,
            }
            collected.append(entry)
            unique_pool.add(s)
            if len(collected) >= num_leads:
                break

    if not collected:
        raise ValueError("No valid drug candidates found. Try adjusting parameters.")

    df = pd.DataFrame(collected).sort_values("predicted_p_affinity", ascending=False)

    # Molecule grid image
    top_n = min(12, len(df))
    mols = [Chem.MolFromSmiles(s) for s in df.head(top_n)["smiles"]]
    legends = [
        f"{r['compound_id']} | pAff: {r['predicted_p_affinity']}\n{r['activity_class']}"
        for _, r in df.head(top_n).iterrows()
    ]
    grid_img: Image.Image = Draw.MolsToGridImage(
        mols, molsPerRow=3, subImgSize=(500, 500), legends=legends, returnPNG=False
    )
    buf = io.BytesIO()
    grid_img.save(buf, format="PNG")
    image_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    # CSV
    csv_str = df.to_csv(index=False)

    leads = df.to_dict(orient="records")

    return {"leads": leads, "image_base64": image_b64, "csv_str": csv_str}


def generate_structure_image(leads: list) -> str:
    """Regenerate the molecule grid PNG (base64) from a list of lead dicts.
    Used to back-fill image_base64 for older predictions that were stored without it."""
    if not leads:
        return ""
    try:
        top_n = min(12, len(leads))
        subset = leads[:top_n]
        mols = [Chem.MolFromSmiles(r.get("smiles", "")) for r in subset]
        mols = [m for m in mols if m is not None]
        if not mols:
            return ""
        legends = [
            f"{r.get('compound_id', '')} | pAff: {r.get('predicted_p_affinity', '')}\n{r.get('activity_class', '')}"
            for r in subset[:len(mols)]
        ]
        grid_img = Draw.MolsToGridImage(
            mols, molsPerRow=3, subImgSize=(500, 500), legends=legends, returnPNG=False
        )
        buf = io.BytesIO()
        grid_img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return ""
