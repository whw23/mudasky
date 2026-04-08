"""document 表重构：添加分类和原始文件名

Revision ID: a3b8f1c2d4e5
Revises: 6701cb76641b
Create Date: 2026-04-08 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3b8f1c2d4e5"
down_revision: Union[str, Sequence[str], None] = "6701cb76641b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """升级：重构 document 表字段。"""
    # 创建枚举类型
    document_category = sa.Enum(
        "TRANSCRIPT",
        "CERTIFICATE",
        "PASSPORT",
        "LANGUAGE_TEST",
        "APPLICATION",
        "OTHER",
        name="document_category",
    )
    document_category.create(op.get_bind(), checkfirst=True)

    # 重命名 uploader_id -> user_id
    op.alter_column(
        "document", "uploader_id", new_column_name="user_id"
    )
    # 重命名 file_name -> filename
    op.alter_column(
        "document", "file_name", new_column_name="filename"
    )

    # 添加 original_name 列
    op.add_column(
        "document",
        sa.Column(
            "original_name",
            sa.String(length=255),
            nullable=True,
        ),
    )
    # 用 filename 填充 original_name
    op.execute("UPDATE document SET original_name = filename")
    op.alter_column(
        "document", "original_name", nullable=False
    )

    # 添加 category 列
    op.add_column(
        "document",
        sa.Column(
            "category",
            document_category,
            nullable=True,
        ),
    )
    op.execute("UPDATE document SET category = 'OTHER'")
    op.alter_column("document", "category", nullable=False)

    # 删除 status 列
    op.drop_column("document", "status")

    # 更新索引名
    op.drop_index(
        "ix_document_uploader_id", table_name="document"
    )
    op.create_index(
        op.f("ix_document_user_id"),
        "document",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """回滚：恢复 document 表字段。"""
    # 恢复索引
    op.drop_index(
        op.f("ix_document_user_id"), table_name="document"
    )
    op.create_index(
        "ix_document_uploader_id",
        "document",
        ["uploader_id"],
        unique=False,
    )

    # 恢复 status 列
    op.add_column(
        "document",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
    )

    # 删除 category 列
    op.drop_column("document", "category")

    # 删除 original_name 列
    op.drop_column("document", "original_name")

    # 恢复列名
    op.alter_column(
        "document", "filename", new_column_name="file_name"
    )
    op.alter_column(
        "document", "user_id", new_column_name="uploader_id"
    )

    # 删除枚举类型
    sa.Enum(name="document_category").drop(
        op.get_bind(), checkfirst=True
    )
