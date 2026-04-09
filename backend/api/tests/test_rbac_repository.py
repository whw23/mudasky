"""rbac/repository 单元测试。

测试权限、角色、用户角色关联的数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.rbac.models import Permission, Role
from app.rbac.repository import (
    create_role,
    delete_role,
    get_role_by_id,
    get_role_by_name,
    get_permissions_by_ids,
    get_user_role_id,
    get_user_role_name,
    get_user_permissions,
    list_roles,
    list_permissions,
    set_user_role,
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
    row = (role, 3)
    mock_result = MagicMock()
    mock_result.all.return_value = [row]
    session.execute.return_value = mock_result

    result = await list_roles(session)

    assert len(result) == 1
    assert result[0] == (role, 3)


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


# ---- user permissions / roles ----


async def test_get_user_permissions_normal(session):
    """查询用户权限码（普通角色）。"""
    perm1 = MagicMock(spec=Permission)
    perm1.code = "admin.user.list"
    perm2 = MagicMock(spec=Permission)
    perm2.code = "admin.content.edit"

    role = MagicMock(spec=Role)
    role.permissions = [perm1, perm2]

    # 第一次查询 User.role_id
    role_id_result = MagicMock()
    role_id_result.scalar_one_or_none.return_value = "role-1"

    # 第二次查询 get_role_by_id
    role_result = MagicMock()
    role_result.scalar_one_or_none.return_value = role

    session.execute = AsyncMock(
        side_effect=[role_id_result, role_result]
    )

    result = await get_user_permissions(session, "user-1")

    assert set(result) == {"admin.user.list", "admin.content.edit"}


async def test_get_user_permissions_no_role(session):
    """用户无角色返回空列表。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_user_permissions(session, "user-1")

    assert result == []


async def test_get_user_role_id(session):
    """查询用户所属角色 ID。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = "role-1"
    session.execute.return_value = mock_result

    result = await get_user_role_id(session, "user-1")

    assert result == "role-1"


async def test_get_user_role_name(session):
    """查询用户所属角色名称。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = "管理员"
    session.execute.return_value = mock_result

    result = await get_user_role_name(session, "user-1")

    assert result == "管理员"


async def test_set_user_role_with_role(session):
    """设置用户角色（有新角色）。"""
    user_mock = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user_mock
    session.execute.return_value = mock_result

    await set_user_role(session, "user-1", "role-1")

    assert user_mock.role_id == "role-1"
    session.commit.assert_awaited_once()


async def test_set_user_role_clear(session):
    """设置用户角色（清空角色）。"""
    user_mock = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user_mock
    session.execute.return_value = mock_result

    await set_user_role(session, "user-1", None)

    assert user_mock.role_id is None
    session.commit.assert_awaited_once()
