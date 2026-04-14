"""document/repository 单元测试。

测试文档 CRUD 数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.document.models import Document
from app.db.document.repository import (
    create,
    delete,
    get_by_hash,
    get_by_id,
    get_user_storage_used,
    list_by_user,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


async def test_create_document(session):
    """创建文档记录。"""
    doc = Document(
        user_id="user-1",
        filename="test.pdf",
        original_name="test.pdf",
        file_path="user-1/docs/test.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_hash="abc123",
    )
    session.refresh = AsyncMock()

    result = await create(session, doc)

    session.add.assert_called_once_with(doc)
    session.commit.assert_awaited_once()
    assert result == doc


async def test_get_by_id_found(session):
    """根据 ID 查询文档。"""
    doc = MagicMock(spec=Document)
    session.get = AsyncMock(return_value=doc)

    result = await get_by_id(session, "doc-1")

    session.get.assert_awaited_once_with(Document, "doc-1")
    assert result == doc


async def test_get_by_id_not_found(session):
    """文档不存在返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_by_id(session, "nonexistent")

    assert result is None


async def test_get_by_hash_found(session):
    """根据文件哈希和用户 ID 查询文档。"""
    doc = MagicMock(spec=Document)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = doc
    session.execute.return_value = mock_result

    result = await get_by_hash(session, "hash123", "user-1")

    assert result == doc
    session.execute.assert_awaited_once()


async def test_get_by_hash_not_found(session):
    """未找到重复文件返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_by_hash(session, "hash123", "user-1")

    assert result is None


async def test_get_user_storage_used(session):
    """计算用户已使用存储空间。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 2048
    session.execute.return_value = mock_result

    result = await get_user_storage_used(session, "user-1")

    assert result == 2048


async def test_list_by_user(session):
    """分页查询用户文档列表。"""
    docs = [MagicMock(spec=Document)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = docs
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_docs, total = await list_by_user(
        session, user_id="user-1", offset=0, limit=10
    )

    assert total == 1
    assert len(result_docs) == 1


async def test_delete_document(session):
    """删除文档记录。"""
    doc = MagicMock(spec=Document)

    await delete(session, doc)

    session.delete.assert_awaited_once_with(doc)
    session.commit.assert_awaited_once()
