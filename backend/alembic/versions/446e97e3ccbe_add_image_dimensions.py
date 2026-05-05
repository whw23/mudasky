"""add image dimensions

Revision ID: 446e97e3ccbe
Revises: 90ae0c481136
Create Date: 2026-05-05 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "446e97e3ccbe"
down_revision: Union[str, Sequence[str], None] = "90ae0c481136"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """添加 image 表的 width/height 列，并回填已有图片尺寸。"""
    op.add_column("image", sa.Column("width", sa.Integer(), nullable=True))
    op.add_column("image", sa.Column("height", sa.Integer(), nullable=True))

    # 回填已有图片的尺寸
    import io

    from PIL import Image as PILImage
    from sqlalchemy import text

    conn = op.get_bind()
    images = conn.execute(
        text(
            "SELECT id, file_data, mime_type FROM image WHERE width IS NULL"
        )
    ).fetchall()

    for img_id, file_data, mime_type in images:
        if mime_type in ("image/svg+xml", "application/pdf"):
            continue
        try:
            pil_img = PILImage.open(io.BytesIO(file_data))
            w, h = pil_img.size
            conn.execute(
                text(
                    "UPDATE image SET width = :w, height = :h WHERE id = :id"
                ),
                {"w": w, "h": h, "id": img_id},
            )
        except (OSError, ValueError):
            continue


def downgrade() -> None:
    """移除 image 表的 width/height 列。"""
    op.drop_column("image", "height")
    op.drop_column("image", "width")
