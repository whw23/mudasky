"""RBAC Service 单元测试。

测试 RbacService 的权限查询、角色增删改、用户权限分配等业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictException, ForbiddenException
from app.rbac.models import Permission, Role
from app.rbac.schemas import RoleCreate, RoleUpdate
from app.rbac.service import RbacService


def _make_permission(
    code: str, perm_id: str = "", description: str = ""
) -> Permission:
    """创建模拟 Permission 对象。"""
    p = MagicMock(spec=Permission)
    p.id = perm_id or f"perm-{code}"
    p.code = code
    p.name_key = f"{code}.name"
    p.description = description or f"{code} 权限"
    return p


def _make_role(
    name: str,
    role_id: str = "",
    permissions: list | None = None,
    is_builtin: bool = False,
    sort_order: int = 0,
) -> Role:
    """创建模拟 Role 对象。"""
    r = MagicMock(spec=Role)
    r.id = role_id or f"role-{name}"
    r.name = name
    r.description = f"{name} 描述"
    r.permissions = permissions or []
    r.is_builtin = is_builtin
    r.sort_order = sort_order
    r.created_at = datetime.now(timezone.utc)
    r.updated_at = None
    return r


REPO = "app.rbac.service.repository"
USER_REPO = "app.rbac.service.user_repo"


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
        _make_permission("admin/users/list"),
        _make_permission("admin/users/edit"),
    ]
    mock_repo.list_permissions = AsyncMock(return_value=perms)

    result = await service.list_permissions()

    assert len(result) == 2
    assert result[0].code == "admin/users/list"
    assert result[1].code == "admin/users/edit"
    mock_repo.list_permissions.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_create_role(mock_repo, service):
    """创建角色并关联权限，自动设置 sort_order。"""
    mock_repo.get_role_by_name = AsyncMock(return_value=None)
    perm = _make_permission("admin/users/list")
    mock_repo.get_permissions_by_ids = AsyncMock(return_value=[perm])
    mock_repo.get_max_sort_order = AsyncMock(return_value=4)

    async def _fake_create(session, role):
        role.id = "new-role-id"
        role.created_at = datetime.now(timezone.utc)
        role.updated_at = None

    mock_repo.create_role = AsyncMock(side_effect=_fake_create)

    data = RoleCreate(
        name="测试角色",
        description="测试描述",
        permission_ids=["perm-admin/users/list"],
    )
    result = await service.create_role(data)

    assert result.name == "测试角色"
    assert result.sort_order == 5
    mock_repo.get_max_sort_order.assert_awaited_once()
    mock_repo.create_role.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_create_role_duplicate_name(mock_repo, service):
    """创建同名角色应抛出 ConflictException。"""
    existing = _make_role("已存在角色")
    mock_repo.get_role_by_name = AsyncMock(
        return_value=existing
    )

    data = RoleCreate(
        name="已存在角色",
        description="描述",
        permission_ids=[],
    )
    with pytest.raises(ConflictException):
        await service.create_role(data)


@pytest.mark.asyncio
@patch(REPO)
async def test_update_role(mock_repo, service):
    """更新角色名称和权限。"""
    role = _make_role("旧名称", role_id="r1")
    mock_repo.get_role_by_id = AsyncMock(return_value=role)
    mock_repo.get_role_by_name = AsyncMock(return_value=None)
    perm = _make_permission("admin/users/edit")
    mock_repo.get_permissions_by_ids = AsyncMock(
        return_value=[perm]
    )
    mock_repo.update_role = AsyncMock()

    data = RoleUpdate(
        name="新名称",
        permission_ids=["perm-admin/users/edit"],
    )
    result = await service.update_role("r1", data)

    assert result.name == "新名称"
    mock_repo.update_role.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_role_protected_name(mock_repo, service):
    """受保护角色不允许修改名称。"""
    role = _make_role(
        "superuser", role_id="r-sys"
    )
    mock_repo.get_role_by_id = AsyncMock(return_value=role)

    data = RoleUpdate(name="试图改名")
    with pytest.raises(ForbiddenException):
        await service.update_role("r-sys", data)


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_role(mock_repo, service):
    """普通角色可以删除。"""
    role = _make_role(
        "普通角色", role_id="r1"
    )
    mock_repo.get_role_by_id = AsyncMock(return_value=role)
    mock_repo.delete_role = AsyncMock()

    await service.delete_role("r1")

    mock_repo.delete_role.assert_awaited_once_with(
        service.session, "r1"
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_role_protected(mock_repo, service):
    """受保护角色不允许删除，抛出 ForbiddenException。"""
    role = _make_role(
        "superuser", role_id="r-sys"
    )
    mock_repo.get_role_by_id = AsyncMock(return_value=role)

    with pytest.raises(ForbiddenException):
        await service.delete_role("r-sys")


@pytest.mark.asyncio
@patch(USER_REPO)
@patch(REPO)
async def test_get_user_permissions(
    mock_repo, mock_user_repo, service
):
    """查询用户权限码列表。"""
    mock_user_repo.get_role_id = AsyncMock(
        return_value="role-1"
    )
    mock_repo.get_permissions_by_role = AsyncMock(
        return_value=[
            "admin/users/list",
            "admin/users/edit",
            "admin/content/edit",
        ]
    )

    result = await service.get_user_permissions("user-1")

    assert "admin/users/list" in result
    assert "admin/content/edit" in result
    mock_user_repo.get_role_id.assert_awaited_once_with(
        service.session, "user-1"
    )
    mock_repo.get_permissions_by_role.assert_awaited_once_with(
        service.session, "role-1"
    )


@pytest.mark.asyncio
@patch(USER_REPO)
@patch(REPO)
async def test_assign_user_role(
    mock_repo, mock_user_repo, service
):
    """分配用户角色。"""
    role = _make_role("编辑", role_id="r1")
    mock_repo.get_role_by_id = AsyncMock(return_value=role)
    mock_user_repo.set_role_id = AsyncMock()

    await service.assign_user_role(
        user_id="user-1",
        role_id="r1",
    )

    mock_user_repo.set_role_id.assert_awaited_once_with(
        service.session, "user-1", "r1"
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_reorder_roles(mock_repo, service):
    """批量更新角色排序。"""
    mock_repo.bulk_update_sort_order = AsyncMock()

    from app.rbac.schemas import RoleReorder

    data = RoleReorder(items=[
        {"id": "r1", "sort_order": 0},
        {"id": "r2", "sort_order": 1},
        {"id": "r3", "sort_order": 2},
    ])
    await service.reorder_roles(data)

    mock_repo.bulk_update_sort_order.assert_awaited_once_with(
        service.session,
        [("r1", 0), ("r2", 1), ("r3", 2)],
    )
