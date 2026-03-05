import json
import logging
from cryptography.fernet import Fernet
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_fernet() -> Fernet:
    key = settings.FERNET_KEY
    if not key:
        # Auto-generate for dev (not suitable for prod — set FERNET_KEY in .env)
        logger.warning("FERNET_KEY not set — using ephemeral key. Data encrypted this session only.")
        generated = Fernet.generate_key()
        return Fernet(generated)
    return Fernet(key.encode() if isinstance(key, str) else key)


_fernet: Fernet | None = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = _get_fernet()
    return _fernet


def encrypt_data(data: dict | list) -> str:
    """Encrypt a Python object (dict/list) to a base64 token string."""
    raw = json.dumps(data).encode("utf-8")
    return get_fernet().encrypt(raw).decode("utf-8")


def decrypt_data(token: str) -> dict | list:
    """Decrypt a token string back to Python dict/list."""
    raw = get_fernet().decrypt(token.encode("utf-8"))
    return json.loads(raw.decode("utf-8"))
