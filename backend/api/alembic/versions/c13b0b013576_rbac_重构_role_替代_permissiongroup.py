"""RBAC 重构：Role 替代 PermissionGroup

Revision ID: c13b0b013576
Revises: 52f161db130f
Create Date: 2026-04-09 10:49:57.399209

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c13b0b013576'
down_revision: Union[str, Sequence[str], None] = '52f161db130f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. 重命名 permission_group 表为 role（保留数据）
    op.rename_table('permission_group', 'role')
    op.drop_index('ix_permission_group_name', table_name='role')
    op.create_index(op.f('ix_role_name'), 'role', ['name'], unique=True)

    # 2. 删除 role 表中不再需要的字段
    op.drop_column('role', 'is_system')
    op.drop_column('role', 'auto_include_all')

    # 3. 重命名 group_permission 表为 role_permission（保留数据）
    op.rename_table('group_permission', 'role_permission')
    op.alter_column(
        'role_permission', 'group_id',
        new_column_name='role_id',
    )

    # 4. 更新 role_permission 的外键（旧 FK 指向 permission_group，需指向 role）
    op.drop_constraint(
        'group_permission_group_id_fkey', 'role_permission', type_='foreignkey'
    )
    op.create_foreign_key(
        None, 'role_permission', 'role',
        ['role_id'], ['id'], ondelete='CASCADE',
    )

    # 5. permission 表新增 name_key 字段
    op.add_column(
        'permission',
        sa.Column('name_key', sa.String(length=100), nullable=False, server_default=''),
    )
    op.alter_column('permission', 'name_key', server_default=None)

    # 6. user 表：group_id → role_id（保留数据）
    op.drop_constraint(op.f('fk_user_group_id'), 'user', type_='foreignkey')
    op.drop_index(op.f('ix_user_group_id'), table_name='user')
    op.alter_column('user', 'group_id', new_column_name='role_id')
    op.create_index(op.f('ix_user_role_id'), 'user', ['role_id'], unique=False)
    op.create_foreign_key(
        None, 'user', 'role',
        ['role_id'], ['id'], ondelete='SET NULL',
    )

    # 7. user 表：删除不再需要的字段
    op.drop_column('user', 'user_type')
    op.drop_column('user', 'is_superuser')


def downgrade() -> None:
    """Downgrade schema."""
    # 7. user 表：恢复删除的字段
    op.add_column(
        'user',
        sa.Column(
            'is_superuser', sa.BOOLEAN(),
            autoincrement=False, nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.alter_column('user', 'is_superuser', server_default=None)
    op.add_column(
        'user',
        sa.Column(
            'user_type', sa.VARCHAR(length=10),
            server_default=sa.text("'guest'::character varying"),
            autoincrement=False, nullable=False,
        ),
    )

    # 6. user 表：role_id → group_id
    op.drop_constraint(None, 'user', type_='foreignkey')
    op.drop_index(op.f('ix_user_role_id'), table_name='user')
    op.alter_column('user', 'role_id', new_column_name='group_id')
    op.create_index(op.f('ix_user_group_id'), 'user', ['group_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_user_group_id'), 'user', 'permission_group',
        ['group_id'], ['id'], ondelete='SET NULL',
    )

    # 5. permission 表：删除 name_key
    op.drop_column('permission', 'name_key')

    # 4+3. role_permission → group_permission
    op.drop_constraint(None, 'role_permission', type_='foreignkey')
    op.alter_column(
        'role_permission', 'role_id',
        new_column_name='group_id',
    )
    op.create_foreign_key(
        'group_permission_group_id_fkey', 'role_permission', 'permission_group',
        ['group_id'], ['id'], ondelete='CASCADE',
    )
    op.rename_table('role_permission', 'group_permission')

    # 2. role 表：恢复删除的字段
    op.add_column(
        'role',
        sa.Column(
            'is_system', sa.BOOLEAN(),
            autoincrement=False, nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.alter_column('role', 'is_system', server_default=None)
    op.add_column(
        'role',
        sa.Column(
            'auto_include_all', sa.BOOLEAN(),
            autoincrement=False, nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.alter_column('role', 'auto_include_all', server_default=None)

    # 1. role → permission_group
    op.drop_index(op.f('ix_role_name'), table_name='role')
    op.rename_table('role', 'permission_group')
    op.create_index(
        'ix_permission_group_name', 'permission_group', ['name'], unique=True,
    )
