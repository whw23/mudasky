"""文档领域业务逻辑层。

处理文件上传、去重、配额检查、文档管理等业务。
"""

import hashlib
import logging

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.core.storage import (
    delete_file,
    save_file,
    validate_storage_quota,
)
from app.document import repository
from app.document.models import Document, DocumentCategory
from app.user import repository as user_repo

logger = logging.getLogger(__name__)


async def upload_document(
    session: AsyncSession,
    user_id: str,
    file: UploadFile,
    category: DocumentCategory,
) -> Document:
    """上传文件。

    包含文件大小检查、配额检查、哈希去重、磁盘保存。
    """
    data = await file.read()
    file_size = len(data)
    original_name = file.filename or "untitled"
    mime_type = file.content_type or "application/octet-stream"

    # 配额校验
    user = await user_repo.get_by_id(session, user_id)
    if not user:
        raise NotFoundException(message="用户不存在")
    used = await repository.get_user_storage_used(session, user_id)
    validate_storage_quota(used, file_size, user.storage_quota)

    # 哈希去重
    file_hash = hashlib.sha256(data).hexdigest()
    existing = await repository.get_by_hash(
        session, file_hash, user_id
    )
    if existing:
        raise ConflictException(message="文件已存在")

    # 重置文件指针后通过 storage 模块保存
    await file.seek(0)
    relative_path, _ = await save_file(file, user_id, category.value)

    doc = Document(
        user_id=user_id,
        filename=relative_path.rsplit("/", 1)[-1],
        original_name=original_name,
        file_path=relative_path,
        file_size=file_size,
        mime_type=mime_type,
        category=category,
        file_hash=file_hash,
    )
    return await repository.create(session, doc)


async def list_documents(
    session: AsyncSession, user_id: str, offset: int, limit: int
) -> tuple[list[Document], int]:
    """分页查询用户的文档列表。"""
    return await repository.list_by_user(
        session, user_id, offset, limit
    )


async def get_document(
    session: AsyncSession, doc_id: str, user_id: str
) -> Document:
    """获取文档信息，检查所有权。"""
    doc = await repository.get_by_id(session, doc_id)
    if not doc:
        raise NotFoundException(message="文档不存在")
    if doc.user_id != user_id:
        raise ForbiddenException(message="无权访问此文档")
    return doc


async def delete_document(
    session: AsyncSession, doc_id: str, user_id: str
) -> None:
    """删除文档，检查所有权，同时删除磁盘文件和数据库记录。"""
    doc = await get_document(session, doc_id, user_id)
    await delete_file(doc.file_path)
    await repository.delete(session, doc)
    logger.info("文档已删除: id=%s, user=%s", doc_id, user_id)
