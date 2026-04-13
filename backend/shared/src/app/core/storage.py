"""文件存储工具模块。

提供文件保存、删除、路径解析等操作，校验文件大小和用户配额。
"""

import logging
import uuid
from pathlib import Path

import aiofiles
import aiofiles.os
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import QuotaExceededException

logger = logging.getLogger(__name__)

# 上传文件根目录
UPLOAD_BASE_DIR = Path("/data/uploads")


async def save_file(
    file: UploadFile, user_id: str, category: str
) -> tuple[str, int]:
    """保存上传文件到磁盘。

    文件存储路径格式：uploads/{user_id}/{category}/{uuid}_{filename}

    Args:
        file: FastAPI 上传文件对象。
        user_id: 用户 ID。
        category: 文件分类。

    Returns:
        (相对路径, 文件大小) 元组。

    Raises:
        QuotaExceededException: 文件大小超过限制。
    """
    data = await file.read()
    file_size = len(data)

    # 校验单文件大小
    if file_size > settings.max_upload_size_bytes:
        raise QuotaExceededException(
            message=f"文件大小超过限制（{settings.MAX_UPLOAD_SIZE_MB}MB）", code="FILE_SIZE_EXCEEDED"
        )

    filename = file.filename or "untitled"
    unique_name = f"{uuid.uuid4()}_{filename}"
    relative_path = f"{user_id}/{category}/{unique_name}"
    absolute_path = UPLOAD_BASE_DIR / relative_path

    # 创建目录
    await aiofiles.os.makedirs(
        absolute_path.parent, exist_ok=True
    )

    # 异步写入文件
    async with aiofiles.open(absolute_path, "wb") as f:
        await f.write(data)

    logger.info(
        "文件保存成功: user=%s, path=%s, size=%d",
        user_id,
        relative_path,
        file_size,
    )
    return relative_path, file_size


async def delete_file(path: str) -> None:
    """删除磁盘上的文件。

    Args:
        path: 文件相对路径。
    """
    absolute_path = UPLOAD_BASE_DIR / path
    try:
        await aiofiles.os.remove(str(absolute_path))
        logger.info("文件删除成功: %s", path)
    except FileNotFoundError:
        logger.warning("文件不存在，跳过删除: %s", path)


def get_file_path(relative_path: str) -> Path:
    """将相对路径解析为绝对路径。

    Args:
        relative_path: 存储在数据库中的相对路径。

    Returns:
        文件在磁盘上的绝对路径。
    """
    return UPLOAD_BASE_DIR / relative_path


def validate_storage_quota(
    used: int, file_size: int, quota: int
) -> None:
    """校验用户存储配额是否充足。

    Args:
        used: 已使用空间（字节）。
        file_size: 待上传文件大小（字节）。
        quota: 用户配额上限（字节）。

    Raises:
        QuotaExceededException: 配额不足。
    """
    if used + file_size > quota:
        raise QuotaExceededException(message="存储配额不足", code="STORAGE_QUOTA_EXCEEDED")
