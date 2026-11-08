"""usuario: genero/identidade_genero + tabela fichas_medicas

Revision ID: e5c3f7a9b2d1
Revises: d4b2c6e8f1a3
Create Date: 2026-11-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5c3f7a9b2d1'
down_revision: Union[str, Sequence[str], None] = 'd4b2c6e8f1a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('genero', sa.String(length=30), nullable=True))
    op.add_column(
        'usuarios', sa.Column('identidade_genero', sa.String(length=30), nullable=True)
    )

    op.create_table(
        'fichas_medicas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('dados', sa.JSON(), nullable=False),
        sa.Column(
            'criado_em', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.Column(
            'atualizado_em', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_fichas_medicas_usuario_id'),
        'fichas_medicas', ['usuario_id'], unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_fichas_medicas_usuario_id'), table_name='fichas_medicas')
    op.drop_table('fichas_medicas')
    op.drop_column('usuarios', 'identidade_genero')
    op.drop_column('usuarios', 'genero')
