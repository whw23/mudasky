"""图片数据访问层。"""

import hashlib

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
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


async def create_image(
    session: AsyncSession,
    file_data: bytes,
    filename: str,
    mime_type: str,
) -> Image:
    """创建图片。自动计算哈希和大小，重复哈希返回已有记录。"""
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
