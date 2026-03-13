# BioGenesis AI — Full-Stack Drug Discovery Platform

A production-grade SaaS platform that migrates the BioGenesis Gradio space into a secure full-stack application. ML models run server-side only — no code or weights are ever exposed to the browser.

---
## Architecture

```
Browser (React + Vite)
    ↓ HTTPS / JWT
FastAPI Backend
    ↓ asyncio.to_thread
PyTorch ML Pipeline (ESM2 + ConditionalVAE + BioGenesisDualModel)
    ↓ hf_hub_download
Private HuggingFace Repository
    ↓ SQLAlchemy async
PostgreSQL (encrypted results via Fernet)
```

---

## Project Structure

```
Bio-genesis/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── api/
│   │   ├── auth.py              # /api/auth/register, /api/auth/login
│   │   ├── predict.py           # /api/predict (JWT protected)
│   │   ├── dashboard.py         # /api/dashboard/me, history, checkout
│   │   └── stripe_webhook.py    # /api/stripe/webhook
│   ├── core/
│   │   ├── config.py            # Pydantic settings (reads .env)
│   │   ├── security.py          # JWT + bcrypt
│   │   └── dependencies.py      # get_current_user
│   ├── services/
│   │   ├── ml_pipeline.py       # Full PyTorch inference pipeline
│   │   ├── token_service.py     # Token check/deduct/replenish
│   │   └── stripe_service.py    # Stripe checkout/webhook
│   ├── models/schemas.py        # Pydantic schemas
│   ├── db/
│   │   ├── database.py          # Async SQLAlchemy engine
│   │   ├── models.py            # ORM: users, predictions
│   │   ├── migrations/env.py    # Alembic env
│   │   └── seed.py              # Test user seeder
│   ├── utils/encryption.py      # Fernet encrypt/decrypt
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/               # Landing, AuthPage, DashboardPage
    │   ├── components/          # Navbar, PredictForm, ResultsPanel, etc.
    │   ├── contexts/AuthContext.jsx
    │   └── services/api.js      # Axios wrapper
    ├── index.html
    ├── tailwind.config.js
    └── vite.config.js
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (running locally or via Docker)

### 1. PostgreSQL (Docker shortcut)

```bash
docker run --name biogenesis-pg -e POSTGRES_PASSWORD=password -e POSTGRES_DB=biogenesis -p 5432:5432 -d postgres:16
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
copy .env.example .env
# Edit .env — add your HF_TOKEN, FERNET_KEY, STRIPE keys, DATABASE_URL

# Generate a FERNET_KEY:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Paste output into .env as FERNET_KEY=...

# (Optional) Run Alembic migrations
pip install psycopg2-binary
alembic upgrade head

# Seed test users
python -m db.seed

# Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/api/docs  
Health: http://localhost:8000/health

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

App: http://localhost:5173

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | Long random string for JWT signing |
| `HF_TOKEN` | Your HuggingFace access token (read access to private repo) |
| `HF_GEN_MODEL_REPO` | HF repo ID, e.g. `swayamprakashpatel/biogenesis-full-models` |
| `HF_GEN_MODEL_FILE` | Filename of generator checkpoint in the repo |
| `HF_PRED_MODEL_FILE` | Filename of predictor checkpoint |
| `HF_SMILE_VOCAB_FILE` | SMILES vocabulary JSON filename |
| `FERNET_KEY` | 32-byte Fernet key (generate as above) |
| `STRIPE_SECRET_KEY` | Stripe secret (from Stripe dashboard) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro plan |
| `FRONTEND_URL` | Used for CORS + Stripe redirect URLs |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register (email + password + consent) |
| `POST` | `/api/auth/login` | — | Login → JWT |
| `POST` | `/api/predict` | JWT | Run ML pipeline (cost: 1 token = 10 leads; tokens deducted per request) |
| `GET` | `/api/dashboard/me` | JWT | Get user profile + token balance |
| `GET` | `/api/dashboard/history` | JWT | Paginated prediction history |
| `POST` | `/api/dashboard/checkout` | JWT | Create Stripe checkout session |
| `POST` | `/api/stripe/webhook` | Stripe sig | Handle subscription events |
| `GET` | `/health` | — | Service health status |

---

## Security Notes

- **Models never leave the backend.** `hf_hub_download` fetches them into the server's file cache at startup.
- **Drug discovery results** (SMILES, affinities) are Fernet-encrypted before PostgreSQL storage.
- **JWT** (HS256) required for all protected endpoints.
- **Rate limiting**: 5 prediction requests/minute per IP (via slowapi).
- **CORS**: Only configured frontend URL is allowed.
- **No secrets in source code**: Everything via `.env` (never committed).

---

## Test Users (after seeding)

| Email | Password | Plan | Tokens |
|---|---|---|---|
| `free_user@test.com` | `Test1234!` | free | 10 |
| `pro_user@test.com` | `Test1234!` | pro | 100 |
| `enterprise@test.com` | `Test1234!` | enterprise | ∞ |
| `empty_tokens@test.com` | `Test1234!` | free | 0 (upgrade test) |

---

## Stripe Webhook (local testing)

```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

Copy the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET` in `.env`.

---

## Production Deployment

1. Set `FRONTEND_URL` to your production domain
2. Use `uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000` (behind nginx/Caddy with HTTPS)
3. Run `alembic upgrade head` in CI before deploying
4. Use a managed PostgreSQL (e.g. Supabase, Neon, RDS)
5. Store `.env` secrets in your hosting platform's secret manager (not in repo)

# biogenesis-deploy
