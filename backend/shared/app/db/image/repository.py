"""图片数据访问层。"""

import hashlib
import io

from PIL import Image as PILImage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.image.models import Image

ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

CONVERTIBLE_MIME_TYPES = {"image/png", "image/jpeg", "image/gif"}
WEBP_QUALITY = 95


def _convert_to_webp(file_data: bytes) -> tuple[bytes, str, str]:
    """将位图转为 WebP 格式，返回 (数据, MIME, 扩展名)。"""
    img = PILImage.open(io.BytesIO(file_data))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if img.info.get("transparency") else "RGB")
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY)
    return buf.getvalue(), "image/webp", ".webp"


async def create_image(
    session: AsyncSession,
    file_data: bytes,
    filename: str,
    mime_type: str,
) -> Image:
    """创建图片。位图自动转 WebP，SVG/PDF 保持原格式。"""
    if mime_type in CONVERTIBLE_MIME_TYPES:
        file_data, mime_type, ext = _convert_to_webp(file_data)
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        filename = stem + ext

    file_hash = hashlib.sha256(file_data).hexdigest()
    existing = await get_by_hash(session, file_hash)
    if existing:
        return existing

    image = Image(
        file_data=file_data,
        filename=filename,
        mime_type=mime_type,
        file_size=len(file_data),
        file_hash=file_hash,
    )
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return image


async def get_by_id(
    session: AsyncSession, image_id: str
) -> Image | None:
    """根据 ID 查询图片。"""
    return await session.get(Image, image_id)


async def get_by_hash(
    session: AsyncSession, file_hash: str
) -> Image | None:
    """根据哈希查询图片（去重用）。"""
    stmt = select(Image).where(Image.file_hash == file_hash)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def delete_image(
    session: AsyncSession, image: Image
) -> None:
    """删除图片。"""
    await session.delete(image)
    await session.commit()
