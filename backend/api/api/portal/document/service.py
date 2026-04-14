"""Portal 文档领域业务逻辑层。

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
from app.db.document import repository
from app.db.document.models import Document, DocumentCategory
from app.db.user import repository as user_repo

# TODO: Task 12 - BYTEA migration
# from app.core.storage import (
#     delete_file,
#     save_file,
#     validate_storage_quota,
# )

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
    # TODO: Task 12 - BYTEA migration
    raise NotImplementedError("文件上传功能待 BYTEA 迁移后实现")


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
        raise NotFoundException(message="文档不存在", code="DOCUMENT_NOT_FOUND")
    if doc.user_id != user_id:
        raise ForbiddenException(message="无权访问此文档", code="DOCUMENT_ACCESS_DENIED")
    return doc


async def delete_document(
    session: AsyncSession, doc_id: str, user_id: str
) -> None:
    """删除文档，检查所有权，同时删除数据库记录。"""
    doc = await get_document(session, doc_id, user_id)
    # TODO: Task 12 - BYTEA migration
    # await delete_file(doc.file_path)
    await repository.delete(session, doc)
    logger.info("文档已删除: id=%s, user=%s", doc_id, user_id)
