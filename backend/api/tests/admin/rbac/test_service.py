"""RBAC Service 单元测试。

测试 RbacService 的角色增删改、用户权限分配等业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictException, ForbiddenException
from app.db.rbac.models import Role
from api.admin.rbac.schemas import RoleCreate, RoleUpdate
from api.admin.rbac.service import RbacService


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


from app.core.exceptions import NotFoundException

REPO = "api.admin.rbac.service.repository"
USER_REPO = "api.admin.rbac.service.user_repo"
AUTH_REPO = "api.admin.rbac.service.auth_repo"


@pytest.fixture
def service() -> RbacService:
    """构建 RbacService 实例，注入 mock session。"""
    session = AsyncMock()
    return RbacService(session)


@pytest.mark.asyncio
@patch(USER_REPO)
@patch(REPO)
async def test_list_roles(mock_repo, mock_user_repo, service):
    """查询所有角色列表，包含用户数量。"""
    roles = [
        _make_role("管理员", role_id="r1", permissions=["admin/*"]),
        _make_role("编辑", role_id="r2", permissions=[]),
    ]
    mock_repo.list_roles = AsyncMock(return_value=roles)
    mock_user_repo.count_by_role = AsyncMock(
        return_value={"r1": 3, "r2": 1}
    )

    result = await service.list_roles()

    assert len(result) == 2
    assert result[0].user_count == 3
    assert result[1].user_count == 1
    mock_repo.list_roles.assert_awaited_once()
    mock_user_repo.count_by_role.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_get_role_success(mock_repo, service):
    """查询角色详情成功。"""
    role = _make_role("编辑", role_id="r1")
    mock_repo.get_role_by_id = AsyncMock(return_value=role)

    result = await service.get_role("r1")

    assert result.name == "编辑"
    mock_repo.get_role_by_id.assert_awaited_once_with(
        service.session, "r1"
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_get_role_not_found(mock_repo, service):
    """查询不存在的角色抛出 NotFoundException。"""
    mock_repo.get_role_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_role("nonexistent")


@pytest.mark.asyncio
@patch(REPO)
async def test_update_role_name_conflict(mock_repo, service):
    """更新角色名称与其他角色冲突时抛出 ConflictException。"""
    role = _make_role("旧名称", role_id="r1")
    existing = _make_role("新名称", role_id="r2")
    mock_repo.get_role_by_id = AsyncMock(return_value=role)
    mock_repo.get_role_by_name = AsyncMock(return_value=existing)

    data = RoleUpdate(role_id="r1", name="新名称")
    with pytest.raises(ConflictException):
        await service.update_role("r1", data)


@pytest.mark.asyncio
@patch(REPO)
async def test_update_role_not_found(mock_repo, service):
    """更新不存在的角色抛出 NotFoundException。"""
    mock_repo.get_role_by_id = AsyncMock(return_value=None)

    data = RoleUpdate(role_id="nonexistent", name="新名称")
    with pytest.raises(NotFoundException):
        await service.update_role("nonexistent", data)


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_role_not_found(mock_repo, service):
    """删除不存在的角色抛出 NotFoundException。"""
    mock_repo.get_role_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.delete_role("nonexistent")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_user_permissions_no_role(mock_user_repo, service):
    """用户无角色时返回空权限列表。"""
    mock_user_repo.get_role_id = AsyncMock(return_value=None)

    result = await service.get_user_permissions("user-no-role")

    assert result == []


@pytest.mark.asyncio
@patch(USER_REPO)
@patch(REPO)
async def test_assign_user_role_not_found(
    mock_repo, mock_user_repo, service
):
    """分配不存在的角色抛出 NotFoundException。"""
    mock_repo.get_role_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.assign_user_role("user-1", "nonexistent")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_assign_user_role_none(mock_user_repo, service):
    """取消用户角色（设为 None）。"""
    mock_user_repo.set_role_id = AsyncMock()

    await service.assign_user_role("user-1", None)

    mock_user_repo.set_role_id.assert_awaited_once_with(
        service.session, "user-1", None
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_create_role(mock_repo, service):
    """创建角色，自动设置 sort_order。"""
    mock_repo.get_role_by_name = AsyncMock(return_value=None)
    mock_repo.get_max_sort_order = AsyncMock(return_value=4)

    async def _fake_create(session, role):
        role.id = "new-role-id"
        role.created_at = datetime.now(timezone.utc)
        role.updated_at = None

    mock_repo.create_role = AsyncMock(side_effect=_fake_create)

    data = RoleCreate(
        name="测试角色",
        description="测试描述",
        permissions=["admin/users/*"],
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
        permissions=[],
    )
    with pytest.raises(ConflictException):
        await service.create_role(data)


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
@patch(REPO)
async def test_update_role(
    mock_repo, mock_user_repo, mock_auth_repo, service
):
    """更新角色名称和权限。"""
    role = _make_role("旧名称", role_id="r1")
    mock_repo.get_role_by_id = AsyncMock(return_value=role)
    mock_repo.get_role_by_name = AsyncMock(return_value=None)
    mock_repo.update_role = AsyncMock()
    mock_user_repo.list_by_role_id = AsyncMock(return_value=[])
    mock_auth_repo.delete_refresh_tokens_by_user = AsyncMock()

    data = RoleUpdate(
        role_id="r1",
        name="新名称",
        permissions=["admin/users/*"],
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

    data = RoleUpdate(role_id="r-sys", name="试图改名")
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
            "admin/users/*",
            "admin/content/*",
        ]
    )

    result = await service.get_user_permissions("user-1")

    assert "admin/users/*" in result
    assert "admin/content/*" in result
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

    from api.admin.rbac.schemas import RoleReorder

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


@pytest.mark.asyncio
@patch(REPO)
async def test_create_role_with_merge_from(mock_repo, service):
    """使用 merge_from 合并角色权限创建新角色。"""
    mock_repo.get_role_by_name = AsyncMock(side_effect=[
        None,  # 检查名称唯一性
        _make_role("角色A", permissions=["admin/users/*", "admin/content/*"]),
        _make_role("角色B", permissions=["admin/content/*", "admin/rbac/*"]),
    ])
    mock_repo.get_max_sort_order = AsyncMock(return_value=2)

    async def _fake_create(session, role):
        role.id = "new-merged"
        role.created_at = datetime.now(timezone.utc)
        role.updated_at = None

    mock_repo.create_role = AsyncMock(side_effect=_fake_create)

    data = RoleCreate(
        name="合并角色",
        description="测试合并",
        permissions=[],
        merge_from=["角色A", "角色B"],
    )
    result = await service.create_role(data)

    assert result.name == "合并角色"
    # 权限取并集
    created_role = mock_repo.create_role.call_args[0][1]
    assert set(created_role.permissions) == {
        "admin/users/*", "admin/content/*", "admin/rbac/*"
    }


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
@patch(REPO)
async def test_update_role_permissions_kick_users(
    mock_repo, mock_user_repo, mock_auth_repo, service
):
    """权限变更时踢下线该角色下的所有用户。"""
    role = _make_role("编辑", role_id="r1", permissions=["admin/users/*"])
    mock_repo.get_role_by_id = AsyncMock(return_value=role)
    mock_repo.update_role = AsyncMock()

    user1 = MagicMock()
    user1.id = "user-1"
    user2 = MagicMock()
    user2.id = "user-2"
    mock_user_repo.list_by_role_id = AsyncMock(
        return_value=[user1, user2]
    )
    mock_auth_repo.delete_refresh_tokens_by_user = AsyncMock()

    data = RoleUpdate(
        role_id="r1",
        permissions=["admin/content/*"],
    )
    await service.update_role("r1", data)

    # 两个用户都被踢下线
    assert mock_auth_repo.delete_refresh_tokens_by_user.await_count == 2
