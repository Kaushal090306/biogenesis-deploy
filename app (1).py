import os
import json
import warnings
import logging
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
import gradio as gr
from PIL import Image
from rdkit import Chem
from rdkit.Chem import Descriptors, Draw, QED, rdMolDescriptors, Fragments
from rdkit import RDLogger
from transformers import AutoTokenizer, EsmModel

# --- System Suppression ---
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("rdkit").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")
RDLogger.DisableLog('rdApp.*')

# ==============================================================================
# 0. CONFIGURATION & PATHS (V19.5 GOLD SYNC)
# ==============================================================================
MASTER_LICENSE_KEY = "SARWESHWAR-AI-2026"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

GLOBAL_CONFIG = {
    "GEN_MODEL_PATH": './Gen_AI_Model.pt',
    "GEN_VOCAB_PATH": './BioGenesis_2026_atom_level_vocab_Gold.json',
    "PRED_MODEL_PATH": './biogenesis_checkpoint.pt',
    "PRED_VOCAB_PATH": './smile_atom_level_vocab.json',
    "ESM_MODEL_NAME": "facebook/esm2_t33_650M_UR50D"
}

# ==============================================================================
# 1. ARCHITECTURES (STRICTLY PRESERVED FROM V19.5 GOLD)
# ==============================================================================
class DeepFiLM(nn.Module):
    def __init__(self, cond_dim, hidden_dim):
        super().__init__()
        self.mlp = nn.Sequential(nn.Linear(cond_dim, hidden_dim), nn.GELU(), nn.Linear(hidden_dim, hidden_dim * 2))
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
        z = torch.randn(B, self.latent_dim, device=DEVICE)
        h = self.decoder_init(torch.cat([z, pe_batch], dim=1)).unsqueeze(0).repeat(self.num_layers, 1, 1)
        cur = torch.full((B, 1), 1, dtype=torch.long, device=DEVICE)
        seq = [cur]
        for _ in range(max_len):
            emb = self.smiles_embedding_layer(cur[:, -1:])
            # ORIGINAL EXPERT INJECTION LOGIC
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
            seq.append(next_tok); cur = torch.cat([cur, next_tok], dim=1)
            if (next_tok == 2).all(): break
        return torch.cat(seq, dim=1)

class BioGenesisDualModel(nn.Module):
    def __init__(self, vocab_size, protein_dim=1280):
        super().__init__()
        self.smi_embed = nn.Embedding(vocab_size + 1, 128)
        self.smi_conv = nn.Sequential(
            nn.Conv1d(128, 256, 3, padding=1), nn.ReLU(),
            nn.Conv1d(256, 512, 3, padding=1), nn.ReLU(),
            nn.AdaptiveMaxPool1d(1)
        )
        self.prot_fc = nn.Sequential(nn.Linear(protein_dim, 512), nn.ReLU(), nn.Dropout(0.2))
        self.shared_fc = nn.Sequential(
            nn.Linear(512 + 512, 1024), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(1024, 512), nn.ReLU()
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

# ==============================================================================
# 2. VOCABULARY & ADMET ANALYSIS
# ==============================================================================
class SmilesVocabulary:
    def __init__(self):
        self.token_to_idx, self.idx_to_token = {}, {}
    def load(self, path):
        with open(path, 'r') as f: self.token_to_idx = json.load(f)
        self.idx_to_token = {int(v): k for k, v in self.token_to_idx.items()}
    def decode(self, ids):
        res = []
        for i in ids:
            if i == 2: break
            if i > 2: res.append(self.idx_to_token.get(int(i), ""))
        return "".join(res)
    def __len__(self):
        return len(self.token_to_idx)

def calculate_full_analysis(mol):
    if not mol: return None
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)
    hba = rdMolDescriptors.CalcNumHBA(mol)
    tpsa = Descriptors.TPSA(mol)
    qed_val = QED.qed(mol)
    
    # 1. Lipinski Ro5
    violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    ro5_pass = "Yes" if violations <= 1 else "No"
    
    # 2. SA Score (Synthesisability)
    fsp3 = rdMolDescriptors.CalcFractionCSP3(mol)
    num_rings = rdMolDescriptors.CalcNumRings(mol)
    sa_score = max(1.0, min(10.0, (qed_val * 5) + (fsp3 * 2) - (num_rings * 0.5)))
    
    # 3. ADMET (HIA and BBB)
    hia = "High" if tpsa < 140 and logp < 5 else "Low"
    bbb = "High" if 1 < logp < 5 and mw < 450 and tpsa < 90 else "Low"
    
    # 4. Toxicity Screening
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
        "HBD": hbd, "HBA": hba, "TPSA": round(tpsa, 2)
    }

# ==============================================================================
# 3. INITIALIZATION
# ==============================================================================
gen_vocab = SmilesVocabulary(); gen_vocab.load(GLOBAL_CONFIG["GEN_VOCAB_PATH"])
gen_model = ConditionalVAE(len(gen_vocab)).to(DEVICE)
gen_ckpt = torch.load(GLOBAL_CONFIG["GEN_MODEL_PATH"], map_location=DEVICE)
gen_model.load_state_dict({k.replace('module.', ''): v for k, v in gen_ckpt.items()}, strict=False)
gen_model.eval()

with open(GLOBAL_CONFIG["PRED_VOCAB_PATH"], 'r') as f: pred_vocab_dict = json.load(f)
pred_model = BioGenesisDualModel(vocab_size=len(pred_vocab_dict)).to(DEVICE)
pred_ckpt = torch.load(GLOBAL_CONFIG["PRED_MODEL_PATH"], map_location=DEVICE)
pred_model.load_state_dict(pred_ckpt['model_state_dict'])
pred_model.eval()

tokenizer = AutoTokenizer.from_pretrained(GLOBAL_CONFIG["ESM_MODEL_NAME"])
esm_model = EsmModel.from_pretrained(GLOBAL_CONFIG["ESM_MODEL_NAME"]).to(DEVICE).eval()

# ==============================================================================
# 4. GRADIO PIPELINE
# ==============================================================================
def run_discovery(license_key, sequence, min_qed, temp, min_l, max_l, num_leads, progress=gr.Progress()):
    if license_key.strip() != MASTER_LICENSE_KEY:
        return pd.DataFrame(), None, None, "❌ ACCESS DENIED: Invalid License Key."

    progress(0, desc="Encoding Protein via ESM-2...")
    with torch.no_grad():
        vae_prot = esm_model(**tokenizer(sequence, return_tensors="pt", truncation=True, max_length=1000).to(DEVICE)).last_hidden_state.mean(dim=1)

    collected_leads, unique_pool = [], set()
    buffer = 5

    while len(collected_leads) < num_leads:
        ids = gen_model.generate(vae_prot, 500, int(max_l) + buffer, temp, 50, 0.9)
        smis = [gen_vocab.decode(g.tolist()) for g in ids]

        for s in smis:
            if s and s not in unique_pool and (int(min_l) - buffer <= len(s) <= int(max_l) + buffer):
                m = Chem.MolFromSmiles(s)
                if m:
                    analysis = calculate_full_analysis(m)
                    if analysis and analysis["QED"] >= min_qed:
                        # 2-in-1 Prediction
                        tokens = [pred_vocab_dict.get(char, 0) for char in str(s)][:100]
                        tokens += [0] * (100 - len(tokens))
                        with torch.no_grad():
                            o_c, o_a = pred_model(torch.LongTensor([tokens]).to(DEVICE), vae_prot)
                            cls_name = "Inhibitor" if torch.argmax(o_c).item() == 0 else "Activator"
                            affinity = o_a.item()
                        
                        entry = {
                            "ID": f"Lead_{len(collected_leads)+1}",
                            "SMILES": s,
                            "pAffinity": round(affinity, 3),
                            "Activity": cls_name,
                            "MW": analysis["MW"],
                            "LogP": analysis["LogP"],
                            "QED": analysis["QED"],
                            "SA_Score": analysis["SA_Score"],
                            "HIA_Absorption": analysis["HIA"],
                            "BBB_Permeability": analysis["BBB"],
                            "Toxicity": analysis["Toxicity"],
                            "Tox_Detail": analysis["Tox_Detail"],
                            "Lipinski_Ro5": analysis["Ro5_Pass"],
                            "Ro5_Violations": analysis["Ro5_Violations"],
                            "HBD_Count": analysis["HBD"],
                            "HBA_Count": analysis["HBA"],
                            "TPSA": analysis["TPSA"]
                        }
                        collected_leads.append(entry)
                        unique_pool.add(s)
                        progress(len(collected_leads)/num_leads, desc=f"Mining Lead {len(collected_leads)}...")
                        if len(collected_leads) >= num_leads: break

    df = pd.DataFrame(collected_leads).sort_values(by="pAffinity", ascending=False)
    
    # Grid Image
    mols = [Chem.MolFromSmiles(s) for s in df.head(12)["SMILES"]]
    legends = [f"{r['ID']} | pAff: {r['pAffinity']}\n{r['Activity']}" for _, r in df.head(12).iterrows()]
    grid_img = Draw.MolsToGridImage(mols, molsPerRow=3, subImgSize=(500, 500), legends=legends)
    
    csv_path = "PharmForge_Report.csv"
    df.to_csv(csv_path, index=False)
    
    return df, grid_img, csv_path, "✅ Discovery Pipeline Complete!"

# ==============================================================================
# 5. UI LAYOUT
# ==============================================================================
with gr.Blocks(theme=gr.themes.Soft(primary_hue="blue")) as demo:
    gr.Markdown("# 🧬 PharmForge AI v19.5 Gold")
    gr.Markdown("### Advanced De Novo Generation & Full ADMET/Tox Profiling")
    
    with gr.Column():
        license_input = gr.Textbox(label="Master License Key", type="password")
        seq_input = gr.Textbox(label="Protein Sequence", lines=3, placeholder="Paste FASTA sequence...")
        with gr.Row():
            min_qed_input = gr.Slider(0.1, 1.0, value=0.6, label="Min QED")
            temp_input = gr.Slider(0.1, 2.5, value=0.85, label="Temperature")
            num_leads_input = gr.Number(value=10, label="Leads Required")
        with gr.Row():
            min_len_input = gr.Slider(20, 150, value=40, label="Min SMILES Length")
            max_len_input = gr.Slider(50, 300, value=120, label="Max SMILES Length")
        run_btn = gr.Button("🚀 INITIATE PHARMFORGE AI PIPELINE", variant="primary")
        
    gr.Markdown("---")
    results_img = gr.Image(label="Top Lead Structures", type="pil")
    download_csv = gr.File(label="Download Full Discovery Report (.CSV)")
    results_df = gr.Dataframe(label="Comprehensive Molecular & ADMET Analysis", interactive=False)

    run_btn.click(
        fn=run_discovery, 
        inputs=[license_input, seq_input, min_qed_input, temp_input, min_len_input, max_len_input, num_leads_input], 
        outputs=[results_df, results_img, download_csv, gr.Markdown()]
    )

demo.queue().launch()