"""Portal 双因素认证路由集成测试。

覆盖 TOTP 启用/确认、短信 2FA 启用、2FA 关闭端点。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestEnableTotp:
    """启用 TOTP 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_deps(self):
        """模拟 TwoFactorService 和依赖。"""
        with patch(
            "api.portal.profile.two_factor.router.TwoFactorService"
        ) as mock_cls, patch(
            "api.portal.profile.two_factor.router.config_repo"
        ) as mock_config:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            self.mock_config = mock_config
            yield

    async def test_enable_totp_no_auth(self, client):
        """未认证无法启用 TOTP。"""
        resp = await client.post(
            "/portal/profile/two-factor/enable-totp"
        )
        assert resp.status_code == 403

    async def test_enable_totp_success(
        self, client, user_headers
    ):
        """认证用户启用 TOTP 返回二维码图片。"""
        user_mock = MagicMock()
        user_mock.phone = "+86-13800138000"
        user_mock.username = "testuser"
        user_mock.id = "user-1"

        import pyotp
        secret = pyotp.random_base32()
        self.mock_svc.enable_totp.return_value = (
            secret, user_mock
        )

        config_mock = MagicMock()
        config_mock.value = {
            "brand_name": {"zh": "测试品牌", "en": "Test"}
        }
        self.mock_config.get_by_key = AsyncMock(
            return_value=config_mock
        )

        resp = await client.post(
            "/portal/profile/two-factor/enable-totp",
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"

    async def test_enable_totp_brand_string(
        self, client, user_headers
    ):
        """品牌名为字符串时正常工作。"""
        user_mock = MagicMock()
        user_mock.phone = "+86-13800138000"
        user_mock.username = "testuser"
        user_mock.id = "user-1"

        import pyotp
        secret = pyotp.random_base32()
        self.mock_svc.enable_totp.return_value = (
            secret, user_mock
        )

        config_mock = MagicMock()
        config_mock.value = {"brand_name": "简单品牌名"}
        self.mock_config.get_by_key = AsyncMock(
            return_value=config_mock
        )

        resp = await client.post(
            "/portal/profile/two-factor/enable-totp",
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_enable_totp_no_config(
        self, client, user_headers
    ):
        """无品牌配置时使用默认名称。"""
        user_mock = MagicMock()
        user_mock.phone = "+86-13800138000"
        user_mock.username = "testuser"
        user_mock.id = "user-1"

        import pyotp
        secret = pyotp.random_base32()
        self.mock_svc.enable_totp.return_value = (
            secret, user_mock
        )

        self.mock_config.get_by_key = AsyncMock(
            return_value=None
        )

        resp = await client.post(
            "/portal/profile/two-factor/enable-totp",
            headers=user_headers,
        )
        assert resp.status_code == 200


class TestConfirmTotp:
    """确认 TOTP 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 TwoFactorService。"""
        with patch(
            "api.portal.profile.two_factor.router.TwoFactorService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_confirm_totp_no_auth(self, client):
        """未认证无法确认 TOTP。"""
        resp = await client.post(
            "/portal/profile/two-factor/confirm-totp",
            json={"totp_code": "123456"},
        )
        assert resp.status_code == 403

    async def test_confirm_totp_success(
        self, client, user_headers
    ):
        """确认 TOTP 成功返回 200。"""
        self.mock_svc.confirm_totp.return_value = None
        resp = await client.post(
            "/portal/profile/two-factor/confirm-totp",
            json={"totp_code": "123456"},
            headers=user_headers,
        )
        assert resp.status_code == 200


class TestEnableSms:
    """启用短信 2FA 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 TwoFactorService。"""
        with patch(
            "api.portal.profile.two_factor.router.TwoFactorService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_enable_sms_2fa_success(
        self, client, user_headers
    ):
        """启用短信 2FA 成功返回 200。"""
        self.mock_svc.enable_sms.return_value = None
        resp = await client.post(
            "/portal/profile/two-factor/enable-sms",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200


class TestDisable2fa:
    """关闭 2FA 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 TwoFactorService。"""
        with patch(
            "api.portal.profile.two_factor.router.TwoFactorService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_disable_2fa_success(
        self, client, user_headers
    ):
        """关闭 2FA 成功返回 200。"""
        self.mock_svc.disable.return_value = None
        resp = await client.post(
            "/portal/profile/two-factor/disable",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
