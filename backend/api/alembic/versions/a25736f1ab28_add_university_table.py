"""add university table

Revision ID: a25736f1ab28
Revises: 1036c2a0a34b
Create Date: 2026-04-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'a25736f1ab28'
down_revision: Union[str, Sequence[str], None] = '1036c2a0a34b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'university',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(200), unique=True, nullable=False),
        sa.Column('name_en', sa.String(200), nullable=True),
        sa.Column('country', sa.String(100), nullable=False),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('programs', JSONB(), nullable=False, server_default='[]'),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('university')
