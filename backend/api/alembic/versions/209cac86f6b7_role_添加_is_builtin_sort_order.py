"""role 添加 is_builtin sort_order

Revision ID: 209cac86f6b7
Revises: c13b0b013576
Create Date: 2026-04-10 20:10:02.204041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '209cac86f6b7'
down_revision: Union[str, Sequence[str], None] = 'c13b0b013576'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'role',
        sa.Column(
            'is_builtin', sa.Boolean(),
            nullable=False, server_default=sa.text('false'),
        ),
    )
    op.alter_column('role', 'is_builtin', server_default=None)

    op.add_column(
        'role',
        sa.Column(
            'sort_order', sa.Integer(),
            nullable=False, server_default=sa.text('0'),
        ),
    )
    op.alter_column('role', 'sort_order', server_default=None)

    # 数据迁移：标记现有内置角色并设置排序
    builtin_names = [
        'superuser', 'website_admin', 'student_advisor',
        'student', 'visitor',
    ]
    role_table = sa.table(
        'role',
        sa.column('name', sa.String),
        sa.column('is_builtin', sa.Boolean),
        sa.column('sort_order', sa.Integer),
    )

    conn = op.get_bind()
    roles = conn.execute(
        sa.select(role_table.c.name).order_by(role_table.c.name)
    ).fetchall()

    for idx, (name,) in enumerate(roles):
        conn.execute(
            role_table.update()
            .where(role_table.c.name == name)
            .values(
                sort_order=idx,
                is_builtin=name in builtin_names,
            )
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('role', 'sort_order')
    op.drop_column('role', 'is_builtin')
