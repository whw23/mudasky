"""用户路由集成测试。

覆盖用户个人信息查询、更新、密码修改等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.user.models import User


def _make_user_response() -> dict:
    """构建用户响应数据。"""
    return {
        "id": "user-1",
        "phone": "+8613800138000",
        "username": "testuser",
        "user_type": "student",
        "is_superuser": False,
        "is_active": True,
        "permissions": [],
        "group_id": None,
        "group_name": None,
        "two_factor_enabled": False,
        "two_factor_method": None,
        "storage_quota": 104857600,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": None,
    }


def _make_user_model(**kwargs) -> MagicMock:
    """创建模拟用户模型对象。"""
    user = MagicMock(spec=User)
    user.id = kwargs.get("id", "user-1")
    user.phone = kwargs.get("phone", "+8613800138000")
    user.username = kwargs.get("username", "testuser")
    user.user_type = kwargs.get("user_type", "student")
    user.is_superuser = kwargs.get("is_superuser", False)
    user.is_active = kwargs.get("is_active", True)
    user.two_factor_enabled = kwargs.get(
        "two_factor_enabled", False
    )
    user.two_factor_method = kwargs.get(
        "two_factor_method", None
    )
    user.group_id = kwargs.get("group_id", None)
    user.group_name = kwargs.get("group_name", None)
    user.storage_quota = kwargs.get("storage_quota", 104857600)
    user.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    user.updated_at = kwargs.get("updated_at", None)
    return user


class TestGetMe:
    """获取当前用户信息端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UserService。"""
        with patch(
            "app.user.router.UserService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_me_success(
        self, client, user_headers
    ):
        """认证用户获取自身信息返回 200。"""
        self.mock_svc.get_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.get(
            "/users/me", headers=user_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-1"

    async def test_get_me_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.get("/users/me")
        assert resp.status_code == 403


class TestUpdateMe:
    """更新用户个人信息端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UserService。"""
        with patch(
            "app.user.router.UserService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_username(
        self, client, user_headers
    ):
        """更新用户名返回 200。"""
        self.mock_svc.update_profile.return_value = (
            _make_user_model(username="newname")
        )
        resp = await client.patch(
            "/users/me",
            json={"username": "newname"},
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_update_me_no_auth(self, client):
        """未认证无法更新个人信息。"""
        resp = await client.patch(
            "/users/me", json={"username": "newname"}
        )
        assert resp.status_code == 403


class TestChangePassword:
    """修改密码端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UserService。"""
        with patch(
            "app.user.router.UserService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_change_password_success(
        self, client, user_headers
    ):
        """修改密码成功返回 200。"""
        self.mock_svc.change_password.return_value = None
        resp = await client.put(
            "/users/me/password",
            json={
                "phone": "+8613800138000",
                "code": "123456",
                "new_password": "newpassword123",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "密码修改成功"

    async def test_change_password_no_auth(self, client):
        """未认证无法修改密码。"""
        resp = await client.put(
            "/users/me/password",
            json={
                "phone": "+8613800138000",
                "code": "123456",
                "new_password": "newpassword123",
            },
        )
        assert resp.status_code == 403

    async def test_change_password_short(
        self, client, user_headers
    ):
        """密码过短返回 422。"""
        resp = await client.put(
            "/users/me/password",
            json={
                "phone": "+8613800138000",
                "code": "123456",
                "new_password": "123",
            },
            headers=user_headers,
        )
        assert resp.status_code == 422


class TestChangePhone:
    """修改手机号端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UserService。"""
        with patch(
            "app.user.router.UserService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_change_phone_success(
        self, client, user_headers
    ):
        """修改手机号成功返回 200。"""
        self.mock_svc.change_phone.return_value = (
            _make_user_model(phone="+8613900139000")
        )
        resp = await client.put(
            "/users/me/phone",
            json={
                "new_phone": "+8613900139000",
                "code": "654321",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_change_phone_invalid_format(
        self, client, user_headers
    ):
        """手机号格式无效返回 422。"""
        resp = await client.put(
            "/users/me/phone",
            json={
                "new_phone": "bad-phone",
                "code": "654321",
            },
            headers=user_headers,
        )
        assert resp.status_code == 422


class TestTwoFactor:
    """双因素认证端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UserService。"""
        with patch(
            "app.user.router.UserService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_confirm_totp_no_auth(self, client):
        """未认证无法确认 TOTP。"""
        resp = await client.post(
            "/users/me/2fa/confirm-totp",
            json={"totp_code": "123456"},
        )
        assert resp.status_code == 403

    async def test_confirm_totp_success(
        self, client, user_headers
    ):
        """确认 TOTP 成功返回 200。"""
        self.mock_svc.confirm_2fa_totp.return_value = None
        resp = await client.post(
            "/users/me/2fa/confirm-totp",
            json={"totp_code": "123456"},
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_enable_sms_2fa_success(
        self, client, user_headers
    ):
        """启用短信 2FA 成功返回 200。"""
        self.mock_svc.enable_2fa_sms.return_value = None
        resp = await client.post(
            "/users/me/2fa/enable-sms",
            json={
                "phone": "+8613800138000",
                "code": "123456",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_disable_2fa_success(
        self, client, user_headers
    ):
        """关闭 2FA 成功返回 200。"""
        self.mock_svc.disable_2fa.return_value = None
        resp = await client.post(
            "/users/me/2fa/disable",
            json={
                "phone": "+8613800138000",
                "code": "123456",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
