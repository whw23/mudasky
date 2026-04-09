"""rbac/repository 单元测试。

测试权限、权限组、用户权限组关联的数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.rbac.models import Permission, PermissionGroup
from app.rbac.repository import (
    create_group,
    delete_group,
    get_group_by_id,
    get_group_by_name,
    get_permissions_by_ids,
    get_user_group_ids,
    get_user_group_names,
    get_user_permissions,
    list_groups,
    list_permissions,
    set_user_groups,
    update_group,
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


# ---- groups ----


async def test_list_groups(session):
    """查询所有权限组。"""
    group = MagicMock(spec=PermissionGroup)
    row = (group, 3)
    mock_result = MagicMock()
    mock_result.all.return_value = [row]
    session.execute.return_value = mock_result

    result = await list_groups(session)

    assert len(result) == 1
    assert result[0] == (group, 3)


async def test_get_group_by_id_found(session):
    """根据 ID 查询权限组。"""
    group = MagicMock(spec=PermissionGroup)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = group
    session.execute.return_value = mock_result

    result = await get_group_by_id(session, "group-1")

    assert result == group


async def test_get_group_by_id_not_found(session):
    """权限组不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_group_by_id(session, "nonexistent")

    assert result is None


async def test_get_group_by_name_found(session):
    """根据名称查询权限组。"""
    group = MagicMock(spec=PermissionGroup)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = group
    session.execute.return_value = mock_result

    result = await get_group_by_name(session, "管理员组")

    assert result == group


async def test_get_group_by_name_not_found(session):
    """名称不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_group_by_name(session, "不存在")

    assert result is None


async def test_create_group(session):
    """创建权限组。"""
    group = PermissionGroup(name="新组", description="描述")

    await create_group(session, group)

    session.add.assert_called_once_with(group)
    session.flush.assert_awaited_once()


async def test_update_group(session):
    """更新权限组。"""
    group = MagicMock(spec=PermissionGroup)

    await update_group(session, group)

    session.flush.assert_awaited_once()


async def test_delete_group(session):
    """删除权限组。"""
    await delete_group(session, "group-1")

    session.execute.assert_awaited_once()
    session.flush.assert_awaited_once()


# ---- user permissions / groups ----


async def test_get_user_permissions_normal(session):
    """查询用户权限码（普通权限组）。"""
    perm1 = MagicMock(spec=Permission)
    perm1.code = "user:read"
    perm2 = MagicMock(spec=Permission)
    perm2.code = "doc:write"

    group = MagicMock(spec=PermissionGroup)
    group.auto_include_all = False
    group.permissions = [perm1, perm2]

    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [group]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_user_permissions(session, "user-1")

    assert set(result) == {"user:read", "doc:write"}


async def test_get_user_permissions_auto_include_all(session):
    """auto_include_all 权限组返回所有权限码。"""
    group = MagicMock(spec=PermissionGroup)
    group.auto_include_all = True
    group.permissions = []

    # 用户权限组查询
    group_result = MagicMock()
    group_scalars = MagicMock()
    group_scalars.all.return_value = [group]
    group_result.scalars.return_value = group_scalars

    # 所有权限查询
    perm = MagicMock(spec=Permission)
    perm.code = "admin:all"
    all_perms_result = MagicMock()
    all_perms_scalars = MagicMock()
    all_perms_scalars.all.return_value = [perm]
    all_perms_result.scalars.return_value = all_perms_scalars

    session.execute = AsyncMock(
        side_effect=[group_result, all_perms_result]
    )

    result = await get_user_permissions(session, "user-1")

    assert result == ["admin:all"]


async def test_get_user_permissions_no_groups(session):
    """用户无权限组返回空列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_user_permissions(session, "user-1")

    assert result == []


async def test_get_user_group_ids(session):
    """查询用户所属权限组 ID。"""
    row1 = ("group-1",)
    row2 = ("group-2",)
    mock_result = MagicMock()
    mock_result.all.return_value = [row1, row2]
    session.execute.return_value = mock_result

    result = await get_user_group_ids(session, "user-1")

    assert result == ["group-1", "group-2"]


async def test_get_user_group_names(session):
    """查询用户所属权限组名称。"""
    row1 = ("管理员组",)
    row2 = ("编辑组",)
    mock_result = MagicMock()
    mock_result.all.return_value = [row1, row2]
    session.execute.return_value = mock_result

    result = await get_user_group_names(session, "user-1")

    assert result == ["管理员组", "编辑组"]


async def test_set_user_groups_with_groups(session):
    """设置用户权限组（有新组）。"""
    await set_user_groups(session, "user-1", ["group-1", "group-2"])

    # 应该有两次 execute: 删除旧关联 + 插入新关联
    assert session.execute.await_count == 2
    session.flush.assert_awaited_once()


async def test_set_user_groups_empty(session):
    """设置用户权限组（清空所有组）。"""
    await set_user_groups(session, "user-1", [])

    # 只有一次 execute: 删除旧关联
    session.execute.assert_awaited_once()
    session.flush.assert_awaited_once()
