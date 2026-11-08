"""triagem: cpf_informado (urgência/convidado)

Revision ID: c3a1b2d4e5f6
Revises: a60cb6675301
Create Date: 2026-11-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3a1b2d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'a60cb6675301'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('triagens', sa.Column('cpf_informado', sa.String(length=11), nullable=True))
    op.create_index(op.f('ix_triagens_cpf_informado'), 'triagens', ['cpf_informado'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_triagens_cpf_informado'), table_name='triagens')
    op.drop_column('triagens', 'cpf_informado')
