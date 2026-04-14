"""AuthService 补充测试。

覆盖二步验证、刷新令牌、自动注册等未覆盖分支。
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.auth.service import AuthService
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    TooManyRequestsException,
    UnauthorizedException,
)

AUTH_REPO = "api.auth.service.repository"
USER_REPO = "api.auth.service.user_repo"
RBAC_REPO = "api.auth.service.rbac_repo"
SMS_SEND = "api.auth.service.send_sms_code"
DECRYPT_PW = "api.auth.service.decrypt_password"


@pytest.fixture
def service(mock_session) -> AuthService:
    """构建 AuthService 实例。"""
    return AuthService(mock_session)


# ---- register: 用户名冲突 ----


@patch(SMS_SEND, new_callable=AsyncMock)
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_register_username_conflict(
    mock_repo, mock_user_repo, mock_sms, service, sample_user
):
    """注册失败：用户名已被使用。"""
    mock_repo.verify_sms_code = AsyncMock()
    mock_user_repo.get_by_phone = AsyncMock(return_value=None)
    existing = sample_user(username="taken")
    mock_user_repo.get_by_username = AsyncMock(return_value=existing)

    with pytest.raises(ConflictException):
        await service.register(
            phone="+8613900139000",
            code="123456",
            username="taken",
        )


# ---- register: 无密码、无用户名 ----


@patch(SMS_SEND, new_callable=AsyncMock)
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_register_no_password_no_username(
    mock_repo, mock_user_repo, mock_sms, service, sample_user
):
    """注册成功（不设置密码和用户名）。"""
    mock_repo.verify_sms_code = AsyncMock()
    mock_user_repo.get_by_phone = AsyncMock(return_value=None)
    new_user = sample_user(phone="+8613900139000")
    mock_user_repo.create = AsyncMock(return_value=new_user)

    with patch.object(service, "_get_visitor_role", return_value=None):
        result = await service.register(
            phone="+8613900139000", code="123456"
        )

    assert result.phone == "+8613900139000"


# ---- login: 无效凭据 ----


async def test_login_no_credentials(service):
    """未提供有效凭据抛出异常。"""
    with pytest.raises(UnauthorizedException):
        await service.login()


# ---- login: phone + password ----


@patch(DECRYPT_PW, return_value="correct")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_phone_password_success(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """手机号 + 密码登录成功。"""
    user = sample_user(
        phone="+8613800138000",
        password_hash="hashed",
        two_factor_enabled=False,
    )
    mock_user_repo.get_by_phone = AsyncMock(return_value=user)

    with patch("api.auth.service.verify_password", return_value=True):
        result_user, step = await service.login(
            phone="+8613800138000",
            encrypted_password="enc",
            nonce="n",
        )

    assert result_user == user
    assert step is None


@patch(DECRYPT_PW, return_value="any")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_phone_not_found(
    mock_repo, mock_user_repo, mock_decrypt, service
):
    """手机号不存在抛出异常。"""
    mock_user_repo.get_by_phone = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.login(
            phone="+8613800138000",
            encrypted_password="enc",
            nonce="n",
        )


@patch(DECRYPT_PW, return_value="any")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_username_not_found(
    mock_repo, mock_user_repo, mock_decrypt, service
):
    """用户名不存在抛出异常。"""
    mock_user_repo.get_by_username = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.login(
            username="nonexistent",
            encrypted_password="enc",
            nonce="n",
        )


# ---- login: 无密码 ----


@patch(DECRYPT_PW, return_value="any")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_no_password_hash(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """用户未设置密码抛出异常。"""
    user = sample_user(password_hash=None)
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    with pytest.raises(UnauthorizedException):
        await service.login(
            username="testuser",
            encrypted_password="enc",
            nonce="n",
        )


# ---- SMS login: 自动注册 ----


@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_sms_auto_register(
    mock_repo, mock_user_repo, service, mock_session
):
    """手机号验证码登录时，未注册用户自动注册。"""
    mock_repo.verify_sms_code = AsyncMock()
    mock_user_repo.get_by_phone = AsyncMock(return_value=None)

    # mock _auto_register 内部调用
    mock_session.refresh = AsyncMock()
    new_user = MagicMock()
    new_user.is_active = True

    with patch("api.auth.service.settings") as mock_settings:
        mock_settings.default_storage_quota_bytes = 104857600

        # 用 side_effect 使 session.refresh 设置 mock 属性
        async def fake_refresh(obj):
            """模拟 refresh。"""
            pass

        mock_session.refresh = AsyncMock(side_effect=fake_refresh)

        # 简单 patch _auto_register
        with patch.object(
            service, "_auto_register", return_value=new_user
        ):
            result_user, step = await service.login(
                phone="+8613900000000", code="123456"
            )

    assert result_user == new_user
    assert step is None


# ---- SMS login: 用户已禁用 ----


@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_sms_inactive_user(
    mock_repo, mock_user_repo, service, sample_user
):
    """短信登录已禁用用户抛出异常。"""
    mock_repo.verify_sms_code = AsyncMock()
    user = sample_user(is_active=False)
    mock_user_repo.get_by_phone = AsyncMock(return_value=user)

    with pytest.raises(UnauthorizedException):
        await service.login(
            phone="+8613800138000", code="123456"
        )


# ---- 2FA: TOTP 验证 ----


@patch(DECRYPT_PW, return_value="correct")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_2fa_totp_success(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """TOTP 二步验证成功。"""
    import pyotp

    secret = pyotp.random_base32()
    totp_code = pyotp.TOTP(secret).now()

    user = sample_user(
        two_factor_enabled=True,
        two_factor_method="totp",
        totp_secret=secret,
        password_hash="hashed",
    )
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    with patch("api.auth.service.verify_password", return_value=True):
        result_user, step = await service.login(
            username="testuser",
            encrypted_password="enc",
            nonce="n",
            totp=totp_code,
        )

    assert result_user == user
    assert step is None


@patch(DECRYPT_PW, return_value="correct")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_2fa_totp_wrong_code(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """TOTP 验证码不正确抛出异常。"""
    import pyotp

    secret = pyotp.random_base32()
    user = sample_user(
        two_factor_enabled=True,
        two_factor_method="totp",
        totp_secret=secret,
        password_hash="hashed",
    )
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    with patch("api.auth.service.verify_password", return_value=True):
        with pytest.raises(
            UnauthorizedException
        ):
            await service.login(
                username="testuser",
                encrypted_password="enc",
                nonce="n",
                totp="000000",
            )


# ---- 2FA: SMS 备选 ----


@patch(DECRYPT_PW, return_value="correct")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_2fa_sms_code(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """二步验证使用短信验证码。"""
    user = sample_user(
        two_factor_enabled=True,
        two_factor_method="sms",
        password_hash="hashed",
    )
    mock_user_repo.get_by_username = AsyncMock(return_value=user)
    mock_repo.verify_sms_code = AsyncMock()

    with patch("api.auth.service.verify_password", return_value=True):
        result_user, step = await service.login(
            username="testuser",
            encrypted_password="enc",
            nonce="n",
            sms_code_2fa="654321",
        )

    assert result_user == user
    assert step is None
    mock_repo.verify_sms_code.assert_awaited_once()


# ---- refresh ----


@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_refresh_success(
    mock_repo, mock_user_repo, service, sample_user
):
    """刷新令牌续签成功。"""
    token = MagicMock()
    token.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    token.user_id = "user-1"
    mock_repo.get_refresh_token_by_hash = AsyncMock(
        return_value=token
    )
    mock_repo.revoke_refresh_token_by_hash = AsyncMock()
    user = sample_user(id="user-1", is_active=True)
    mock_user_repo.get_by_id = AsyncMock(return_value=user)

    result = await service.refresh("hash123")

    assert result == user


@patch(AUTH_REPO)
async def test_refresh_token_not_found(mock_repo, service):
    """令牌不存在抛出异常。"""
    mock_repo.get_refresh_token_by_hash = AsyncMock(
        return_value=None
    )

    with pytest.raises(UnauthorizedException):
        await service.refresh("nonexistent")


@patch(AUTH_REPO)
async def test_refresh_token_expired(mock_repo, service):
    """令牌已过期抛出异常。"""
    token = MagicMock()
    token.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    mock_repo.get_refresh_token_by_hash = AsyncMock(
        return_value=token
    )

    with pytest.raises(UnauthorizedException):
        await service.refresh("expired")


@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_refresh_user_not_found(
    mock_repo, mock_user_repo, service
):
    """令牌对应的用户不存在抛出异常。"""
    token = MagicMock()
    token.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    token.user_id = "user-1"
    mock_repo.get_refresh_token_by_hash = AsyncMock(
        return_value=token
    )
    mock_repo.revoke_refresh_token_by_hash = AsyncMock()
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(UnauthorizedException):
        await service.refresh("hash123")


@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_refresh_user_inactive(
    mock_repo, mock_user_repo, service, sample_user
):
    """令牌对应的用户已禁用抛出异常。"""
    token = MagicMock()
    token.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    token.user_id = "user-1"
    mock_repo.get_refresh_token_by_hash = AsyncMock(
        return_value=token
    )
    mock_repo.revoke_refresh_token_by_hash = AsyncMock()
    user = sample_user(id="user-1", is_active=False)
    mock_user_repo.get_by_id = AsyncMock(return_value=user)

    with pytest.raises(UnauthorizedException):
        await service.refresh("hash123")


# ---- save_refresh_token_hash ----


@patch(AUTH_REPO)
async def test_save_refresh_token_hash(mock_repo, service):
    """保存刷新令牌哈希。"""
    mock_repo.save_refresh_token = AsyncMock()

    await service.save_refresh_token_hash(
        "user-1", "token_hash_123", expire_days=7
    )

    mock_repo.save_refresh_token.assert_awaited_once()


# ---- build_user_response ----


@patch(RBAC_REPO)
@patch(AUTH_REPO)
async def test_build_user_response(
    mock_repo, mock_rbac_repo, service, sample_user
):
    """构建用户响应对象。"""
    user = sample_user(id="user-1", role_id="role-x")
    mock_rbac_repo.get_permissions_by_role = AsyncMock(
        return_value=["user:read"]
    )
    role_mock = MagicMock()
    role_mock.name = "组1"
    mock_rbac_repo.get_role_by_id = AsyncMock(
        return_value=role_mock
    )

    result = await service.build_user_response(user)

    assert result.id == "user-1"
    assert "user:read" in result.permissions
    assert result.role_id == user.role_id


# ---- send_code: 每小时上限 ----


@patch(AUTH_REPO)
async def test_send_code_hourly_limit(mock_repo, service):
    """每小时超过 5 次抛出异常。"""
    mock_repo.get_latest_sms_code = AsyncMock(return_value=None)
    mock_repo.count_recent_sms = AsyncMock(return_value=5)

    with pytest.raises(TooManyRequestsException):
        await service.send_code("+8613800138000")


# ---- send_code: 生产环境返回 None ----


@patch(SMS_SEND, new_callable=AsyncMock)
@patch(AUTH_REPO)
async def test_send_code_production_returns_none(
    mock_repo, mock_sms, service
):
    """生产环境发送验证码返回 None。"""
    mock_repo.get_latest_sms_code = AsyncMock(return_value=None)
    mock_repo.count_recent_sms = AsyncMock(return_value=0)
    mock_repo.delete_expired_sms_codes = AsyncMock()
    mock_repo.create_sms_code = AsyncMock()

    with patch("api.auth.service.settings") as mock_settings:
        mock_settings.DEBUG = False
        result = await service.send_code("+8613800138000")

    assert result is None
