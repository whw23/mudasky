"""认证路由集成测试。

覆盖短信验证码发送、注册、登录、令牌续签等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.user.models import User


def _make_user(**kwargs) -> MagicMock:
    """创建模拟用户对象。"""
    user = MagicMock(spec=User)
    user.id = kwargs.get("id", "user-001")
    user.phone = kwargs.get("phone", "+86-13800138000")
    user.username = kwargs.get("username", "testuser")
    user.is_active = kwargs.get("is_active", True)
    user.two_factor_enabled = kwargs.get(
        "two_factor_enabled", False
    )
    user.two_factor_method = kwargs.get(
        "two_factor_method", None
    )
    user.totp_secret = kwargs.get("totp_secret", None)
    user.role_id = kwargs.get("role_id", None)
    user.storage_quota = kwargs.get("storage_quota", 104857600)
    user.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    user.updated_at = kwargs.get("updated_at", None)
    return user


def _make_user_response() -> dict:
    """构建用户响应数据。"""
    return {
        "id": "user-001",
        "phone": "+86-13800138000",
        "username": "testuser",
        "is_active": True,
        "permissions": [],
        "role_id": None,
        "role_name": None,
        "two_factor_enabled": False,
        "two_factor_method": None,
        "storage_quota": 104857600,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": None,
    }


class TestSendSmsCode:
    """短信验证码发送端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AuthService。"""
        with patch(
            "api.auth.router.AuthService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_send_sms_code_success(self, client):
        """发送验证码成功返回 200。"""
        self.mock_svc.send_code.return_value = "123456"
        resp = await client.post(
            "/auth/sms-code",
            json={"phone": "+86-13800138000"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "验证码已发送"

    async def test_send_sms_code_invalid_phone(self, client):
        """手机号格式无效返回 422。"""
        resp = await client.post(
            "/auth/sms-code",
            json={"phone": "invalid"},
        )
        assert resp.status_code == 422

    async def test_send_sms_code_missing_phone(self, client):
        """缺少手机号返回 422。"""
        resp = await client.post(
            "/auth/sms-code", json={}
        )
        assert resp.status_code == 422


class TestRegister:
    """注册端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AuthService。"""
        with patch(
            "api.auth.router.AuthService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_register_success(self, client):
        """注册成功返回 200。"""
        user = _make_user()
        self.mock_svc.register.return_value = user
        self.mock_svc.build_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.post(
            "/auth/register",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
                "username": "newuser",
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data

    async def test_register_invalid_phone(self, client):
        """注册手机号格式无效返回 422。"""
        resp = await client.post(
            "/auth/register",
            json={
                "phone": "bad",
                "code": "123456",
            },
        )
        assert resp.status_code == 422

    async def test_register_conflict(self, client):
        """手机号已注册返回 409。"""
        from app.core.exceptions import ConflictException

        self.mock_svc.register.side_effect = (
            ConflictException(message="手机号已注册")
        )
        resp = await client.post(
            "/auth/register",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
            },
        )
        assert resp.status_code == 409


class TestLogin:
    """登录端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AuthService。"""
        with patch(
            "api.auth.router.AuthService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_login_with_phone_code(self, client):
        """手机号+验证码登录成功返回 200。"""
        user = _make_user()
        self.mock_svc.login.return_value = (user, None)
        self.mock_svc.build_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.post(
            "/auth/login",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data

    async def test_login_with_username_password(
        self, client
    ):
        """用户名+密码登录成功返回 200。"""
        user = _make_user()
        self.mock_svc.login.return_value = (user, None)
        self.mock_svc.build_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.post(
            "/auth/login",
            json={
                "username": "testuser",
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
        )
        assert resp.status_code == 200

    async def test_login_unauthorized(self, client):
        """凭证错误返回 401。"""
        from app.core.exceptions import UnauthorizedException

        self.mock_svc.login.side_effect = (
            UnauthorizedException(message="密码错误")
        )
        resp = await client.post(
            "/auth/login",
            json={
                "username": "testuser",
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
        )
        assert resp.status_code == 401


class TestRefreshTokenHash:
    """保存 refresh token hash 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AuthService 和内部密钥。"""
        with patch(
            "api.auth.router.AuthService"
        ) as mock_cls, patch(
            "app.core.config.settings"
        ) as mock_settings:
            mock_settings.INTERNAL_SECRET = "x"
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_save_token_hash_valid_secret(
        self, client
    ):
        """有效内部密钥保存成功。"""
        self.mock_svc.save_refresh_token_hash.return_value = (
            None
        )
        resp = await client.post(
            "/auth/refresh-token-hash",
            json={
                "user_id": "user-001",
                "token_hash": "abc123",
            },
            headers={"X-Internal-Secret": "x"},
        )
        assert resp.status_code == 200

    async def test_save_token_hash_invalid_secret(
        self, client
    ):
        """无效内部密钥返回 403。"""
        resp = await client.post(
            "/auth/refresh-token-hash",
            json={
                "user_id": "user-001",
                "token_hash": "abc123",
            },
            headers={"X-Internal-Secret": "wrong"},
        )
        assert resp.status_code == 403


class TestRefresh:
    """令牌续签端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AuthService。"""
        with patch(
            "api.auth.router.AuthService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_refresh_success(self, client):
        """令牌续签成功返回 200。"""
        user = _make_user()
        self.mock_svc.refresh.return_value = user
        self.mock_svc.build_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.post(
            "/auth/refresh",
            headers={
                "X-Refresh-Token-Hash": "valid-hash"
            },
        )
        assert resp.status_code == 200

    async def test_refresh_missing_header(self, client):
        """缺少 token hash 头返回 422。"""
        resp = await client.post("/auth/refresh")
        assert resp.status_code == 422
