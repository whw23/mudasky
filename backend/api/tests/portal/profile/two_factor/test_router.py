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
                "phone": "+8613800138000",
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
                "phone": "+8613800138000",
                "code": "123456",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
