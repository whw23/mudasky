"""add success_case table

Revision ID: b5c7d9e1f3a2
Revises: 1036c2a0a34b
Create Date: 2026-04-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5c7d9e1f3a2'
down_revision: Union[str, Sequence[str], None] = '1036c2a0a34b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'success_case',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_name', sa.String(length=100), nullable=False),
        sa.Column('university', sa.String(length=200), nullable=False),
        sa.Column('program', sa.String(length=200), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('testimonial', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('success_case')
