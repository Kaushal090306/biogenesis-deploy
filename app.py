import os
import json
import warnings
import logging
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import random
import gradio as gr
from PIL import Image
from rdkit import Chem
from rdkit.Chem import Descriptors, Draw, QED, rdMolDescriptors
from rdkit import RDLogger

# --- System Suppression ---
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("rdkit").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")
RDLogger.DisableLog('rdApp.*')

# ==============================================================================
# 0. CONFIGURATION & PATHS
# ==============================================================================
MASTER_LICENSE_KEY = "SARWESHWAR-AI-2026"

GLOBAL_CONFIG = {
    "HIDDEN_DIM": 768, "LATENT_DIM": 768, "NUM_LAYERS": 3,
    "SMILES_EMBEDDING_DIM": 768, "PROTEIN_EMBEDDING_DIM": 1280,
    "BATCH_GEN_SIZE": 1500, "TOP_K": 50, "TOP_P": 0.9,
    "VOCAB_PATH": './smile_atom_level_vocab.json', 
    "GEN_MODEL_PATH": './Gen_AI_Model.pt',           
    "PRED_MODEL_PATH": './biogenesis_checkpoint.pt', 
    "ESM_MODEL_NAME": "facebook/esm2_t33_650M_UR50D"
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==============================================================================
# 1. MODEL ARCHITECTURES
# ==============================================================================
class SmilesVocabulary:
    def __init__(self):
        self.pad_token, self.bos_token, self.eos_token = "<pad>", "<bos>", "<eos>"
        self.token_to_idx, self.idx_to_token = {}, {}
    def load(self, path):
        with open(path, 'r') as f: self.token_to_idx = json.load(f)
        self.idx_to_token = {int(v): k for k, v in self.token_to_idx.items()}
    def decode(self, token_ids):
        tokens = []
        for idx in token_ids:
            idx_int = idx.item() if isinstance(idx, torch.Tensor) else idx
            if idx_int == self.token_to_idx[self.eos_token]: break
            if idx_int in [self.token_to_idx[self.pad_token], self.token_to_idx[self.bos_token]]: continue
            tokens.append(self.idx_to_token.get(idx_int, ""))
        return "".join(tokens)
    def __len__(self):
        return len(self.token_to_idx)

class FiLM(nn.Module):
    def __init__(self, cond_dim, hidden_dim):
        super().__init__()
        self.gamma, self.beta = nn.Linear(cond_dim, hidden_dim), nn.Linear(cond_dim, hidden_dim)
    def forward(self, x, cond):
        return x * (1 + self.gamma(cond).unsqueeze(1)) + self.beta(cond).unsqueeze(1)

class ConditionalVAE(nn.Module):
    def __init__(self, smiles_embedding_layer, vocab_size, smiles_embedding_dim,
                 protein_embedding_dim, hidden_dim, latent_dim, num_layers):
        super().__init__()
        self.latent_dim, self.num_layers = latent_dim, num_layers
        self.smiles_embedding_layer = smiles_embedding_layer
        self.encoder_rnn = nn.GRU(smiles_embedding_dim, hidden_dim, num_layers=num_layers, batch_first=True)
        self.encoder_protein_mlp = nn.Sequential(nn.Linear(protein_embedding_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, hidden_dim))
        self.fc_mu, self.fc_logvar = nn.Linear(hidden_dim * 2, latent_dim), nn.Linear(hidden_dim * 2, latent_dim)
        self.decoder_init = nn.Sequential(nn.Linear(latent_dim + protein_embedding_dim, hidden_dim), nn.ReLU())
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
            seq.append(next_tok); cur = torch.cat([cur, next_tok], dim=1)
            if torch.all(next_tok.squeeze(1) == self.eos_id): break
        return torch.cat(seq, dim=1)

class BioGenesisDualModel(nn.Module):
    def __init__(self, vocab_size, protein_dim=1280):
        super().__init__()
        self.smi_embed = nn.Embedding(vocab_size + 1, 128)
        self.smi_conv = nn.Sequential(nn.Conv1d(128, 256, 3, padding=1), nn.ReLU(), nn.Conv1d(256, 512, 3, padding=1), nn.ReLU(), nn.AdaptiveMaxPool1d(1))
        self.prot_fc = nn.Sequential(nn.Linear(protein_dim, 512), nn.ReLU(), nn.Dropout(0.2))
        self.shared_fc = nn.Sequential(nn.Linear(512 + 512, 1024), nn.ReLU(), nn.Dropout(0.3), nn.Linear(1024, 512), nn.ReLU())
        self.head_class = nn.Linear(512, 2); self.head_aff = nn.Linear(512, 1)

    def forward(self, smi, prot):
        x_s = self.smi_embed(smi).permute(0, 2, 1)
        x_s = self.smi_conv(x_s).squeeze(-1)
        x_p = self.prot_fc(prot)
        combined = torch.cat((x_s, x_p), dim=1)
        shared = self.shared_fc(combined)
        return self.head_class(shared), self.head_aff(shared).squeeze(-1)

# ==============================================================================
# 2. ANALYSIS LOGIC
# ==============================================================================
def analyze_lead(mol):
    if not mol: return None
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)
    hba = rdMolDescriptors.CalcNumHBA(mol)
    tpsa = Descriptors.TPSA(mol)
    qed_val = QED.qed(mol)
    num_rot_bonds = rdMolDescriptors.CalcNumRotatableBonds(mol)
    synt_score = 1.0 / (1 + num_rot_bonds + (mw / 500))
    violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    return {
        "MW": round(mw, 2), "LogP": round(logp, 2), "HBD": hbd, "HBA": hba,
        "TPSA": round(tpsa, 2), "QED": round(qed_val, 4), 
        "Synthetizability": round(synt_score, 2), "Ro5_Pass": "Yes" if violations <= 1 else "No"
    }

@torch.no_grad()
def get_esm_embedding(seq):
    from transformers import AutoTokenizer, EsmModel
    t = AutoTokenizer.from_pretrained(GLOBAL_CONFIG["ESM_MODEL_NAME"])
    m = EsmModel.from_pretrained(GLOBAL_CONFIG["ESM_MODEL_NAME"]).to(device).eval()
    emb = m(**t(seq, return_tensors="pt", truncation=True, max_length=1000).to(device)).last_hidden_state.mean(dim=1)
    return emb

# Initialization
vocab = SmilesVocabulary(); vocab.load(GLOBAL_CONFIG["VOCAB_PATH"])
gen_model = ConditionalVAE(nn.Embedding(len(vocab), 768, padding_idx=0), len(vocab), 768, 1280, 768, 768, 3).to(device)
gen_model.load_state_dict(torch.load(GLOBAL_CONFIG["GEN_MODEL_PATH"], map_location=device))
gen_model.eval()

pred_model = BioGenesisDualModel(vocab_size=len(vocab)).to(device)
ckpt = torch.load(GLOBAL_CONFIG["PRED_MODEL_PATH"], map_location=device)
pred_model.load_state_dict(ckpt['model_state_dict'])
pred_model.eval()

# ==============================================================================
# 3. GRADIO PIPELINE
# ==============================================================================
def run_discovery(license_key, sequence, min_qed, temp, min_l, max_l, num_leads, progress=gr.Progress()):
    if license_key.strip() != MASTER_LICENSE_KEY:
        return pd.DataFrame(), None, None, None, "❌ ACCESS DENIED: Invalid License Key."

    progress(0, desc="Encoding Protein Sequence...")
    vae_prot = get_esm_embedding(sequence)
    collected_leads, unique_pool = [], set()

    while len(collected_leads) < num_leads:
        # FIXED: min_l and max_l logic restored
        ids = gen_model.generate(vae_prot, 500, int(max_l) + 15, 50, 0.9, temp)
        smis = [vocab.decode(g).replace(" ", "") for g in ids]
        
        for s in smis:
            if s and s not in unique_pool and (int(min_l) <= len(s) <= int(max_l)):
                m = Chem.MolFromSmiles(s)
                if m:
                    metrics = analyze_lead(m)
                    if metrics and metrics["QED"] >= min_qed:
                        # 2-in-1 Predictive Screening
                        tokens = [vocab.token_to_idx.get(char, 0) for char in str(s)][:100]
                        tokens += [0] * (100 - len(tokens))
                        with torch.no_grad():
                            o_c, o_a = pred_model(torch.LongTensor([tokens]).to(device), vae_prot)
                            cls_name = "Inhibitor" if torch.argmax(o_c).item() == 0 else "Activator"
                            affinity = o_a.item()
                        
                        entry = {"Compound_ID": f"Lead_{len(collected_leads)+1}", "SMILES": s}
                        entry.update(metrics)
                        entry.update({"Predicted_pAffinity": round(affinity, 3), "Activity_Class": cls_name})
                        collected_leads.append(entry)
                        unique_pool.add(s)
                        progress(len(collected_leads)/num_leads, desc=f"Found {len(collected_leads)} Leads...")
                        if len(collected_leads) >= num_leads: break

    df = pd.DataFrame(collected_leads).sort_values(by="Predicted_pAffinity", ascending=False)
    
    # Structure Image Generation (Top 12)
    mols = [Chem.MolFromSmiles(s) for s in df.head(12)["SMILES"]]
    legends = [f"{r['Compound_ID']} | pAff: {r['Predicted_pAffinity']}\n{r['Activity_Class']}" for _, r in df.head(12).iterrows()]
    grid_img = Draw.MolsToGridImage(mols, molsPerRow=3, subImgSize=(500, 500), legends=legends, returnPNG=False)
    
    # Save 300 DPI PNG
    png_path = "Structure_Report_300DPI.png"
    grid_img.save(png_path, dpi=(300, 300))
    
    csv_path = "Discovery_Report.csv"
    df.to_csv(csv_path, index=False)
    
    return df, grid_img, csv_path, png_path, "✅ Discovery Pipeline Complete!"

# ==============================================================================
# 4. UI LAYOUT (STACKED)
# ==============================================================================
with gr.Blocks(theme=gr.themes.Soft(primary_hue="blue")) as demo:
    gr.Markdown("# 🧬 BioGenesis AI")
    gr.Markdown("### Integrated De Novo Generation & 2-in-1 Prediction Engine")
    
    with gr.Column():
        license_input = gr.Textbox(label="Master License Key", type="password")
        seq_input = gr.Textbox(label="Target Protein Sequence", lines=3, placeholder="Paste sequence...")
        with gr.Row():
            min_qed_input = gr.Slider(0.1, 1.0, value=0.6, label="Min QED")
            temp_input = gr.Slider(0.1, 2.0, value=0.8, label="Temperature")
            num_leads_input = gr.Number(value=9, label="Total Leads")
        # FIXED: Restored SMILES Length sliders
        with gr.Row():
            min_len_input = gr.Slider(20, 100, value=40, step=1, label="Min SMILES Length")
            max_len_input = gr.Slider(50, 200, value=100, step=1, label="Max SMILES Length")
        run_btn = gr.Button("🚀 INITIATE DUAL-ENGINE PIPELINE", variant="primary")
        
    gr.Markdown("---")
    results_img = gr.Image(label="Top Candidate Structures (Ranked by Affinity)", type="pil")
    
    with gr.Row():
        download_csv = gr.File(label="Download Full CSV Report")
        download_png = gr.File(label="Download 300 DPI Structure Grid")
        
    results_df = gr.Dataframe(label="Comprehensive Lead Analysis Table", interactive=False)

    run_btn.click(
        fn=run_discovery, 
        inputs=[license_input, seq_input, min_qed_input, temp_input, min_len_input, max_len_input, num_leads_input], 
        outputs=[results_df, results_img, download_csv, download_png, gr.Markdown()]
    )

demo.queue().launch()