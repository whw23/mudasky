"""TwoFactorService 单元测试。

覆盖 TOTP 启用/确认、短信 2FA 启用、2FA 关闭等业务逻辑。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pyotp
import pytest

from api.portal.profile.two_factor.service import TwoFactorService
from app.core.exceptions import ConflictException, NotFoundException

USER_REPO = "api.portal.profile.two_factor.service.repository"
AUTH_REPO = "api.portal.profile.two_factor.service.auth_repo"


@pytest.fixture
def service(mock_session) -> TwoFactorService:
    """构建 TwoFactorService 实例，注入 mock session。"""
    return TwoFactorService(mock_session)


def _make_user(**kwargs) -> MagicMock:
    """创建模拟 User 对象。"""
    from app.db.user.models import User

    user = MagicMock(spec=User)
    user.id = kwargs.get("id", "user-001")
    user.phone = kwargs.get("phone", "+86-13800138000")
    user.totp_secret = kwargs.get("totp_secret", None)
    user.two_factor_enabled = kwargs.get(
        "two_factor_enabled", False
    )
    user.two_factor_method = kwargs.get(
        "two_factor_method", None
    )
    return user


# ---- _get_user ----


class TestGetUser:
    """_get_user 内部方法测试。"""

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_user_not_found(self, mock_repo, service):
        """用户不存在时抛出 NotFoundException。"""
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundException):
            await service._get_user("nonexistent")

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_user_found(self, mock_repo, service):
        """用户存在时正常返回。"""
        user = _make_user()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        result = await service._get_user("user-001")

        assert result == user


# ---- enable_totp ----


class TestEnableTotp:
    """启用 TOTP 业务逻辑测试。"""

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_enable_totp_success(
        self, mock_repo, service
    ):
        """启用 TOTP 成功，返回密钥和用户。"""
        user = _make_user()
        mock_repo.get_by_id = AsyncMock(return_value=user)
        mock_repo.update = AsyncMock()

        secret, returned_user = await service.enable_totp(
            "user-001"
        )

        assert len(secret) > 0
        assert returned_user == user
        assert user.totp_secret == secret
        mock_repo.update.assert_awaited_once_with(
            service.session, user
        )

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_enable_totp_user_not_found(
        self, mock_repo, service
    ):
        """用户不存在时抛出异常。"""
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundException):
            await service.enable_totp("nonexistent")


# ---- confirm_totp ----


class TestConfirmTotp:
    """确认 TOTP 业务逻辑测试。"""

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_confirm_totp_success(
        self, mock_repo, service
    ):
        """验证码正确时确认启用。"""
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        user = _make_user(totp_secret=secret)
        mock_repo.get_by_id = AsyncMock(return_value=user)
        mock_repo.update = AsyncMock()

        await service.confirm_totp("user-001", valid_code)

        assert user.two_factor_enabled is True
        assert user.two_factor_method == "totp"
        mock_repo.update.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_confirm_totp_no_secret(
        self, mock_repo, service
    ):
        """未启用 TOTP（无密钥）时抛出 ConflictException。"""
        user = _make_user(totp_secret=None)
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with pytest.raises(ConflictException) as exc_info:
            await service.confirm_totp("user-001", "123456")

        assert exc_info.value.code == "TWO_FA_NOT_ENABLED"

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_confirm_totp_wrong_code(
        self, mock_repo, service
    ):
        """验证码错误时抛出 ConflictException。"""
        secret = pyotp.random_base32()
        user = _make_user(totp_secret=secret)
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with pytest.raises(ConflictException) as exc_info:
            await service.confirm_totp("user-001", "000000")

        assert exc_info.value.code == "TWO_FA_CODE_INCORRECT"


# ---- enable_sms ----


class TestEnableSms:
    """启用短信 2FA 业务逻辑测试。"""

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    @patch(USER_REPO)
    async def test_enable_sms_success(
        self, mock_repo, mock_auth, service
    ):
        """短信 2FA 启用成功。"""
        user = _make_user(phone="+86-13800138000")
        mock_repo.get_by_id = AsyncMock(return_value=user)
        mock_repo.update = AsyncMock()
        mock_auth.verify_sms_code = AsyncMock()

        await service.enable_sms(
            "user-001", "+86-13800138000", "123456"
        )

        assert user.two_factor_enabled is True
        assert user.two_factor_method == "sms"
        assert user.totp_secret is None
        mock_auth.verify_sms_code.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_enable_sms_no_phone(
        self, mock_repo, service
    ):
        """未绑定手机号时抛出 ConflictException。"""
        user = _make_user(phone=None)
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with pytest.raises(ConflictException) as exc_info:
            await service.enable_sms(
                "user-001", "+86-13800138000", "123456"
            )

        assert exc_info.value.code == "PHONE_NOT_BOUND"

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_enable_sms_phone_mismatch(
        self, mock_repo, service
    ):
        """手机号不匹配时抛出 ConflictException。"""
        user = _make_user(phone="+86-13800138000")
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with pytest.raises(ConflictException) as exc_info:
            await service.enable_sms(
                "user-001", "+86-13900139000", "123456"
            )

        assert exc_info.value.code == "PHONE_MISMATCH"


# ---- disable ----


class TestDisable:
    """关闭 2FA 业务逻辑测试。"""

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    @patch(USER_REPO)
    async def test_disable_success(
        self, mock_repo, mock_auth, service
    ):
        """关闭 2FA 成功。"""
        user = _make_user(
            phone="+86-13800138000",
            two_factor_enabled=True,
            two_factor_method="totp",
            totp_secret="SECRET",
        )
        mock_repo.get_by_id = AsyncMock(return_value=user)
        mock_repo.update = AsyncMock()
        mock_auth.verify_sms_code = AsyncMock()

        await service.disable(
            "user-001", "+86-13800138000", "123456"
        )

        assert user.two_factor_enabled is False
        assert user.two_factor_method is None
        assert user.totp_secret is None
        mock_auth.verify_sms_code.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(USER_REPO)
    async def test_disable_phone_mismatch(
        self, mock_repo, service
    ):
        """手机号不匹配时抛出 ConflictException。"""
        user = _make_user(phone="+86-13800138000")
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with pytest.raises(ConflictException) as exc_info:
            await service.disable(
                "user-001", "+86-13900139000", "123456"
            )

        assert exc_info.value.code == "PHONE_MISMATCH"
