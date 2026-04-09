"""merge university and case migrations

Revision ID: d38a2d8ff71f
Revises: a25736f1ab28, b5c7d9e1f3a2
Create Date: 2026-04-09 12:07:14.589021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd38a2d8ff71f'
down_revision: Union[str, Sequence[str], None] = ('a25736f1ab28', 'b5c7d9e1f3a2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
