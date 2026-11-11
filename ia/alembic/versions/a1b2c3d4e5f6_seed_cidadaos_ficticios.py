"""seed: cidadãos fictícios (dados simulados versionados)

Revision ID: a1b2c3d4e5f6
Revises: f6d4a8c1b9e2
Create Date: 2026-11-10 16:00:00.000000

O briefing proíbe dados reais. Esta migração carrega alguns cidadãos FICTÍCIOS
para o banco já nascer com exemplos (dados simulados versionados, como a rubrica
de SOA pede).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f6d4a8c1b9e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    cidadaos = sa.table(
        'cidadaos',
        sa.column('nome', sa.String),
        sa.column('idade', sa.Integer),
        sa.column('bairro', sa.String),
        sa.column('cidade', sa.String),
        sa.column('telefone', sa.String),
    )
    op.bulk_insert(
        cidadaos,
        [
            {'nome': 'Regina (fictícia)', 'idade': 53, 'bairro': 'Vila Andrade',
             'cidade': 'São Paulo', 'telefone': None},
            {'nome': 'João da Silva (fictício)', 'idade': 40, 'bairro': 'Capão Redondo',
             'cidade': 'São Paulo', 'telefone': None},
            {'nome': 'Maria Souza (fictícia)', 'idade': 67, 'bairro': 'Jardim Ângela',
             'cidade': 'São Paulo', 'telefone': None},
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM cidadaos WHERE nome LIKE '%(fict%'")
