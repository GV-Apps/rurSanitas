"""Alembic environment configuration.

Reads DATABASE_URL from the environment so the same migrations file works for
both SQLite (local) and PostgreSQL (production).
"""
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Alembic Config ────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Override sqlalchemy.url with DATABASE_URL env var when present ────────
_db_url = os.environ.get("DATABASE_URL")
if _db_url:
    # SQLAlchemy 1.4+ requires postgresql:// not postgres://
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    config.set_main_option("sqlalchemy.url", _db_url)

# ── Target metadata (set to None = no autogenerate support yet) ───────────
# To enable autogenerate, import your SQLAlchemy Base here:
#   from app.models import Base
#   target_metadata = Base.metadata
target_metadata = None


# ── Run migrations ────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """Run in 'offline' mode (no DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run in 'online' mode (requires DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
