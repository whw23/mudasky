"""UserService 补充测试。

覆盖 confirm_2fa_totp、enable_2fa_sms、list_users、
update_profile 等未覆盖分支。
"""

from unittest.mock import AsyncMock, patch

import pyotp
import pytest

from app.core.exceptions import ConflictException, NotFoundException
from api.portal.user.schemas import UserUpdate
from api.portal.user.service import UserService

USER_REPO = "api.portal.user.service.repository"
AUTH_REPO = "api.portal.user.service.auth_repo"
RBAC_REPO = "api.portal.user.service.rbac_repo"


@pytest.fixture
def service(mock_session) -> UserService:
    """构建 UserService 实例。"""
    return UserService(mock_session)


# ---- get_user: not found ----


@patch(USER_REPO)
async def test_get_user_not_found(mock_repo, service):
    """用户不存在抛出异常。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_user("nonexistent")


# ---- update_profile ----


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


@patch(USER_REPO)
async def test_update_profile_same_username(
    mock_repo, service, sample_user
):
    """用户名属于自己不冲突。"""
    user = sample_user(id="user-1", username="myname")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.get_by_username = AsyncMock(return_value=user)
    mock_repo.update = AsyncMock(return_value=user)

    data = UserUpdate(username="myname")
    result = await service.update_profile("user-1", data)

    assert result == user


@patch(USER_REPO)
async def test_update_profile_no_change(
    mock_repo, service, sample_user
):
    """不修改用户名。"""
    user = sample_user(id="user-1")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.update = AsyncMock(return_value=user)

    data = UserUpdate()
    result = await service.update_profile("user-1", data)

    assert result == user


# ---- confirm_2fa_totp ----


@patch(USER_REPO)
async def test_confirm_2fa_totp_success(
    mock_repo, service, sample_user
):
    """确认启用 TOTP 成功。"""
    secret = pyotp.random_base32()
    code = pyotp.TOTP(secret).now()
    user = sample_user(totp_secret=secret)
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.update = AsyncMock(return_value=user)

    await service.confirm_2fa_totp("user-1", code)

    assert user.two_factor_enabled is True
    assert user.two_factor_method == "totp"


@patch(USER_REPO)
async def test_confirm_2fa_totp_no_secret(
    mock_repo, service, sample_user
):
    """未先启用 TOTP 抛出异常。"""
    user = sample_user(totp_secret=None)
    mock_repo.get_by_id = AsyncMock(return_value=user)

    with pytest.raises(ConflictException):
        await service.confirm_2fa_totp("user-1", "123456")


@patch(USER_REPO)
async def test_confirm_2fa_totp_wrong_code(
    mock_repo, service, sample_user
):
    """TOTP 验证码不正确。"""
    secret = pyotp.random_base32()
    user = sample_user(totp_secret=secret)
    mock_repo.get_by_id = AsyncMock(return_value=user)

    with pytest.raises(ConflictException):
        await service.confirm_2fa_totp("user-1", "000000")


# ---- enable_2fa_sms ----


@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_enable_2fa_sms_success(
    mock_repo, mock_auth_repo, service, sample_user
):
    """启用短信二步验证成功。"""
    user = sample_user(phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.verify_sms_code = AsyncMock()
    mock_repo.update = AsyncMock(return_value=user)

    await service.enable_2fa_sms(
        "user-1", "+8613800138000", "123456"
    )

    assert user.two_factor_enabled is True
    assert user.two_factor_method == "sms"
    assert user.totp_secret is None


@patch(USER_REPO)
async def test_enable_2fa_sms_no_phone(
    mock_repo, service, sample_user
):
    """未绑定手机号抛出异常。"""
    user = sample_user(phone=None)
    mock_repo.get_by_id = AsyncMock(return_value=user)

    with pytest.raises(ConflictException):
        await service.enable_2fa_sms("user-1", "+8613800138000", "123456")


@patch(USER_REPO)
async def test_enable_2fa_sms_phone_mismatch(
    mock_repo, service, sample_user
):
    """手机号不匹配抛出异常。"""
    user = sample_user(phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)

    with pytest.raises(ConflictException):
        await service.enable_2fa_sms(
            "user-1", "+8613900139000", "123456"
        )


# ---- disable_2fa: 手机号不匹配 ----


@patch(USER_REPO)
async def test_disable_2fa_phone_mismatch(
    mock_repo, service, sample_user
):
    """关闭 2FA 手机号不匹配。"""
    user = sample_user(phone="+8613800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)

    with pytest.raises(ConflictException):
        await service.disable_2fa(
            "user-1", "+8613900139000", "123456"
        )


# ---- list_users ----


@patch(USER_REPO)
async def test_list_users(mock_repo, service, sample_user):
    """分页查询用户列表。"""
    users = [sample_user(id="u1"), sample_user(id="u2")]
    mock_repo.list_users = AsyncMock(return_value=(users, 2))

    result_users, total = await service.list_users(
        offset=0, limit=10
    )

    assert total == 2
    assert len(result_users) == 2
    mock_repo.list_users.assert_awaited_once_with(
        service.session, 0, 10
    )
