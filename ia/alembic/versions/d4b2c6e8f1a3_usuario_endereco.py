"""usuario: endereço (cep, logradouro, bairro, cidade, uf, complemento)

Revision ID: d4b2c6e8f1a3
Revises: c3a1b2d4e5f6
Create Date: 2026-11-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4b2c6e8f1a3'
down_revision: Union[str, Sequence[str], None] = 'c3a1b2d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('cep', sa.String(length=8), nullable=True))
    op.add_column('usuarios', sa.Column('logradouro', sa.String(length=160), nullable=True))
    op.add_column('usuarios', sa.Column('bairro', sa.String(length=120), nullable=True))
    op.add_column('usuarios', sa.Column('cidade', sa.String(length=120), nullable=True))
    op.add_column('usuarios', sa.Column('uf', sa.String(length=2), nullable=True))
    op.add_column('usuarios', sa.Column('complemento', sa.String(length=120), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'complemento')
    op.drop_column('usuarios', 'uf')
    op.drop_column('usuarios', 'cidade')
    op.drop_column('usuarios', 'bairro')
    op.drop_column('usuarios', 'logradouro')
    op.drop_column('usuarios', 'cep')
