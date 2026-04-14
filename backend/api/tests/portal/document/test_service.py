"""Document Service 单元测试。

测试文档上传、查询、删除等业务逻辑，包括配额校验和权限检查。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    QuotaExceededException,
)
from api.portal.document import service as doc_service
from app.db.document.models import Document, DocumentCategory


DOC_REPO = "api.portal.document.service.repository"
USER_REPO = "api.portal.document.service.user_repo"


def _make_document(
    doc_id: str = "doc-1",
    user_id: str = "user-1",
) -> Document:
    """创建模拟 Document 对象。"""
    d = MagicMock(spec=Document)
    d.id = doc_id
    d.user_id = user_id
    d.filename = "uuid_test.pdf"
    d.original_name = "test.pdf"
    d.file_path = f"{user_id}/other/uuid_test.pdf"
    d.file_size = 1024
    d.mime_type = "application/pdf"
    d.category = DocumentCategory.OTHER
    d.file_hash = "abc123hash"
    d.created_at = datetime.now(timezone.utc)
    d.updated_at = None
    return d


def _make_user(
    user_id: str = "user-1",
    storage_quota: int = 104857600,
) -> MagicMock:
    """创建模拟 User 对象。"""
    u = MagicMock()
    u.id = user_id
    u.storage_quota = storage_quota
    return u


def _make_upload_file(
    data: bytes = b"file content",
    filename: str = "test.pdf",
    content_type: str = "application/pdf",
) -> MagicMock:
    """创建模拟 UploadFile 对象。"""
    f = MagicMock()
    f.filename = filename
    f.content_type = content_type
    f.read = AsyncMock(return_value=data)
    f.seek = AsyncMock()
    return f


# ---- upload_document ----


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(USER_REPO)
async def test_upload_document_success(
    mock_user_repo,
    mock_doc_repo,
):
    """上传文档成功：保存到数据库。"""
    session = AsyncMock()
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_doc_repo.get_user_storage_used = AsyncMock(
        return_value=0
    )
    mock_doc_repo.get_by_hash = AsyncMock(return_value=None)
    created_doc = _make_document()
    mock_doc_repo.create = AsyncMock(return_value=created_doc)

    file = _make_upload_file()
    result = await doc_service.upload_document(
        session, "user-1", file, DocumentCategory.OTHER
    )

    assert result.id == "doc-1"
    mock_doc_repo.create.assert_awaited_once()


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(USER_REPO)
async def test_upload_document_quota_exceeded(
    mock_user_repo,
    mock_doc_repo,
):
    """上传文档时配额超限抛出 QuotaExceededException。"""
    session = AsyncMock()
    user = _make_user(storage_quota=100)
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_doc_repo.get_user_storage_used = AsyncMock(
        return_value=50
    )

    file = _make_upload_file(data=b"x" * 200)
    with pytest.raises(QuotaExceededException):
        await doc_service.upload_document(
            session, "user-1", file, DocumentCategory.OTHER
        )


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(USER_REPO)
async def test_upload_document_duplicate(
    mock_user_repo,
    mock_doc_repo,
):
    """上传重复文件时抛出 ConflictException。"""
    session = AsyncMock()
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_doc_repo.get_user_storage_used = AsyncMock(
        return_value=0
    )
    # 哈希去重命中
    existing_doc = _make_document()
    mock_doc_repo.get_by_hash = AsyncMock(
        return_value=existing_doc
    )

    file = _make_upload_file()
    with pytest.raises(ConflictException):
        await doc_service.upload_document(
            session, "user-1", file, DocumentCategory.OTHER
        )


# ---- list_documents ----


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_list_documents(mock_repo):
    """分页查询用户文档列表。"""
    docs = [_make_document(), _make_document(doc_id="doc-2")]
    mock_repo.list_by_user = AsyncMock(
        return_value=(docs, 2)
    )

    session = AsyncMock()
    result, total = await doc_service.list_documents(
        session, "user-1", offset=0, limit=10
    )

    assert total == 2
    assert len(result) == 2
    mock_repo.list_by_user.assert_awaited_once_with(
        session, "user-1", 0, 10
    )


# ---- get_document ----


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_get_document_success(mock_repo):
    """获取自己的文档成功。"""
    doc = _make_document(user_id="user-1")
    mock_repo.get_by_id = AsyncMock(return_value=doc)

    session = AsyncMock()
    result = await doc_service.get_document(
        session, "doc-1", "user-1"
    )

    assert result.id == "doc-1"


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_get_document_not_found(mock_repo):
    """文档不存在时抛出 NotFoundException。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)

    session = AsyncMock()
    with pytest.raises(NotFoundException):
        await doc_service.get_document(
            session, "nonexistent", "user-1"
        )


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_get_document_forbidden(mock_repo):
    """非文档所有者访问时抛出 ForbiddenException。"""
    doc = _make_document(user_id="user-1")
    mock_repo.get_by_id = AsyncMock(return_value=doc)

    session = AsyncMock()
    with pytest.raises(ForbiddenException):
        await doc_service.get_document(
            session, "doc-1", "other-user"
        )


# ---- delete_document ----


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_delete_document_success(mock_repo):
    """删除自己的文档成功。"""
    doc = _make_document(user_id="user-1")
    mock_repo.get_by_id = AsyncMock(return_value=doc)
    mock_repo.delete = AsyncMock()

    session = AsyncMock()
    await doc_service.delete_document(
        session, "doc-1", "user-1"
    )

    mock_repo.delete.assert_awaited_once()


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_delete_document_not_found(mock_repo):
    """删除不存在的文档抛出 NotFoundException。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)

    session = AsyncMock()
    with pytest.raises(NotFoundException):
        await doc_service.delete_document(
            session, "nonexistent", "user-1"
        )


@pytest.mark.asyncio
@patch(DOC_REPO)
async def test_delete_document_forbidden(mock_repo):
    """非所有者删除文档抛出 ForbiddenException。"""
    doc = _make_document(user_id="user-1")
    mock_repo.get_by_id = AsyncMock(return_value=doc)

    session = AsyncMock()
    with pytest.raises(ForbiddenException):
        await doc_service.delete_document(
            session, "doc-1", "other-user"
        )
