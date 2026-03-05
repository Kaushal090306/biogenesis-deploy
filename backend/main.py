"""
BioGenesis AI — FastAPI Backend
"""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from api import auth, predict, dashboard, stripe_webhook
from core.config import get_settings
from db.database import create_tables
from models.schemas import HealthResponse
from services import ml_pipeline

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()

# ──────────────────────────────────────────────
# Lifespan
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("BioGenesis backend starting …")
    await create_tables()
    logger.info("Database tables ensured.")
    try:
        ml_pipeline.load_models()
    except Exception as exc:
        logger.error("Model loading failed at startup: %s", exc)
        # Allow app to start; /predict will return 503 if models unloaded
    yield
    logger.info("BioGenesis backend shutting down.")


# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="BioGenesis AI",
    description="Secure AI-powered drug discovery platform API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request timing middleware ──
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Process-Time-ms"] = f"{ms:.1f}"
    return response

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(stripe_webhook.router, prefix="/api")

# ──────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health():
    from db.database import engine
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return HealthResponse(
        status="ok" if db_ok and ml_pipeline.is_loaded() else "degraded",
        ml_loaded=ml_pipeline.is_loaded(),
        db_connected=db_ok,
    )


# ──────────────────────────────────────────────
# Global error handler
# ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
