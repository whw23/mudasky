"""Portal 用户资料路由集成测试。

覆盖个人资料查看、编辑、密码修改、手机号修改、注销等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.user.models import User


def _make_user_response() -> dict:
    """构建用户响应数据。"""
    return {
        "id": "user-1",
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


def _make_user_model(**kwargs) -> MagicMock:
    """创建模拟用户模型对象。"""
    user = MagicMock(spec=User)
    user.id = kwargs.get("id", "user-1")
    user.phone = kwargs.get("phone", "+86-13800138000")
    user.username = kwargs.get("username", "testuser")
    user.is_active = kwargs.get("is_active", True)
    user.two_factor_enabled = kwargs.get(
        "two_factor_enabled", False
    )
    user.two_factor_method = kwargs.get(
        "two_factor_method", None
    )
    user.role_id = kwargs.get("role_id", None)
    user.role_name = kwargs.get("role_name", None)
    user.storage_quota = kwargs.get("storage_quota", 104857600)
    user.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    user.updated_at = kwargs.get("updated_at", None)
    return user


class TestGetMeta:
    """获取前置数据端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ProfileService。"""
        with patch(
            "api.portal.profile.router.ProfileService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_meta_success(
        self, client, user_headers
    ):
        """认证用户获取前置数据返回 200。"""
        self.mock_svc.get_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.get(
            "/portal/profile/meta", headers=user_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-1"

    async def test_get_meta_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.get("/portal/profile/meta")
        assert resp.status_code == 403


class TestGetProfile:
    """查看个人资料端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ProfileService。"""
        with patch(
            "api.portal.profile.router.ProfileService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_profile_success(
        self, client, user_headers
    ):
        """认证用户查看个人资料返回 200。"""
        self.mock_svc.get_user_response.return_value = (
            _make_user_response()
        )
        resp = await client.get(
            "/portal/profile/meta/list",
            headers=user_headers,
        )
        assert resp.status_code == 200


class TestUpdateProfile:
    """编辑个人资料端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ProfileService。"""
        with patch(
            "api.portal.profile.router.ProfileService"
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
        resp = await client.post(
            "/portal/profile/meta/list/edit",
            json={"username": "newname"},
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_update_profile_no_auth(self, client):
        """未认证无法更新个人信息。"""
        resp = await client.post(
            "/portal/profile/meta/list/edit",
            json={"username": "newname"},
        )
        assert resp.status_code == 403


class TestChangePassword:
    """修改密码端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ProfileService。"""
        with patch(
            "api.portal.profile.router.ProfileService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_change_password_success(
        self, client, user_headers
    ):
        """修改密码成功返回 200。"""
        self.mock_svc.change_password.return_value = None
        resp = await client.post(
            "/portal/profile/password",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "密码修改成功"

    async def test_change_password_no_auth(self, client):
        """未认证无法修改密码。"""
        resp = await client.post(
            "/portal/profile/password",
            json={
                "phone": "+86-13800138000",
                "code": "123456",
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
        )
        assert resp.status_code == 403


class TestChangePhone:
    """修改手机号端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ProfileService。"""
        with patch(
            "api.portal.profile.router.ProfileService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_change_phone_success(
        self, client, user_headers
    ):
        """修改手机号成功返回 200。"""
        self.mock_svc.change_phone.return_value = (
            _make_user_model(phone="+86-13900139000")
        )
        resp = await client.post(
            "/portal/profile/phone",
            json={
                "new_phone": "+86-13900139000",
                "code": "654321",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_change_phone_invalid_format(
        self, client, user_headers
    ):
        """手机号格式无效返回 422。"""
        resp = await client.post(
            "/portal/profile/phone",
            json={
                "new_phone": "bad-phone",
                "code": "654321",
            },
            headers=user_headers,
        )
        assert resp.status_code == 422


class TestDeleteAccount:
    """注销账号端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ProfileService 和 auth_repo。"""
        with patch(
            "api.portal.profile.router.ProfileService"
        ) as mock_cls, patch(
            "api.portal.profile.router.auth_repo"
        ) as mock_auth:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            self.mock_auth = mock_auth
            yield

    async def test_delete_account_no_auth(self, client):
        """未认证无法注销账号。"""
        resp = await client.post(
            "/portal/profile/delete-account",
            json={"code": "123456"},
        )
        assert resp.status_code == 403

    async def test_delete_account_success(
        self, client, user_headers
    ):
        """注销账号成功返回 200。"""
        user = _make_user_model(phone="+86-13800138000")
        self.mock_svc.get_user.return_value = user
        self.mock_auth.verify_sms_code = AsyncMock()
        self.mock_svc.delete_user.return_value = None
        resp = await client.post(
            "/portal/profile/delete-account",
            json={"code": "123456"},
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "账号已注销"

    async def test_delete_account_no_phone(
        self, client, user_headers
    ):
        """未绑定手机号无法注销账号。"""
        user = _make_user_model(phone=None)
        self.mock_svc.get_user.return_value = user
        resp = await client.post(
            "/portal/profile/delete-account",
            json={"code": "123456"},
            headers=user_headers,
        )
        assert resp.status_code == 403
