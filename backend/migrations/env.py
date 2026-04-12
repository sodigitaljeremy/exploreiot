"""Alembic environment configuration.

Reads database URL from app.config (same env vars as the application).
Configured for raw SQL migrations — no SQLAlchemy models, no autogenerate.
"""

import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure backend/ is on sys.path so app.config is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Build URL from app.config — single source of truth
db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
config.set_main_option("sqlalchemy.url", db_url)

# No target_metadata — we use raw SQL migrations, not autogenerate
target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emit SQL to stdout."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connect and execute."""
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
