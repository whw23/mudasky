"""UserService 单元测试。

测试用户信息查询、密码修改、手机号修改、双因素认证管理等业务。
使用 mock 隔离数据库层。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictException
from app.user.schemas import PasswordChange, PhoneChange
from app.user.service import UserService

USER_REPO = "app.user.service.repository"
AUTH_REPO = "app.user.service.auth_repo"
RBAC_REPO = "app.user.service.rbac_repo"


@pytest.fixture
def service(mock_session) -> UserService:
    """构建 UserService 实例，注入 mock session。"""
    return UserService(mock_session)


# ---- get_user_response ----


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_get_user_response_success(
    mock_repo, mock_rbac_repo, service, sample_user
):
    """获取用户响应，包含权限和权限组。"""
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
    assert "doc:read" in result.permissions
    assert result.role_id == user.role_id
    assert result.role_name == "学生角色"


# ---- change_password ----


@pytest.mark.asyncio
@patch("app.user.service.decrypt_password", return_value="newpass123")
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

    with patch("app.user.service.hash_password", return_value="new_hash"):
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
    mock_auth_repo.verify_sms_code = AsyncMock()
    other_user = sample_user(id="user-002")
    mock_repo.get_by_phone = AsyncMock(return_value=other_user)

    data = PhoneChange(
        new_phone="+8613900139000", code="654321"
    )

    with pytest.raises(ConflictException):
        await service.change_phone("user-001", data)


# ---- enable_2fa_totp ----


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_enable_2fa_totp_returns_secret(
    mock_repo, service, sample_user
):
    """启用 TOTP 二步验证返回密钥。"""
    user = sample_user()
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.update = AsyncMock(return_value=user)

    secret = await service.enable_2fa_totp("user-001")

    assert isinstance(secret, str)
    assert len(secret) > 0
    mock_repo.update.assert_awaited_once()


# ---- disable_2fa ----


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_disable_2fa_success(
    mock_repo, mock_auth_repo, service, sample_user
):
    """关闭二步验证成功。"""
    user = sample_user(
        phone="+8613800138000",
        two_factor_enabled=True,
        two_factor_method="totp",
    )
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.verify_sms_code = AsyncMock()
    mock_repo.update = AsyncMock(return_value=user)

    await service.disable_2fa(
        "user-001", "+8613800138000", "123456"
    )

    mock_auth_repo.verify_sms_code.assert_awaited_once()
    mock_repo.update.assert_awaited_once()
