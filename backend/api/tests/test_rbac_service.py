"""RBAC Service 单元测试。

测试 RbacService 的权限查询、权限组增删改、用户权限分配等业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictException, ForbiddenException
from app.rbac.models import Permission, PermissionGroup
from app.rbac.schemas import GroupCreate, GroupUpdate
from app.rbac.service import RbacService


def _make_permission(
    code: str, perm_id: str = "", description: str = ""
) -> Permission:
    """创建模拟 Permission 对象。"""
    p = MagicMock(spec=Permission)
    p.id = perm_id or f"perm-{code}"
    p.code = code
    p.description = description or f"{code} 权限"
    return p


def _make_group(
    name: str,
    group_id: str = "",
    is_system: bool = False,
    auto_include_all: bool = False,
    permissions: list | None = None,
) -> PermissionGroup:
    """创建模拟 PermissionGroup 对象。"""
    g = MagicMock(spec=PermissionGroup)
    g.id = group_id or f"group-{name}"
    g.name = name
    g.description = f"{name} 描述"
    g.is_system = is_system
    g.auto_include_all = auto_include_all
    g.permissions = permissions or []
    g.created_at = datetime.now(timezone.utc)
    g.updated_at = None
    return g


REPO = "app.rbac.service.repository"


@pytest.fixture
def service() -> RbacService:
    """构建 RbacService 实例，注入 mock session。"""
    session = AsyncMock()
    return RbacService(session)


@pytest.mark.asyncio
@patch(REPO)
async def test_list_permissions(mock_repo, service):
    """返回所有权限列表。"""
    perms = [
        _make_permission("user:read"),
        _make_permission("user:write"),
    ]
    mock_repo.list_permissions = AsyncMock(return_value=perms)

    result = await service.list_permissions()

    assert len(result) == 2
    assert result[0].code == "user:read"
    assert result[1].code == "user:write"
    mock_repo.list_permissions.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_create_group(mock_repo, service):
    """创建权限组并关联权限。"""
    mock_repo.get_group_by_name = AsyncMock(return_value=None)
    perm = _make_permission("user:read")
    mock_repo.get_permissions_by_ids = AsyncMock(
        return_value=[perm]
    )

    # create_group 被调用后，模拟数据库填充默认字段
    async def _fake_create(session, group):
        group.id = "new-group-id"
        group.is_system = False
        group.auto_include_all = False
        group.created_at = datetime.now(timezone.utc)
        group.updated_at = None

    mock_repo.create_group = AsyncMock(side_effect=_fake_create)

    data = GroupCreate(
        name="测试组",
        description="测试描述",
        permission_ids=["perm-user:read"],
    )
    result = await service.create_group(data)

    assert result.name == "测试组"
    mock_repo.create_group.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_create_group_duplicate_name(mock_repo, service):
    """创建同名权限组应抛出 ConflictException。"""
    existing = _make_group("已存在组")
    mock_repo.get_group_by_name = AsyncMock(
        return_value=existing
    )

    data = GroupCreate(
        name="已存在组",
        description="描述",
        permission_ids=[],
    )
    with pytest.raises(ConflictException):
        await service.create_group(data)


@pytest.mark.asyncio
@patch(REPO)
async def test_update_group(mock_repo, service):
    """更新权限组名称和权限。"""
    group = _make_group("旧名称", group_id="g1", is_system=False)
    mock_repo.get_group_by_id = AsyncMock(return_value=group)
    mock_repo.get_group_by_name = AsyncMock(return_value=None)
    perm = _make_permission("user:write")
    mock_repo.get_permissions_by_ids = AsyncMock(
        return_value=[perm]
    )
    mock_repo.update_group = AsyncMock()

    data = GroupUpdate(
        name="新名称",
        permission_ids=["perm-user:write"],
    )
    result = await service.update_group("g1", data)

    assert result.name == "新名称"
    mock_repo.update_group.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_group_system_name(mock_repo, service):
    """系统权限组不允许修改名称。"""
    group = _make_group(
        "系统组", group_id="g-sys", is_system=True
    )
    mock_repo.get_group_by_id = AsyncMock(return_value=group)

    data = GroupUpdate(name="试图改名")
    with pytest.raises(ForbiddenException):
        await service.update_group("g-sys", data)


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_group(mock_repo, service):
    """普通权限组可以删除。"""
    group = _make_group(
        "普通组", group_id="g1", is_system=False
    )
    mock_repo.get_group_by_id = AsyncMock(return_value=group)
    mock_repo.delete_group = AsyncMock()

    await service.delete_group("g1")

    mock_repo.delete_group.assert_awaited_once_with(
        service.session, "g1"
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_group_system(mock_repo, service):
    """系统权限组不允许删除，抛出 ForbiddenException。"""
    group = _make_group(
        "系统组", group_id="g-sys", is_system=True
    )
    mock_repo.get_group_by_id = AsyncMock(return_value=group)

    with pytest.raises(ForbiddenException):
        await service.delete_group("g-sys")


@pytest.mark.asyncio
@patch(REPO)
async def test_get_user_permissions_auto_include_all(
    mock_repo, service
):
    """用户在 auto_include_all 权限组中获得所有权限。"""
    mock_repo.get_user_permissions = AsyncMock(
        return_value=[
            "user:read",
            "user:write",
            "admin:manage",
        ]
    )

    result = await service.get_user_permissions("user-1")

    assert "user:read" in result
    assert "admin:manage" in result
    mock_repo.get_user_permissions.assert_awaited_once_with(
        service.session, "user-1"
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_assign_user_groups_superuser(mock_repo, service):
    """超级管理员可以分配任意权限组，跳过约束检查。"""
    mock_repo.set_user_groups = AsyncMock()

    await service.assign_user_groups(
        user_id="user-1",
        group_ids=["g1", "g2"],
        operator_permissions=[],
        is_superuser=True,
    )

    mock_repo.set_user_groups.assert_awaited_once_with(
        service.session, "user-1", ["g1", "g2"]
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_assign_user_groups_constraint(mock_repo, service):
    """非超级管理员且无 group:manage 时，不能分配超出自身权限的组。"""
    perm_admin = _make_permission("admin:manage")
    group_with_admin = _make_group(
        "管理组",
        group_id="g-admin",
        permissions=[perm_admin],
    )
    mock_repo.get_group_by_id = AsyncMock(
        return_value=group_with_admin
    )

    with pytest.raises(ForbiddenException):
        await service.assign_user_groups(
            user_id="user-1",
            group_ids=["g-admin"],
            operator_permissions=["user:read"],
            is_superuser=False,
        )
