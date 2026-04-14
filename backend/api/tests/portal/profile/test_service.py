"""ProfileService 单元测试。

测试用户资料查询、密码修改、手机号修改等业务逻辑。
使用 mock 隔离数据库层。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictException, NotFoundException
from api.portal.profile.schemas import (
    PasswordChange,
    PhoneChange,
    UserUpdate,
)
from api.portal.profile.service import ProfileService

USER_REPO = "api.portal.profile.service.repository"
AUTH_REPO = "api.portal.profile.service.auth_repo"
RBAC_REPO = "api.portal.profile.service.rbac_repo"


@pytest.fixture
def service(mock_session) -> ProfileService:
    """构建 ProfileService 实例，注入 mock session。"""
    return ProfileService(mock_session)


# ---- get_user_response ----


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_get_user_response_success(
    mock_repo, mock_rbac_repo, service, sample_user
):
    """获取用户响应，包含权限和角色名。"""
    user = sample_user(id="user-001", role_id="role-x")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=["user:read", "doc:read"]
    )
    role_mock = MagicMock()
    role_mock.name = "学生角色"
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=role_mock
    )

    result = await service.get_user_response("user-001")

    assert result.id == "user-001"
    assert "user:read" in result.permissions
    assert result.role_name == "学生角色"


# ---- get_user: not found ----


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_user_not_found(mock_repo, service):
    """用户不存在抛出异常。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_user("nonexistent")


# ---- update_profile ----


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_update_profile_username(
    mock_repo, service, sample_user
):
    """更新用户名成功。"""
    user = sample_user(id="user-1", username="old")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.get_by_username = AsyncMock(return_value=None)
    mock_repo.update = AsyncMock(return_value=user)

    data = UserUpdate(username="newname")
    result = await service.update_profile("user-1", data)

    assert result == user
    mock_repo.update.assert_awaited_once()


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_update_profile_username_conflict(
    mock_repo, service, sample_user
):
    """用户名被他人使用抛出异常。"""
    user = sample_user(id="user-1")
    other = sample_user(id="user-2", username="taken")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.get_by_username = AsyncMock(return_value=other)

    data = UserUpdate(username="taken")

    with pytest.raises(ConflictException):
        await service.update_profile("user-1", data)


# ---- change_password ----


@pytest.mark.asyncio
@patch("api.portal.profile.service.decrypt_password", return_value="newpass123")
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_password_success(
    mock_repo, mock_auth_repo, mock_decrypt, service, sample_user
):
    """修改密码成功。"""
    user = sample_user(phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.verify_sms_code = AsyncMock()
    mock_repo.update = AsyncMock(return_value=user)

    data = PasswordChange(
        phone="+8613800138000",
        code="123456",
        encrypted_password="enc_data",
        nonce="test_nonce",
    )

    with patch(
        "api.portal.profile.service.hash_password",
        return_value="new_hash",
    ):
        await service.change_password("user-001", data)

    mock_auth_repo.verify_sms_code.assert_awaited_once()
    mock_repo.update.assert_awaited_once()


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_change_password_phone_mismatch(
    mock_repo, service, sample_user
):
    """手机号不匹配应抛出 ConflictException。"""
    user = sample_user(phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)

    data = PasswordChange(
        phone="+8613900139000",
        code="123456",
        encrypted_password="enc_data",
        nonce="test_nonce",
    )

    with pytest.raises(ConflictException):
        await service.change_password("user-001", data)


# ---- change_phone ----


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_phone_success(
    mock_repo, mock_auth_repo, service, sample_user
):
    """修改手机号成功。"""
    user = sample_user(id="user-001", phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.verify_sms_code = AsyncMock()
    mock_repo.get_by_phone = AsyncMock(return_value=None)
    mock_repo.update = AsyncMock(return_value=user)

    data = PhoneChange(
        new_phone="+8613900139000", code="654321"
    )
    result = await service.change_phone("user-001", data)

    assert result == user
    mock_auth_repo.verify_sms_code.assert_awaited_once()


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_phone_already_used(
    mock_repo, mock_auth_repo, service, sample_user
):
    """新手机号已被其他用户使用应抛出 ConflictException。"""
    user = sample_user(id="user-001", phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    other_user = sample_user(id="user-002")
    mock_repo.get_by_phone = AsyncMock(return_value=other_user)

    data = PhoneChange(
        new_phone="+8613900139000", code="654321"
    )

    with pytest.raises(ConflictException):
        await service.change_phone("user-001", data)
