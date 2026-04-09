"""AdminService 补充测试。

覆盖 list_users、get_user、update_user、reset_password、
assign_groups、force_logout、get_user_model 等未覆盖分支。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.admin.service import AdminService
from app.core.exceptions import ForbiddenException, NotFoundException
from app.user.models import User
from app.user.schemas import UserAdminUpdate

USER_REPO = "app.admin.service.user_repo"
RBAC_REPO = "app.admin.service.rbac_repo"
AUTH_REPO = "app.admin.service.auth_repo"


def _make_user(
    user_type: str = "guest",
    is_superuser: bool = False,
    user_id: str = "user-1",
    is_active: bool = True,
) -> MagicMock:
    """创建模拟 User 对象。"""
    u = MagicMock(spec=User)
    u.id = user_id
    u.phone = "13800000001"
    u.username = "testuser"
    u.user_type = user_type
    u.is_superuser = is_superuser
    u.is_active = is_active
    u.two_factor_enabled = False
    u.storage_quota = 104857600
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = None
    return u


@pytest.fixture
def service() -> AdminService:
    """构建 AdminService 实例。"""
    session = AsyncMock()
    return AdminService(session)


# ---- list_users ----


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_users_no_filter(
    mock_user_repo, mock_rbac_repo, service
):
    """分页查询用户列表（无过滤）。"""
    user = _make_user()
    mock_result_count = MagicMock()
    mock_result_count.scalar_one.return_value = 1
    mock_result_list = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [user]
    mock_result_list.scalars.return_value = mock_scalars

    service.session.execute = AsyncMock(
        side_effect=[mock_result_count, mock_result_list]
    )
    mock_rbac_repo.get_user_permissions = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_user_group_ids = AsyncMock(
        return_value=[]
    )

    users, total = await service.list_users(
        user_type_filter=None,
        search=None,
        offset=0,
        limit=10,
    )

    assert total == 1
    assert len(users) == 1


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_users_with_filter_and_search(
    mock_user_repo, mock_rbac_repo, service
):
    """分页查询（按类型和搜索词）。"""
    mock_result_count = MagicMock()
    mock_result_count.scalar_one.return_value = 0
    mock_result_list = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result_list.scalars.return_value = mock_scalars

    service.session.execute = AsyncMock(
        side_effect=[mock_result_count, mock_result_list]
    )

    users, total = await service.list_users(
        user_type_filter="staff",
        search="张三",
        offset=0,
        limit=10,
    )

    assert total == 0
    assert len(users) == 0


# ---- get_user ----


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_get_user_success(
    mock_user_repo, mock_rbac_repo, service
):
    """获取用户详情。"""
    user = _make_user(user_id="u1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_rbac_repo.get_user_permissions = AsyncMock(
        return_value=["user:read"]
    )
    mock_rbac_repo.get_user_group_ids = AsyncMock(
        return_value=["g1"]
    )

    result = await service.get_user("u1")

    assert result.id == "u1"


@patch(USER_REPO)
async def test_get_user_not_found(mock_user_repo, service):
    """用户不存在抛出异常。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_user("nonexistent")


# ---- update_user ----


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_update_user_success(
    mock_user_repo, mock_rbac_repo, service
):
    """管理员更新用户信息。"""
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock()
    mock_rbac_repo.get_user_permissions = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_user_group_ids = AsyncMock(
        return_value=[]
    )

    data = UserAdminUpdate(is_active=False, storage_quota=500)
    result = await service.update_user("user-1", data)

    assert user.is_active is False
    assert user.storage_quota == 500
    mock_user_repo.update.assert_awaited_once()


@patch(USER_REPO)
async def test_update_user_not_found(mock_user_repo, service):
    """更新不存在的用户抛出异常。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    data = UserAdminUpdate(is_active=True)
    with pytest.raises(NotFoundException):
        await service.update_user("nonexistent", data)


# ---- change_user_type: 非法类型 ----


async def test_change_user_type_invalid(service):
    """非法用户类型抛出异常。"""
    with pytest.raises(ForbiddenException):
        await service.change_user_type("u1", "admin")


@patch(USER_REPO)
async def test_change_user_type_not_found(
    mock_user_repo, service
):
    """修改不存在用户的类型。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.change_user_type("nonexistent", "staff")


# ---- reset_password ----


@patch(USER_REPO)
async def test_reset_password_success(mock_user_repo, service):
    """重置用户密码。"""
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock()

    with patch("app.admin.service.hash_password", return_value="new_hash"):
        await service.reset_password("user-1", "newpassword")

    assert user.password_hash == "new_hash"
    mock_user_repo.update.assert_awaited_once()


@patch(USER_REPO)
async def test_reset_password_not_found(mock_user_repo, service):
    """重置不存在用户的密码。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.reset_password("nonexistent", "newpass")


# ---- assign_groups ----


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_assign_groups_success(
    mock_user_repo, mock_rbac_repo, service
):
    """分配用户权限组。"""
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_rbac_repo.get_user_permissions = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_user_group_ids = AsyncMock(
        return_value=["g1"]
    )

    with patch("app.admin.service.RbacService") as MockRbac:
        mock_rbac_svc = AsyncMock()
        MockRbac.return_value = mock_rbac_svc

        result = await service.assign_groups(
            "user-1", ["g1"], ["group:manage"], False
        )

    assert result.id == "user-1"


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_assign_groups_user_not_found(
    mock_user_repo, mock_rbac_repo, service
):
    """分配权限组时用户不存在。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with patch("app.admin.service.RbacService") as MockRbac:
        mock_rbac_svc = AsyncMock()
        MockRbac.return_value = mock_rbac_svc

        with pytest.raises(NotFoundException):
            await service.assign_groups(
                "nonexistent", ["g1"], [], False
            )


# ---- force_logout ----


@patch(AUTH_REPO)
async def test_force_logout(mock_auth_repo, service):
    """强制下线用户。"""
    mock_auth_repo.revoke_user_refresh_tokens = AsyncMock()

    await service.force_logout("user-1")

    mock_auth_repo.revoke_user_refresh_tokens.assert_awaited_once()


# ---- check_target_permission: member 无权限 ----


async def test_check_target_no_member_manage(service):
    """无 member:manage 权限不能管理会员。"""
    target = _make_user(user_type="member")

    with pytest.raises(ForbiddenException):
        await service.check_target_permission(
            target, operator_permissions=[], is_superuser=False
        )


# ---- get_user_model ----


@patch(USER_REPO)
async def test_get_user_model_success(mock_user_repo, service):
    """获取用户 ORM 对象。"""
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)

    result = await service.get_user_model("user-1")

    assert result == user


@patch(USER_REPO)
async def test_get_user_model_not_found(mock_user_repo, service):
    """用户不存在抛出异常。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_user_model("nonexistent")
