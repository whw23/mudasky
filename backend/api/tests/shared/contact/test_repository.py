"""contact/repository 单元测试。

测试联系记录的创建和查询。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.contact.models import ContactRecord
from app.db.contact.repository import (
    create_record,
    list_by_user,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


# ---- create_record ----


class TestCreateRecord:
    """联系记录创建测试。"""

    async def test_create_success(self, session):
        """正常创建联系记录。"""
        record = ContactRecord(
            user_id="user-1",
            staff_id="staff-1",
            action="call",
            note="已联系",
        )

        result = await create_record(session, record)

        session.add.assert_called_once_with(record)
        session.commit.assert_awaited_once()
        session.refresh.assert_awaited_once_with(record)
        assert result == record

    async def test_create_without_note(self, session):
        """创建不带备注的联系记录。"""
        record = ContactRecord(
            user_id="user-2",
            staff_id="staff-1",
            action="email",
        )

        result = await create_record(session, record)

        session.add.assert_called_once_with(record)
        assert result == record


# ---- list_by_user ----


class TestListByUser:
    """按用户查询联系记录测试。"""

    async def test_list_found(self, session):
        """查询到用户的联系记录。"""
        records = [
            MagicMock(spec=ContactRecord),
            MagicMock(spec=ContactRecord),
        ]
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = records
        mock_result.scalars.return_value = mock_scalars
        session.execute.return_value = mock_result

        result = await list_by_user(session, "user-1")

        assert len(result) == 2
        session.execute.assert_awaited_once()

    async def test_list_empty(self, session):
        """用户无联系记录返回空列表。"""
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        session.execute.return_value = mock_result

        result = await list_by_user(session, "user-no-records")

        assert result == []

    async def test_list_single(self, session):
        """用户只有一条联系记录。"""
        record = MagicMock(spec=ContactRecord)
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [record]
        mock_result.scalars.return_value = mock_scalars
        session.execute.return_value = mock_result

        result = await list_by_user(session, "user-1")

        assert len(result) == 1
