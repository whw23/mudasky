"""管理员路由集成测试。

覆盖用户管理、密码重置、角色分配、强制下线端点。
"""

from unittest.mock import AsyncMock, patch

import pytest

def _make_user_response(**kwargs) -> dict:
    """构建用户响应数据。"""
    return {
        "id": kwargs.get("id", "target-001"),
        "phone": kwargs.get("phone", "+8613800138000"),
        "username": kwargs.get("username", "target"),
        "is_active": kwargs.get("is_active", True),
        "permissions": kwargs.get("permissions", []),
        "role_id": kwargs.get("role_id", None),
        "role_name": kwargs.get("role_name", None),
        "two_factor_enabled": kwargs.get(
            "two_factor_enabled", False
        ),
        "two_factor_method": kwargs.get(
            "two_factor_method", None
        ),
        "storage_quota": kwargs.get(
            "storage_quota", 104857600
        ),
        "created_at": kwargs.get(
            "created_at", "2025-01-01T00:00:00Z"
        ),
        "updated_at": kwargs.get("updated_at", None),
    }


class TestListUsers:
    """用户列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_users_superuser(
        self, client, superuser_headers
    ):
        """超级管理员可查看用户列表。"""
        self.mock_svc.list_users.return_value = (
            [_make_user_response()],
            1,
        )
        resp = await client.get(
            "/admin/users/list", headers=superuser_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    async def test_list_users_with_search(
        self, client, superuser_headers
    ):
        """支持搜索参数。"""
        self.mock_svc.list_users.return_value = ([], 0)
        resp = await client.get(
            "/admin/users/list?search=test",
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestGetUser:
    """查询用户详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_user_success(
        self, client, superuser_headers
    ):
        """管理员可查看用户详情。"""
        self.mock_svc.get_user.return_value = (
            _make_user_response()
        )
        resp = await client.get(
            "/admin/users/list/detail?user_id=target-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestUpdateUser:
    """管理员更新用户信息端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_user_success(
        self, client, superuser_headers
    ):
        """管理员可更新用户信息。"""
        self.mock_svc.update_user.return_value = (
            _make_user_response(is_active=False)
        )
        resp = await client.post(
            "/admin/users/list/detail/edit",
            json={
                "user_id": "target-001",
                "is_active": False,
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestResetPassword:
    """重置密码端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_reset_password_success(
        self, client, superuser_headers
    ):
        """管理员可重置用户密码。"""
        self.mock_svc.reset_password.return_value = None
        resp = await client.post(
            "/admin/users/list/detail/reset-password",
            json={
                "user_id": "target-001",
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "密码重置成功"


class TestAssignRole:
    """分配角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_assign_role_success(
        self, client, superuser_headers
    ):
        """管理员可分配角色。"""
        self.mock_svc.assign_role.return_value = (
            _make_user_response(
                role_id="role-001",
                role_name="编辑",
            )
        )
        resp = await client.post(
            "/admin/users/list/detail/assign-role",
            json={
                "user_id": "target-001",
                "role_id": "role-001",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestForceLogout:
    """强制下线端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_force_logout_success(
        self, client, superuser_headers
    ):
        """管理员可强制下线用户。"""
        self.mock_svc.force_logout.return_value = None
        resp = await client.post(
            "/admin/users/list/detail/force-logout",
            json={"user_id": "target-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "用户已强制下线"


class TestDeleteUser:
    """删除用户端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "api.admin.user.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_user_success(
        self, client, superuser_headers
    ):
        """管理员可删除用户。"""
        self.mock_svc.delete_user.return_value = None
        resp = await client.post(
            "/admin/users/list/detail/delete",
            json={"user_id": "target-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "用户已删除"

    async def test_delete_self_forbidden(
        self, client, superuser_headers
    ):
        """管理员不能删除自己。"""
        resp = await client.post(
            "/admin/users/list/detail/delete",
            json={"user_id": "admin-1"},
            headers=superuser_headers,
        )
        assert resp.status_code == 403
