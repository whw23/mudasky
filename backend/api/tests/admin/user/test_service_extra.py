"""AdminService 补充测试。

覆盖 list_users、get_user、update_user、reset_password、
assign_role、force_logout、get_user_model 等未覆盖分支。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.user.service import AdminService
from app.core.exceptions import NotFoundException
from app.db.user.models import User
from api.admin.user.schemas import UserAdminUpdate

USER_REPO = "api.admin.user.service.user_repo"
RBAC_REPO = "api.admin.user.service.rbac_repo"
AUTH_REPO = "api.admin.user.service.auth_repo"


def _make_user(
    user_id: str = "user-1",
    is_active: bool = True,
) -> MagicMock:
    """创建模拟 User 对象。"""
    u = MagicMock(spec=User)
    u.id = user_id
    u.phone = "13800000001"
    u.username = "testuser"
    u.is_active = is_active
    u.two_factor_enabled = False
    u.role_id = None
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
    mock_user_repo.list_users = AsyncMock(return_value=([user], 1))
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=None
    )

    users, total = await service.list_users(
        search=None,
        offset=0,
        limit=10,
    )

    assert total == 1
    assert len(users) == 1


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_users_with_search(
    mock_user_repo, mock_rbac_repo, service
):
    """分页查询（按搜索词）。"""
    mock_user_repo.list_users = AsyncMock(return_value=([], 0))

    users, total = await service.list_users(
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
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=["admin/users/list"]
    )
    role_mock = MagicMock()
    role_mock.name = "角色1"
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=role_mock
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
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=None
    )

    data = UserAdminUpdate(user_id="user-1", is_active=False, storage_quota=500)
    result = await service.update_user("user-1", data)

    assert user.is_active is False
    assert user.storage_quota == 500
    mock_user_repo.update.assert_awaited_once()


@patch(USER_REPO)
async def test_update_user_not_found(mock_user_repo, service):
    """更新不存在的用户抛出异常。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    data = UserAdminUpdate(user_id="nonexistent", is_active=True)
    with pytest.raises(NotFoundException):
        await service.update_user("nonexistent", data)


# ---- reset_password ----


@patch("api.admin.user.service.decrypt_password", return_value="newpassword")
@patch(USER_REPO)
async def test_reset_password_success(mock_user_repo, mock_decrypt, service):
    """重置用户密码。"""
    user = _make_user()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock()

    with patch("api.admin.user.service.hash_password", return_value="new_hash"):
        await service.reset_password("user-1", "enc_data", "test_nonce")

    assert user.password_hash == "new_hash"
    mock_user_repo.update.assert_awaited_once()


@patch("api.admin.user.service.decrypt_password", return_value="newpass")
@patch(USER_REPO)
async def test_reset_password_not_found(mock_user_repo, mock_decrypt, service):
    """重置不存在用户的密码。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.reset_password("nonexistent", "enc_data", "nonce")


# ---- assign_role ----


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_assign_role_success(
    mock_user_repo, mock_rbac_repo, service
):
    """分配用户角色。"""
    user = _make_user()
    role_mock = MagicMock()
    role_mock.name = "角色1"
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=role_mock
    )
    mock_user_repo.set_role_id = AsyncMock()
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=[]
    )

    result = await service.assign_role(
        "user-1", "r1"
    )

    assert result.id == "user-1"
    mock_user_repo.set_role_id.assert_awaited_once()


@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_assign_role_user_not_found(
    mock_user_repo, mock_rbac_repo, service
):
    """分配角色时用户不存在。"""
    role_mock = MagicMock()
    role_mock.name = "角色1"
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=role_mock
    )
    mock_user_repo.set_role_id = AsyncMock()
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.assign_role(
            "nonexistent", "r1"
        )


# ---- force_logout ----


@patch(AUTH_REPO)
async def test_force_logout(mock_auth_repo, service):
    """强制下线用户。"""
    mock_auth_repo.revoke_user_refresh_tokens = AsyncMock()

    await service.force_logout("user-1")

    mock_auth_repo.revoke_user_refresh_tokens.assert_awaited_once()


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
