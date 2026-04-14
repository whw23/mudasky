"""Portal 文档领域业务逻辑层。

处理文件上传、去重、配额检查、文档管理等业务。
文件存储在 PostgreSQL BYTEA 列中。
"""

import hashlib
import logging

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    QuotaExceededException,
)
from app.db.document import repository
from app.db.document.models import Document, DocumentCategory
from app.db.user import repository as user_repo

logger = logging.getLogger(__name__)


def _validate_storage_quota(used: int, file_size: int, quota: int) -> None:
    """校验用户存储配额是否充足。"""
    if used + file_size > quota:
        raise QuotaExceededException(message="存储配额不足", code="STORAGE_QUOTA_EXCEEDED")


async def upload_document(
    session: AsyncSession,
    user_id: str,
    file: UploadFile,
    category: DocumentCategory,
) -> Document:
    """上传文件，存入 PostgreSQL BYTEA。

    包含文件大小检查、配额检查、哈希去重。
    """
    data = await file.read()
    file_size = len(data)

    # 校验单文件大小
    if file_size > settings.max_upload_size_bytes:
        raise QuotaExceededException(
            message=f"文件大小超过限制（{settings.MAX_UPLOAD_SIZE_MB}MB）",
            code="FILE_SIZE_EXCEEDED",
        )

    # 校验存储配额
    user = await user_repo.get_by_id(session, user_id)
    if not user:
        raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")
    storage_used = await repository.get_user_storage_used(session, user_id)
    _validate_storage_quota(storage_used, file_size, user.storage_quota)

    # SHA-256 哈希去重
    file_hash = hashlib.sha256(data).hexdigest()
    existing = await repository.get_by_hash(session, file_hash, user_id)
    if existing:
        return existing

    original_name = file.filename or "untitled"
    doc = Document(
        user_id=user_id,
        filename=original_name,
        original_name=original_name,
        file_data=data,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        category=category,
        file_hash=file_hash,
    )
    return await repository.create(session, doc)


async def list_documents(
    session: AsyncSession, user_id: str, offset: int, limit: int
) -> tuple[list[Document], int]:
    """分页查询用户的文档列表。"""
    return await repository.list_by_user(session, user_id, offset, limit)


async def get_document(
    session: AsyncSession, doc_id: str, user_id: str
) -> Document:
    """获取文档信息，检查所有权。"""
    doc = await repository.get_by_id(session, doc_id)
    if not doc:
        raise NotFoundException(message="文档不存在", code="DOCUMENT_NOT_FOUND")
    if doc.user_id != user_id:
        raise ForbiddenException(message="无权访问此文档", code="DOCUMENT_ACCESS_DENIED")
    return doc


async def delete_document(
    session: AsyncSession, doc_id: str, user_id: str
) -> None:
    """删除文档，检查所有权。"""
    doc = await get_document(session, doc_id, user_id)
    await repository.delete(session, doc)
    logger.info("文档已删除: id=%s, user=%s", doc_id, user_id)
