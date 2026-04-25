"""Admin Service 单元测试。

测试 AdminService 的用户管理业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.user.service import AdminService
from api.admin.user.schemas import UserAdminUpdate
from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.user.models import User


def _make_user(
    user_id: str = "user-1",
    is_active: bool = True,
) -> User:
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


USER_REPO = "api.admin.user.service.user_repo"
RBAC_REPO = "api.admin.user.service.rbac_repo"
AUTH_REPO = "api.admin.user.service.auth_repo"
DOC_REPO = "api.admin.user.service.doc_repo"


@pytest.fixture
def service() -> AdminService:
    """构建 AdminService 实例，注入 mock session。"""
    session = AsyncMock()
    return AdminService(session)


@pytest.mark.asyncio
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


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_users_success(
    mock_user_repo, mock_rbac_repo, service
):
    """分页查询用户列表。"""
    users = [_make_user("u1"), _make_user("u2")]
    mock_user_repo.list_users = AsyncMock(
        return_value=(users, 2)
    )
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=None
    )

    result, total = await service.list_users(None, 0, 10)

    assert total == 2
    assert len(result) == 2
    assert result[0].id == "u1"
    mock_user_repo.list_users.assert_called_once_with(
        service.session, 0, 10, None
    )


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_users_with_search(
    mock_user_repo, mock_rbac_repo, service
):
    """按关键词筛选用户列表。"""
    user = _make_user("u1")
    mock_user_repo.list_users = AsyncMock(
        return_value=([user], 1)
    )
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=None
    )

    result, total = await service.list_users("test", 0, 10)

    assert total == 1
    mock_user_repo.list_users.assert_called_once_with(
        service.session, 0, 10, "test"
    )


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_user_not_found(mock_user_repo, service):
    """获取不存在的用户抛出 NotFoundException。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_user("nonexistent")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_update_user_not_found(
    mock_user_repo, service
):
    """更新不存在的用户抛出 NotFoundException。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)
    data = UserAdminUpdate(user_id="x", is_active=False)

    with pytest.raises(NotFoundException):
        await service.update_user("x", data)


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_update_user_deactivate(
    mock_user_repo, mock_rbac_repo, mock_auth_repo, service
):
    """禁用用户时撤销 refresh token。"""
    user = _make_user("u1", is_active=True)
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock()
    mock_auth_repo.revoke_user_refresh_tokens = AsyncMock()
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=[]
    )
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=None
    )

    data = UserAdminUpdate(user_id="u1", is_active=False)
    result = await service.update_user("u1", data)

    assert result.is_active is False
    mock_auth_repo.revoke_user_refresh_tokens.assert_called_once_with(
        service.session, "u1"
    )


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_reset_password_not_found(
    mock_user_repo, service
):
    """重置不存在用户的密码抛出 NotFoundException。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.reset_password("x", "enc", "nonce")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_assign_role_not_found(
    mock_user_repo, service
):
    """分配角色时用户不存在抛出 NotFoundException。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)
    mock_user_repo.set_role_id = AsyncMock()

    with pytest.raises(NotFoundException):
        await service.assign_role("nonexistent", None)


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_assign_role_invalid_role(
    mock_user_repo, mock_rbac_repo, service
):
    """分配不存在的角色抛出 NotFoundException。"""
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.assign_role("u1", "bad-role")


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(AUTH_REPO)
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_delete_user_superuser_forbidden(
    mock_user_repo,
    mock_rbac_repo,
    mock_auth_repo,
    mock_doc_repo,
    service,
):
    """删除超级管理员抛出 ForbiddenException。"""
    user = _make_user("u1")
    user.role_id = "role-su"
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    role = MagicMock()
    role.name = "superuser"
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=role
    )

    with pytest.raises(ForbiddenException):
        await service.delete_user("u1")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_delete_user_not_found(
    mock_user_repo, service
):
    """删除不存在的用户抛出 NotFoundException。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.delete_user("nonexistent")
