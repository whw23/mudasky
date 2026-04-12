"""rbac/repository 单元测试。

测试权限、角色的数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.rbac.models import Permission, Role
from app.rbac.repository import (
    create_role,
    delete_role,
    get_permissions_by_ids,
    get_permissions_by_role,
    get_role_by_id,
    get_role_by_name,
    list_permissions,
    list_roles,
    update_role,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


# ---- permissions ----


async def test_list_permissions(session):
    """查询所有权限。"""
    perms = [MagicMock(spec=Permission), MagicMock(spec=Permission)]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = perms
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_permissions(session)

    assert len(result) == 2


async def test_get_permissions_by_ids_empty(session):
    """空 ID 列表返回空。"""
    result = await get_permissions_by_ids(session, [])

    assert result == []
    session.execute.assert_not_awaited()


async def test_get_permissions_by_ids(session):
    """根据 ID 列表查询权限。"""
    perms = [MagicMock(spec=Permission)]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = perms
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_permissions_by_ids(session, ["perm-1"])

    assert len(result) == 1


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
    """根据角色 ID 查询权限码。"""
    perm1 = MagicMock(spec=Permission)
    perm1.code = "admin/users/list"
    perm2 = MagicMock(spec=Permission)
    perm2.code = "admin/content/edit"

    role = MagicMock(spec=Role)
    role.permissions = [perm1, perm2]

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = role
    session.execute.return_value = mock_result

    result = await get_permissions_by_role(session, "role-1")

    assert set(result) == {"admin/users/list", "admin/content/edit"}


async def test_get_permissions_by_role_not_found(session):
    """角色不存在返回空列表。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_permissions_by_role(session, "nonexistent")

    assert result == []
