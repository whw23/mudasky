"""user/repository 单元测试（用户 CRUD + 列表查询）。

测试用户的创建、查询、更新、删除和搜索操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.user.models import User
from app.db.user.repository import (
    create,
    delete,
    get_by_id,
    get_by_phone,
    get_by_username,
    list_users,
    update,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    s.refresh = AsyncMock()
    return s


# ---- get_by_id ----


async def test_get_by_id_found(session):
    """根据 ID 查询用户存在时返回。"""
    user = MagicMock(spec=User)
    session.get = AsyncMock(return_value=user)

    result = await get_by_id(session, "user-1")

    session.get.assert_awaited_once_with(User, "user-1")
    assert result == user


async def test_get_by_id_not_found(session):
    """用户不存在时返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_by_id(session, "nonexistent")

    assert result is None


# ---- get_by_phone ----


async def test_get_by_phone_found(session):
    """根据手机号查询用户存在时返回。"""
    user = MagicMock(spec=User)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    session.execute.return_value = mock_result

    result = await get_by_phone(session, "+86-13800138000")

    assert result == user
    session.execute.assert_awaited_once()


async def test_get_by_phone_not_found(session):
    """手机号不存在时返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_by_phone(session, "+86-00000000000")

    assert result is None


# ---- get_by_username ----


async def test_get_by_username_found(session):
    """根据用户名查询用户存在时返回。"""
    user = MagicMock(spec=User)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    session.execute.return_value = mock_result

    result = await get_by_username(session, "testuser")

    assert result == user
    session.execute.assert_awaited_once()


async def test_get_by_username_not_found(session):
    """用户名不存在时返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_by_username(session, "nonexistent")

    assert result is None


# ---- create ----


async def test_create_user(session):
    """创建用户记录。"""
    user = User(phone="+86-13800138000")

    result = await create(session, user)

    session.add.assert_called_once_with(user)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(user)
    assert result == user


async def test_create_user_with_username(session):
    """创建带用户名的用户。"""
    user = User(phone="+86-13900139000", username="newuser")

    result = await create(session, user)

    session.add.assert_called_once_with(user)
    assert result == user


# ---- update ----


async def test_update_user(session):
    """更新用户信息。"""
    user = MagicMock(spec=User)

    result = await update(session, user)

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(user)
    assert result == user


# ---- delete ----


async def test_delete_user(session):
    """删除用户记录。"""
    user = MagicMock(spec=User)

    await delete(session, user)

    session.delete.assert_awaited_once_with(user)


# ---- list_users ----


async def test_list_users_no_search(session):
    """不带搜索条件分页查询用户列表。"""
    users = [MagicMock(spec=User), MagicMock(spec=User)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 2
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = users
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_users(
        session, offset=0, limit=10
    )

    assert total == 2
    assert len(result_list) == 2


async def test_list_users_with_search(session):
    """带搜索关键词查询用户。"""
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

    result_list, total = await list_users(
        session, offset=0, limit=10, search="138"
    )

    assert total == 1
    assert len(result_list) == 1


async def test_list_users_empty_result(session):
    """查询结果为空。"""
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_users(
        session, offset=0, limit=10
    )

    assert total == 0
    assert result_list == []
