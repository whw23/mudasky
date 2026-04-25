"""user/repository 单元测试（角色相关操作）。

测试用户角色查询、设置、按角色列表等操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.user.models import User
from app.db.user.repository import (
    count_by_role,
    get_role_id,
    list_by_role_and_advisor,
    list_by_role_id,
    set_role_id,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    s.refresh = AsyncMock()
    return s


# ---- get_role_id ----


async def test_get_role_id_found(session):
    """查询用户的角色 ID 存在时返回。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = "role-1"
    session.execute.return_value = mock_result

    result = await get_role_id(session, "user-1")

    assert result == "role-1"
    session.execute.assert_awaited_once()


async def test_get_role_id_none(session):
    """用户无角色时返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_role_id(session, "user-no-role")

    assert result is None


# ---- set_role_id ----


async def test_set_role_id(session):
    """设置用户的角色 ID。"""
    await set_role_id(session, "user-1", "role-1")

    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


async def test_set_role_id_to_none(session):
    """将用户角色 ID 设为 None。"""
    await set_role_id(session, "user-1", None)

    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


# ---- list_by_role_id ----


async def test_list_by_role_id(session):
    """查询指定角色下的所有用户。"""
    users = [MagicMock(spec=User), MagicMock(spec=User)]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = users
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_by_role_id(session, "role-1")

    assert len(result) == 2
    session.execute.assert_awaited_once()


async def test_list_by_role_id_empty(session):
    """角色下无用户返回空列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_by_role_id(session, "role-no-users")

    assert result == []


# ---- list_by_role_and_advisor ----


async def test_list_by_role_and_advisor_no_advisor(session):
    """按角色分页查询用户（不含顾问过滤）。"""
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

    result_list, total = await list_by_role_and_advisor(
        session, role_id="role-1", offset=0, limit=10
    )

    assert total == 1
    assert len(result_list) == 1


async def test_list_by_role_and_advisor_with_advisor(
    session,
):
    """按角色和顾问分页查询用户。"""
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

    result_list, total = await list_by_role_and_advisor(
        session,
        role_id="role-1",
        offset=0,
        limit=10,
        advisor_id="advisor-1",
    )

    assert total == 1
    assert len(result_list) == 1


async def test_list_by_role_and_advisor_empty(session):
    """按角色和顾问查询无结果。"""
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_by_role_and_advisor(
        session, role_id="role-none", offset=0, limit=10
    )

    assert total == 0
    assert result_list == []


# ---- count_by_role ----


async def test_count_by_role(session):
    """统计各角色的用户数量。"""
    mock_result = MagicMock()
    mock_result.all.return_value = [
        ("role-1", 5),
        ("role-2", 3),
    ]
    session.execute.return_value = mock_result

    result = await count_by_role(session)

    assert result == {"role-1": 5, "role-2": 3}
    session.execute.assert_awaited_once()


async def test_count_by_role_empty(session):
    """无用户时返回空字典。"""
    mock_result = MagicMock()
    mock_result.all.return_value = []
    session.execute.return_value = mock_result

    result = await count_by_role(session)

    assert result == {}
