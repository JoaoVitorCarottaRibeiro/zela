"""exames_analises: histórico de leituras de exame por usuário

Revision ID: f6d4a8c1b9e2
Revises: e5c3f7a9b2d1
Create Date: 2026-11-10 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6d4a8c1b9e2'
down_revision: Union[str, Sequence[str], None] = 'e5c3f7a9b2d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'exames_analises',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('resumo', sa.Text(), nullable=False),
        sa.Column('itens', sa.JSON(), nullable=False),
        sa.Column(
            'precisa_cuidado', sa.Boolean(),
            server_default=sa.text('false'), nullable=False,
        ),
        sa.Column('nivel', sa.String(length=10), nullable=True),
        sa.Column(
            'criado_em', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_exames_analises_usuario_id'),
        'exames_analises', ['usuario_id'], unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_exames_analises_usuario_id'), table_name='exames_analises')
    op.drop_table('exames_analises')
