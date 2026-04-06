"""文档领域业务逻辑层。

处理文件上传、去重、配额检查、文档管理等业务。
"""

import hashlib
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    QuotaExceededException,
)
from app.document import repository
from app.document.models import Document
from app.document.storage.local import LocalStorage
from app.user import repository as user_repo


class DocumentService:
    """文档业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session
        self.storage = LocalStorage()

    async def upload(
        self,
        user_id: str,
        file_name: str,
        mime_type: str,
        data: bytes,
    ) -> Document:
        """上传文件。

        包含文件大小检查、配额检查、哈希去重。
        """
        file_size = len(data)
        self._check_file_size(file_size)
        await self._check_quota(user_id, file_size)

        file_hash = hashlib.sha256(data).hexdigest()
        existing = await repository.get_by_hash(
            self.session, file_hash, user_id
        )
        if existing:
            raise ConflictException(message="文件已存在")

        file_id = str(uuid.uuid4())
        storage_path = f"{user_id}/{file_id}/{file_name}"
        await self.storage.save(storage_path, data)

        doc = Document(
            id=file_id,
            file_name=file_name,
            file_path=storage_path,
            file_hash=file_hash,
            mime_type=mime_type,
            file_size=file_size,
            uploader_id=user_id,
        )
        return await repository.create(self.session, doc)

    async def get_document(self, doc_id: str) -> Document:
        """获取文档信息，不存在则抛出异常。"""
        doc = await repository.get_by_id(self.session, doc_id)
        if not doc:
            raise NotFoundException(message="文档不存在")
        return doc

    async def list_user_documents(
        self, user_id: str, offset: int, limit: int
    ) -> tuple[list[Document], int]:
        """分页查询用户的文档列表。"""
        return await repository.list_by_user(
            self.session, user_id, offset, limit
        )

    async def delete_document(
        self, doc_id: str, user_id: str
    ) -> None:
        """删除文档，检查所有权。"""
        doc = await self.get_document(doc_id)
        if doc.uploader_id != user_id:
            raise ForbiddenException(message="无权删除此文档")
        await self.storage.delete(doc.file_path)
        await repository.delete(self.session, doc)

    def _check_file_size(self, file_size: int) -> None:
        """检查文件大小是否超限。"""
        if file_size > settings.max_upload_size_bytes:
            raise QuotaExceededException(
                message=f"文件大小超过限制（{settings.MAX_UPLOAD_SIZE_MB}MB）"
            )

    async def _check_quota(
        self, user_id: str, file_size: int
    ) -> None:
        """检查用户存储配额是否充足。"""
        user = await user_repo.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(message="用户不存在")
        used = await repository.get_user_storage_used(
            self.session, user_id
        )
        if used + file_size > user.storage_quota:
            raise QuotaExceededException(message="存储配额不足")
