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
import torch.nn.functional as F
from PIL import Image
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, Draw, QED, rdMolDescriptors, Fragments

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

    def decode(self, ids) -> str:
        res = []
        for i in ids:
            i = i.item() if isinstance(i, torch.Tensor) else int(i)
            if i == 2:
                break
            if i > 2:
                res.append(self.idx_to_token.get(i, ""))
        return "".join(res)

    def __len__(self):
        return len(self.token_to_idx)


class DeepFiLM(nn.Module):
    def __init__(self, cond_dim: int, hidden_dim: int):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(cond_dim, hidden_dim), nn.GELU(), nn.Linear(hidden_dim, hidden_dim * 2)
        )

    def forward(self, x, cond):
        params = self.mlp(cond).unsqueeze(1)
        gamma, beta = torch.chunk(params, 2, dim=-1)
        return x * (1 + gamma) + beta


class ConditionalVAE(nn.Module):
    def __init__(self, vocab_size, hidden_dim=768, latent_dim=768, num_layers=3):
        super().__init__()
        self.latent_dim, self.num_layers = latent_dim, num_layers
        self.smiles_embedding_layer = nn.Embedding(vocab_size, 768, padding_idx=0)
        self.decoder_init = nn.Sequential(nn.Linear(latent_dim + 1280, hidden_dim), nn.GELU())
        self.decoder_rnn = nn.GRU(768 + 1280, hidden_dim, num_layers, batch_first=True)
        self.film = DeepFiLM(1280, hidden_dim)
        self.out_proj = nn.Linear(hidden_dim, 768, bias=False)
        self.fc_out = nn.Linear(768, vocab_size, bias=False)
        self.fc_out.weight = self.smiles_embedding_layer.weight

    @torch.no_grad()
    def generate(self, p, num_samples, max_len, temp, top_k, top_p):
        B = num_samples
        pe_batch = p.repeat(B, 1)
        z = torch.randn(B, self.latent_dim, device=p.device)
        h = self.decoder_init(torch.cat([z, pe_batch], dim=1)).unsqueeze(0).repeat(self.num_layers, 1, 1)
        cur = torch.full((B, 1), 1, dtype=torch.long, device=p.device)
        seq = [cur]
        for _ in range(max_len):
            emb = self.smiles_embedding_layer(cur[:, -1:])
            out, h = self.decoder_rnn(torch.cat([emb, pe_batch.unsqueeze(1)], dim=-1), h)
            logits = self.fc_out(self.out_proj(self.film(out, pe_batch)[:, -1, :])) / temp
            v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < v[:, [-1]]] = -float('Inf')
            probs = F.softmax(logits, dim=-1)
            sorted_probs, sorted_idx = torch.sort(probs, descending=True)
            cum_probs = torch.cumsum(sorted_probs, dim=-1)
            remove = cum_probs > top_p
            remove[..., 1:], remove[..., 0] = remove[..., :-1].clone(), 0
            probs[remove.scatter(-1, sorted_idx, remove)] = 0.0
            next_tok = torch.multinomial(probs / probs.sum(dim=-1, keepdim=True), 1)
            seq.append(next_tok)
            cur = torch.cat([cur, next_tok], dim=1)
            if (next_tok == 2).all():
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
_pred_vocab: Optional[dict] = None
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
    files = [s.HF_GEN_MODEL_FILE, s.HF_PRED_MODEL_FILE, s.HF_GEN_VOCAB_FILE, s.HF_SMILE_VOCAB_FILE]
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
    global _vocab, _pred_vocab, _gen_model, _pred_model, _device, _models_loaded, _esm_tokenizer, _esm_model

    logger.info("Loading BioGenesis ML models …")
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Using device: %s", _device)

    try:
        paths = _download_model_files()
        from core.config import get_settings
        s = get_settings()

        vocab_path = paths[s.HF_GEN_VOCAB_FILE]
        gen_path = paths[s.HF_GEN_MODEL_FILE]
        pred_path = paths[s.HF_PRED_MODEL_FILE]

        _vocab = SmilesVocabulary()
        _vocab.load(vocab_path)

        _gen_model = ConditionalVAE(len(_vocab)).to(_device)
        gen_ckpt = torch.load(gen_path, map_location=_device)
        _gen_model.load_state_dict(
            {k.replace('module.', ''): v for k, v in gen_ckpt.items()}, strict=False
        )
        _gen_model.eval()
        logger.info("Generator model loaded ✓")

        # Load pred vocab first (needed for BioGenesisDualModel size)
        pred_vocab_path = paths[s.HF_SMILE_VOCAB_FILE]
        with open(pred_vocab_path, "r") as f:
            _pred_vocab = json.load(f)
        logger.info("Pred vocab loaded ✓ (%d tokens)", len(_pred_vocab))

        _pred_model = BioGenesisDualModel(vocab_size=len(_pred_vocab)).to(_device)
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

def calculate_full_analysis(mol) -> dict | None:
    if mol is None:
        return None
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)
    hba = rdMolDescriptors.CalcNumHBA(mol)
    tpsa = Descriptors.TPSA(mol)
    qed_val = QED.qed(mol)

    violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    ro5_pass = "Yes" if violations <= 1 else "No"

    fsp3 = rdMolDescriptors.CalcFractionCSP3(mol)
    num_rings = rdMolDescriptors.CalcNumRings(mol)
    sa_score = max(1.0, min(10.0, (qed_val * 5) + (fsp3 * 2) - (num_rings * 0.5)))

    hia = "High" if tpsa < 140 and logp < 5 else "Low"
    bbb = "High" if 1 < logp < 5 and mw < 450 and tpsa < 90 else "Low"

    tox_alerts = []
    if Fragments.fr_nitro(mol) > 0: tox_alerts.append("Nitro-Groups")
    if Fragments.fr_azo(mol) > 0: tox_alerts.append("Azo-Bonds")
    if Fragments.fr_halogen(mol) > 3: tox_alerts.append("High-Halogen")
    if Fragments.fr_aldehyde(mol) > 0: tox_alerts.append("Reactive-Aldehyde")

    tox_status = "Safe" if not tox_alerts else "Caution"
    tox_detail = ", ".join(tox_alerts) if tox_alerts else "None"

    return {
        "MW": round(mw, 2), "LogP": round(logp, 2), "QED": round(qed_val, 4),
        "SA_Score": round(sa_score, 2), "HIA": hia, "BBB": bbb,
        "Toxicity": tox_status, "Tox_Detail": tox_detail,
        "Ro5_Pass": ro5_pass, "Ro5_Violations": violations,
        "HBD": hbd, "HBA": hba, "TPSA": round(tpsa, 2),
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
    max_attempts = 150  # safety cap on generation loops (supports up to 300 leads)

    attempt = 0
    while len(collected) < num_leads and attempt < max_attempts:
        attempt += 1
        ids = _gen_model.generate(prot_emb, 500, int(max_smiles_len) + 15, temperature, 50, 0.9)
        smis = [_vocab.decode(g).replace(" ", "") for g in ids]
        for s in smis:
            if not s or s in unique_pool:
                continue
            if not (min_smiles_len <= len(s) <= max_smiles_len):
                continue
            mol = Chem.MolFromSmiles(s)
            if mol is None:
                continue
            analysis = calculate_full_analysis(mol)
            if analysis is None or analysis["QED"] < min_qed:
                continue
            tokens = [_pred_vocab.get(c, 0) for c in str(s)][:100]
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
                "mw": analysis["MW"],
                "logp": analysis["LogP"],
                "hbd": analysis["HBD"],
                "hba": analysis["HBA"],
                "tpsa": analysis["TPSA"],
                "qed": analysis["QED"],
                "sa_score": analysis["SA_Score"],
                "hia_absorption": analysis["HIA"],
                "bbb_permeability": analysis["BBB"],
                "toxicity": analysis["Toxicity"],
                "tox_detail": analysis["Tox_Detail"],
                "ro5_pass": analysis["Ro5_Pass"],
                "ro5_violations": analysis["Ro5_Violations"],
                "hbd_count": analysis["HBD"],
                "hba_count": analysis["HBA"],
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

    # Molecule grid image — all leads
    all_mols = [Chem.MolFromSmiles(s) for s in df["smiles"]]
    legends = [
        f"{r['compound_id']} | pAff: {r['predicted_p_affinity']}\n{r['activity_class']}"
        for _, r in df.iterrows()
    ]
    per_row = 5 if len(all_mols) > 12 else 3
    grid_img: Image.Image = Draw.MolsToGridImage(
        all_mols, molsPerRow=per_row, subImgSize=(400, 400), legends=legends, returnPNG=False
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
        mols = [Chem.MolFromSmiles(r.get("smiles", "")) for r in leads]
        valid = [(m, r) for m, r in zip(mols, leads) if m is not None]
        if not valid:
            return ""
        mols, valid_leads = zip(*valid)
        legends = [
            f"{r.get('compound_id', '')} | pAff: {r.get('predicted_p_affinity', '')}\n{r.get('activity_class', '')}"
            for r in valid_leads
        ]
        per_row = 5 if len(mols) > 12 else 3
        grid_img = Draw.MolsToGridImage(
            list(mols), molsPerRow=per_row, subImgSize=(400, 400), legends=list(legends), returnPNG=False
        )
        buf = io.BytesIO()
        grid_img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return ""
