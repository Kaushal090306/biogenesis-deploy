from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
import sys, os


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import Base  # noqa
from db import models  # noqa — ensure models are registered
from core.config import get_settings
settings = get_settings()

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Read DB URL from environment if set
from core.config import get_settings
settings = get_settings()
# Override with sync driver for Alembic
sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
config.set_main_option("sqlalchemy.url", sync_url.replace("%", "%%"))


def run_migrations_offline():
    context.configure(url=sync_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    engine = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
