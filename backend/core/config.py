from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/biogenesis"

    # JWT
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Hugging Face
    HF_TOKEN: str = ""
    HF_GEN_MODEL_REPO: str = "swayamprakashpatel/biogenesis-full-models"
    HF_GEN_MODEL_FILE: str = "Gen_AI_Model.pt"
    HF_PRED_MODEL_FILE: str = "biogenesis_checkpoint.pt"
    HF_GEN_VOCAB_FILE: str = "BioGenesis_2026_atom_level_vocab_Gold.json"
    HF_SMILE_VOCAB_FILE: str = "smile_atom_level_vocab.json"
    HF_ESM_MODEL_NAME: str = "facebook/esm2_t33_650M_UR50D"

    # Encryption
    FERNET_KEY: str = ""

    # App
    FRONTEND_URL: str = "http://localhost:5173"
    FREE_TOKENS: int = 2
    RATE_LIMIT_PER_MINUTE: int = 5

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # SMTP (email OTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""   # Gmail App Password
    EXPOSE_OTP_IN_RESPONSE: bool = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
