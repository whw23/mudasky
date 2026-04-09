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
    get_user_group_id,
    get_user_group_name,
    get_user_permissions,
    list_groups,
    list_permissions,
    set_user_group,
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
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(group)


async def test_update_group(session):
    """更新权限组。"""
    group = MagicMock(spec=PermissionGroup)

    await update_group(session, group)

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(group)


async def test_delete_group(session):
    """删除权限组。"""
    await delete_group(session, "group-1")

    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


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

    # 第一次查询 User.group_id
    group_id_result = MagicMock()
    group_id_result.scalar_one_or_none.return_value = "group-1"

    # 第二次查询 get_group_by_id
    group_result = MagicMock()
    group_result.scalar_one_or_none.return_value = group

    session.execute = AsyncMock(
        side_effect=[group_id_result, group_result]
    )

    result = await get_user_permissions(session, "user-1")

    assert set(result) == {"user:read", "doc:write"}


async def test_get_user_permissions_auto_include_all(session):
    """auto_include_all 权限组返回所有权限码。"""
    group = MagicMock(spec=PermissionGroup)
    group.auto_include_all = True
    group.permissions = []

    # 第一次查询 User.group_id
    group_id_result = MagicMock()
    group_id_result.scalar_one_or_none.return_value = "group-1"

    # 第二次查询 get_group_by_id
    group_by_id_result = MagicMock()
    group_by_id_result.scalar_one_or_none.return_value = group

    # 第三次查询 list_permissions（所有权限）
    perm = MagicMock(spec=Permission)
    perm.code = "admin:all"
    all_perms_result = MagicMock()
    all_perms_scalars = MagicMock()
    all_perms_scalars.all.return_value = [perm]
    all_perms_result.scalars.return_value = all_perms_scalars

    session.execute = AsyncMock(
        side_effect=[
            group_id_result,
            group_by_id_result,
            all_perms_result,
        ]
    )

    result = await get_user_permissions(session, "user-1")

    assert result == ["admin:all"]


async def test_get_user_permissions_no_groups(session):
    """用户无权限组返回空列表。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_user_permissions(session, "user-1")

    assert result == []


async def test_get_user_group_id(session):
    """查询用户所属权限组 ID。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = "group-1"
    session.execute.return_value = mock_result

    result = await get_user_group_id(session, "user-1")

    assert result == "group-1"


async def test_get_user_group_name(session):
    """查询用户所属权限组名称。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = "管理员组"
    session.execute.return_value = mock_result

    result = await get_user_group_name(session, "user-1")

    assert result == "管理员组"


async def test_set_user_group_with_group(session):
    """设置用户权限组（有新组）。"""
    user_mock = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user_mock
    session.execute.return_value = mock_result

    await set_user_group(session, "user-1", "group-1")

    assert user_mock.group_id == "group-1"
    session.commit.assert_awaited_once()


async def test_set_user_group_clear(session):
    """设置用户权限组（清空组）。"""
    user_mock = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user_mock
    session.execute.return_value = mock_result

    await set_user_group(session, "user-1", None)

    assert user_mock.group_id is None
    session.commit.assert_awaited_once()
