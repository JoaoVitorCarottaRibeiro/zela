"""Ambiente do Alembic para a Zela.

Pega a URL do banco do nosso .env (app.core.config) e o metadata dos nossos
modelos (app.models), para que o autogenerate enxergue as tabelas.

A URL é usada direto (não passa pelo alembic.ini) para não quebrar caso a senha
tenha caracteres especiais URL-encoded (ex.: %40), que confundiriam o ConfigParser.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.db.base import Base
from app.db.session import url_do_banco
import app.models  # noqa: F401  — registra as tabelas em Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
DB_URL = url_do_banco()


def run_migrations_offline() -> None:
    """Gera SQL sem conectar ao banco."""
    context.configure(
        url=DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Conecta ao banco e aplica as migrações."""
    connectable = create_engine(DB_URL, poolclass=pool.NullPool, future=True)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
