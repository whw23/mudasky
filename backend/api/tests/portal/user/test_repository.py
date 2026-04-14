"""user/repository 单元测试。

测试用户 CRUD 数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.user.models import User
from app.db.user.repository import (
    create,
    get_by_id,
    get_by_phone,
    get_by_username,
    list_users,
    update,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


async def test_get_by_id_found(session):
    """根据 ID 查询用户。"""
    user = MagicMock(spec=User)
    session.get = AsyncMock(return_value=user)

    result = await get_by_id(session, "user-1")

    session.get.assert_awaited_once_with(User, "user-1")
    assert result == user


async def test_get_by_id_not_found(session):
    """用户不存在返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_by_id(session, "nonexistent")

    assert result is None


async def test_get_by_phone_found(session):
    """根据手机号查询用户。"""
    user = MagicMock(spec=User)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    session.execute.return_value = mock_result

    result = await get_by_phone(session, "+8613800138000")

    assert result == user


async def test_get_by_phone_not_found(session):
    """手机号不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_by_phone(session, "+8613800138000")

    assert result is None


async def test_get_by_username_found(session):
    """根据用户名查询用户。"""
    user = MagicMock(spec=User)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    session.execute.return_value = mock_result

    result = await get_by_username(session, "testuser")

    assert result == user


async def test_get_by_username_not_found(session):
    """用户名不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_by_username(session, "nonexistent")

    assert result is None


async def test_create_user(session):
    """创建用户。"""
    user = User(phone="+8613800138000")
    session.refresh = AsyncMock()

    result = await create(session, user)

    session.add.assert_called_once_with(user)
    session.commit.assert_awaited_once()
    assert result == user


async def test_update_user(session):
    """更新用户。"""
    user = MagicMock(spec=User)
    session.refresh = AsyncMock()

    result = await update(session, user)

    session.commit.assert_awaited_once()
    assert result == user


async def test_list_users(session):
    """分页查询用户列表。"""
    users = [MagicMock(spec=User)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = users
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_users, total = await list_users(
        session, offset=0, limit=10
    )

    assert total == 1
    assert len(result_users) == 1
