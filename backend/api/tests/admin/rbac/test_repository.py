"""rbac/repository 单元测试。

测试角色的数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.rbac.models import Role
from app.db.rbac.repository import (
    bulk_update_sort_order,
    create_role,
    delete_role,
    get_max_sort_order,
    get_permissions_by_role,
    get_role_by_id,
    get_role_by_name,
    list_roles,
    update_role,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


# ---- roles ----


async def test_list_roles(session):
    """查询所有角色。"""
    role = MagicMock(spec=Role)
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [role]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_roles(session)

    assert len(result) == 1


async def test_get_role_by_id_found(session):
    """根据 ID 查询角色。"""
    role = MagicMock(spec=Role)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = role
    session.execute.return_value = mock_result

    result = await get_role_by_id(session, "role-1")

    assert result == role


async def test_get_role_by_id_not_found(session):
    """角色不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_role_by_id(session, "nonexistent")

    assert result is None


async def test_get_role_by_name_found(session):
    """根据名称查询角色。"""
    role = MagicMock(spec=Role)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = role
    session.execute.return_value = mock_result

    result = await get_role_by_name(session, "管理员")

    assert result == role


async def test_get_role_by_name_not_found(session):
    """名称不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_role_by_name(session, "不存在")

    assert result is None


async def test_create_role(session):
    """创建角色。"""
    role = Role(name="新角色", description="描述")

    await create_role(session, role)

    session.add.assert_called_once_with(role)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(role)


async def test_update_role(session):
    """更新角色。"""
    role = MagicMock(spec=Role)

    await update_role(session, role)

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(role)


async def test_delete_role(session):
    """删除角色。"""
    await delete_role(session, "role-1")

    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


# ---- get_permissions_by_role ----


async def test_get_permissions_by_role_normal(session):
    """根据角色 ID 查询权限列表。"""
    role = MagicMock(spec=Role)
    role.permissions = ["admin/users/*", "admin/content/*"]

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = role
    session.execute.return_value = mock_result

    result = await get_permissions_by_role(session, "role-1")

    assert set(result) == {"admin/users/*", "admin/content/*"}


async def test_get_permissions_by_role_not_found(session):
    """角色不存在返回空列表。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_permissions_by_role(session, "nonexistent")

    assert result == []


async def test_get_permissions_by_role_none_permissions(session):
    """角色 permissions 为 None 时返回空列表。"""
    role = MagicMock(spec=Role)
    role.permissions = None

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = role
    session.execute.return_value = mock_result

    result = await get_permissions_by_role(session, "role-empty")

    assert result == []


# ---- get_max_sort_order ----


async def test_get_max_sort_order(session):
    """查询当前最大排序值。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 5
    session.execute.return_value = mock_result

    result = await get_max_sort_order(session)

    assert result == 5
    session.execute.assert_awaited_once()


async def test_get_max_sort_order_empty(session):
    """无角色时返回 -1（coalesce 默认值）。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = -1
    session.execute.return_value = mock_result

    result = await get_max_sort_order(session)

    assert result == -1


# ---- bulk_update_sort_order ----


async def test_bulk_update_sort_order(session):
    """批量更新角色排序。"""
    role1 = MagicMock(spec=Role)
    role2 = MagicMock(spec=Role)

    result1 = MagicMock()
    result1.scalar_one_or_none.return_value = role1
    result2 = MagicMock()
    result2.scalar_one_or_none.return_value = role2

    session.execute = AsyncMock(
        side_effect=[result1, result2]
    )

    await bulk_update_sort_order(
        session, [("role-1", 0), ("role-2", 1)]
    )

    assert role1.sort_order == 0
    assert role2.sort_order == 1
    session.commit.assert_awaited_once()


async def test_bulk_update_sort_order_role_not_found(session):
    """批量更新时角色不存在跳过。"""
    result_not_found = MagicMock()
    result_not_found.scalar_one_or_none.return_value = None

    session.execute = AsyncMock(
        return_value=result_not_found
    )

    await bulk_update_sort_order(
        session, [("nonexistent", 0)]
    )

    session.commit.assert_awaited_once()
