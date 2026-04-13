"""AuthService 单元测试。

测试注册、登录、短信验证码发送、二步验证等业务逻辑。
使用 mock 隔离数据库层和外部依赖。
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.auth.models import SmsCode
from app.auth.service import AuthService
from app.core.exceptions import (
    ConflictException,
    TooManyRequestsException,
    UnauthorizedException,
)

AUTH_REPO = "app.auth.service.repository"
USER_REPO = "app.auth.service.user_repo"
RBAC_REPO = "app.auth.service.rbac_repo"
SMS_SEND = "app.auth.service.send_sms_code"
DECRYPT_PW = "app.auth.service.decrypt_password"


@pytest.fixture
def service(mock_session) -> AuthService:
    """构建 AuthService 实例，注入 mock session。"""
    return AuthService(mock_session)


# ---- register ----


@pytest.mark.asyncio
@patch(DECRYPT_PW, return_value="secret123")
@patch(SMS_SEND, new_callable=AsyncMock)
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_register_success(
    mock_repo, mock_user_repo, mock_sms, mock_decrypt, service, sample_user
):
    """注册成功：验证码通过、手机号未注册。"""
    mock_repo.verify_sms_code = AsyncMock()
    mock_user_repo.get_by_phone = AsyncMock(return_value=None)
    mock_user_repo.get_by_username = AsyncMock(return_value=None)

    new_user = sample_user(phone="+8613900139000")
    mock_user_repo.create = AsyncMock(return_value=new_user)

    with patch.object(service, "_get_visitor_role", return_value=None):
        result = await service.register(
            phone="+8613900139000",
            code="123456",
            username="newuser",
            encrypted_password="encrypted_data",
            nonce="test_nonce",
        )

    assert result.phone == "+8613900139000"
    mock_repo.verify_sms_code.assert_awaited_once()
    mock_user_repo.create.assert_awaited_once()


@pytest.mark.asyncio
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_register_phone_already_exists(
    mock_repo, mock_user_repo, service, sample_user
):
    """注册失败：手机号已注册。"""
    mock_repo.verify_sms_code = AsyncMock()
    existing = sample_user(phone="+8613800138000")
    mock_user_repo.get_by_phone = AsyncMock(return_value=existing)

    with pytest.raises(ConflictException) as exc_info:
        await service.register(
            phone="+8613800138000", code="123456"
        )
    assert exc_info.value.code == "PHONE_ALREADY_REGISTERED"


# ---- login: username + password ----


@pytest.mark.asyncio
@patch(DECRYPT_PW, return_value="correct")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_username_password_success(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """用户名密码登录成功。"""
    user = sample_user(
        username="testuser",
        password_hash="hashed",
        two_factor_enabled=False,
    )
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    with patch(
        "app.auth.service.verify_password", return_value=True
    ):
        result_user, step = await service.login(
            username="testuser",
            encrypted_password="enc",
            nonce="n",
        )

    assert result_user == user
    assert step is None


@pytest.mark.asyncio
@patch(DECRYPT_PW, return_value="wrong")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_wrong_password(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """密码错误应抛出 UnauthorizedException。"""
    user = sample_user(password_hash="hashed")
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    with patch(
        "app.auth.service.verify_password", return_value=False
    ):
        with pytest.raises(UnauthorizedException) as exc_info:
            await service.login(
                username="testuser",
                encrypted_password="enc",
                nonce="n",
            )
        assert exc_info.value.code == "PASSWORD_INCORRECT"


@pytest.mark.asyncio
@patch(DECRYPT_PW, return_value="any")
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_inactive_user(
    mock_repo, mock_user_repo, mock_decrypt, service, sample_user
):
    """已禁用用户登录应抛出 UnauthorizedException。"""
    user = sample_user(is_active=False, password_hash="hashed")
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    with pytest.raises(UnauthorizedException):
        await service.login(
            username="testuser",
            encrypted_password="enc",
            nonce="n",
        )


# ---- login: phone + sms ----


@pytest.mark.asyncio
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_phone_sms_success(
    mock_repo, mock_user_repo, service, sample_user
):
    """手机号短信验证码登录成功。"""
    mock_repo.verify_sms_code = AsyncMock()
    user = sample_user(phone="+8613800138000")
    mock_user_repo.get_by_phone = AsyncMock(return_value=user)

    result_user, step = await service.login(
        phone="+8613800138000", code="123456"
    )

    assert result_user == user
    assert step is None
    mock_repo.verify_sms_code.assert_awaited_once()


# ---- send_code ----


@pytest.mark.asyncio
@patch(SMS_SEND, new_callable=AsyncMock)
@patch(AUTH_REPO)
async def test_send_code_success(mock_repo, mock_sms, service):
    """发送验证码成功。"""
    mock_repo.get_latest_sms_code = AsyncMock(return_value=None)
    mock_repo.count_recent_sms = AsyncMock(return_value=0)
    mock_repo.delete_expired_sms_codes = AsyncMock()
    mock_repo.create_sms_code = AsyncMock()

    with patch("app.auth.service.settings") as mock_settings:
        mock_settings.DEBUG = True
        result = await service.send_code("+8613800138000")

    assert result is not None
    assert len(result) == 6
    mock_repo.create_sms_code.assert_awaited_once()


@pytest.mark.asyncio
@patch(AUTH_REPO)
async def test_send_code_rate_limited(
    mock_repo, service, sample_sms_code
):
    """60 秒内重复发送应抛出 TooManyRequestsException。"""
    recent_code = sample_sms_code(
        created_at=datetime.now(timezone.utc) - timedelta(seconds=10)
    )
    mock_repo.get_latest_sms_code = AsyncMock(
        return_value=recent_code
    )

    with pytest.raises(TooManyRequestsException):
        await service.send_code("+8613800138000")


# ---- 2FA flow ----


@pytest.mark.asyncio
@patch(DECRYPT_PW, return_value="correct")
@patch(SMS_SEND, new_callable=AsyncMock)
@patch(USER_REPO)
@patch(AUTH_REPO)
async def test_login_2fa_required(
    mock_repo, mock_user_repo, mock_sms, mock_decrypt, service, sample_user
):
    """二步验证启用时返回 2fa_required。"""
    user = sample_user(
        two_factor_enabled=True,
        two_factor_method="sms",
        password_hash="hashed",
    )
    mock_user_repo.get_by_username = AsyncMock(return_value=user)

    # send_code 内部需要的 mock
    mock_repo.get_latest_sms_code = AsyncMock(return_value=None)
    mock_repo.count_recent_sms = AsyncMock(return_value=0)
    mock_repo.delete_expired_sms_codes = AsyncMock()
    mock_repo.create_sms_code = AsyncMock()

    with patch(
        "app.auth.service.verify_password", return_value=True
    ), patch("app.auth.service.settings") as mock_settings:
        mock_settings.DEBUG = True
        result_user, step = await service.login(
            username="testuser",
            encrypted_password="enc",
            nonce="n",
        )

    assert result_user == user
    assert step == "2fa_required"
