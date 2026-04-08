"""user_type 改为 guest/member/staff

Revision ID: 14ceba102aff
Revises: e2c0544550dd
Create Date: 2026-04-07 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14ceba102aff'
down_revision: Union[str, Sequence[str], None] = 'e2c0544550dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 将现有 student 用户改为 guest
    op.execute(
        "UPDATE \"user\" SET user_type = 'guest' WHERE user_type = 'student'"
    )

    # 修改 user_type 列默认值为 guest
    op.alter_column(
        'user',
        'user_type',
        existing_type=sa.String(length=10),
        server_default='guest',
    )

    # 将权限 student:manage 改为 member:manage
    op.execute(
        "UPDATE permission SET code = 'member:manage', "
        "description = '管理会员' "
        "WHERE code = 'student:manage'"
    )

    # 将权限组 student 改为 member
    op.execute(
        "UPDATE permission_group SET name = 'member', "
        "description = '会员' "
        "WHERE name = 'student'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # 将权限组 member 改回 student
    op.execute(
        "UPDATE permission_group SET name = 'student', "
        "description = '学员' "
        "WHERE name = 'member'"
    )

    # 将权限 member:manage 改回 student:manage
    op.execute(
        "UPDATE permission SET code = 'student:manage', "
        "description = '管理学员' "
        "WHERE code = 'member:manage'"
    )

    # 修改 user_type 列默认值回 student
    op.alter_column(
        'user',
        'user_type',
        existing_type=sa.String(length=10),
        server_default='student',
    )

    # 将 guest 和 member 用户改回 student
    op.execute(
        "UPDATE \"user\" SET user_type = 'student' "
        "WHERE user_type IN ('guest', 'member')"
    )
