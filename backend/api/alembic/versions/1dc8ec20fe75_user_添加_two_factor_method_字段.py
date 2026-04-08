"""user 添加 two_factor_method 字段

Revision ID: 1dc8ec20fe75
Revises: 14ceba102aff
Create Date: 2026-04-08 04:24:44.664547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1dc8ec20fe75'
down_revision: Union[str, Sequence[str], None] = '14ceba102aff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'user',
        sa.Column(
            'two_factor_method',
            sa.String(length=10),
            nullable=True,
            comment='totp 或 sms',
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user', 'two_factor_method')
