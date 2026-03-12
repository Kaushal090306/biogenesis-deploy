from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from core.config import get_settings

settings = get_settings()

is_pgbouncer_pooler = "pooler.supabase.com" in settings.DATABASE_URL or ":6543" in settings.DATABASE_URL
engine_kwargs = {"echo": False, "pool_pre_ping": True}
if is_pgbouncer_pooler:
    # pgbouncer transaction pooling is incompatible with asyncpg statement cache.
    engine_kwargs["connect_args"] = {"statement_cache_size": 0}
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    async with engine.begin() as conn:
        from db import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        # Migrate: add columns that may not exist in older DBs
        from sqlalchemy import text
        for sql in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_left INTEGER DEFAULT 2",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS min_qed FLOAT",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS temperature FLOAT",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS min_smiles_len INTEGER",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS max_smiles_len INTEGER",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS num_leads INTEGER",
        ]:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass
