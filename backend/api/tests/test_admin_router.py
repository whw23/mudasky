"""管理员路由集成测试。

覆盖用户管理、密码重置、权限组分配、强制下线端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.user.models import User


def _make_user_response(**kwargs) -> dict:
    """构建用户响应数据。"""
    return {
        "id": kwargs.get("id", "target-001"),
        "phone": kwargs.get("phone", "+8613800138000"),
        "username": kwargs.get("username", "target"),
        "user_type": kwargs.get("user_type", "student"),
        "is_superuser": kwargs.get("is_superuser", False),
        "is_active": kwargs.get("is_active", True),
        "permissions": kwargs.get("permissions", []),
        "group_id": kwargs.get("group_id", None),
        "group_name": kwargs.get("group_name", None),
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


def _make_user_model(**kwargs) -> MagicMock:
    """创建模拟用户模型对象。"""
    user = MagicMock(spec=User)
    user.id = kwargs.get("id", "target-001")
    user.user_type = kwargs.get("user_type", "student")
    user.is_superuser = kwargs.get("is_superuser", False)
    return user


class TestListUsers:
    """用户列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
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
            "/admin/users", headers=superuser_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    async def test_list_users_with_staff_perm(
        self, client, staff_headers
    ):
        """有 member:manage 权限可查看用户列表。"""
        self.mock_svc.list_users.return_value = ([], 0)
        resp = await client.get(
            "/admin/users", headers=staff_headers
        )
        assert resp.status_code == 200

    async def test_list_users_forbidden(
        self, client, user_headers
    ):
        """普通用户无权查看用户列表。"""
        resp = await client.get(
            "/admin/users", headers=user_headers
        )
        assert resp.status_code == 403

    async def test_list_users_no_auth(self, client):
        """未认证无法查看用户列表。"""
        resp = await client.get("/admin/users")
        assert resp.status_code == 403

    async def test_list_users_with_search(
        self, client, superuser_headers
    ):
        """支持搜索参数。"""
        self.mock_svc.list_users.return_value = ([], 0)
        resp = await client.get(
            "/admin/users?search=test&user_type=student",
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestGetUser:
    """查询用户详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_user_success(
        self, client, superuser_headers
    ):
        """管理员可查看用户详情。"""
        self.mock_svc.get_user_model.return_value = (
            _make_user_model()
        )
        self.mock_svc.check_target_permission.return_value = (
            None
        )
        self.mock_svc.get_user.return_value = (
            _make_user_response()
        )
        resp = await client.get(
            "/admin/users/target-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_get_user_forbidden(
        self, client, user_headers
    ):
        """普通用户无权查看用户详情。"""
        resp = await client.get(
            "/admin/users/target-001",
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestUpdateUser:
    """管理员更新用户信息端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_user_success(
        self, client, superuser_headers
    ):
        """管理员可更新用户信息。"""
        self.mock_svc.get_user_model.return_value = (
            _make_user_model()
        )
        self.mock_svc.check_target_permission.return_value = (
            None
        )
        self.mock_svc.update_user.return_value = (
            _make_user_response(is_active=False)
        )
        resp = await client.patch(
            "/admin/users/target-001",
            json={"is_active": False},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_update_user_forbidden(
        self, client, user_headers
    ):
        """普通用户无权更新用户信息。"""
        resp = await client.patch(
            "/admin/users/target-001",
            json={"is_active": False},
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestChangeUserType:
    """修改用户类型端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_change_type_superuser(
        self, client, superuser_headers
    ):
        """超级管理员可修改用户类型。"""
        self.mock_svc.get_user_model.return_value = (
            _make_user_model()
        )
        self.mock_svc.check_target_permission.return_value = (
            None
        )
        self.mock_svc.change_user_type.return_value = (
            _make_user_response(user_type="staff")
        )
        resp = await client.patch(
            "/admin/users/target-001/type",
            json={"user_type": "staff"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_change_type_single_perm_forbidden(
        self, client
    ):
        """只有 member:manage 权限无法修改类型（需同时拥有两个权限）。"""
        headers = {
            "X-User-Id": "staff-2",
            "X-User-Permissions": "member:manage",
            "X-User-Type": "staff",
            "X-Is-Superuser": "false",
        }
        resp = await client.patch(
            "/admin/users/target-001/type",
            json={"user_type": "staff"},
            headers=headers,
        )
        assert resp.status_code == 403

    async def test_change_type_no_auth(self, client):
        """未认证无法修改用户类型。"""
        resp = await client.patch(
            "/admin/users/target-001/type",
            json={"user_type": "staff"},
        )
        assert resp.status_code == 403


class TestResetPassword:
    """重置密码端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_reset_password_success(
        self, client, superuser_headers
    ):
        """管理员可重置用户密码。"""
        self.mock_svc.get_user_model.return_value = (
            _make_user_model()
        )
        self.mock_svc.check_target_permission.return_value = (
            None
        )
        self.mock_svc.reset_password.return_value = None
        resp = await client.put(
            "/admin/users/target-001/password",
            json={
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "密码重置成功"

    async def test_reset_password_forbidden(
        self, client, user_headers
    ):
        """普通用户无权重置密码。"""
        resp = await client.put(
            "/admin/users/target-001/password",
            json={
                "encrypted_password": "enc_data",
                "nonce": "test_nonce",
            },
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestAssignGroups:
    """分配权限组端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_assign_groups_success(
        self, client, superuser_headers
    ):
        """管理员可分配权限组。"""
        self.mock_svc.get_user_model.return_value = (
            _make_user_model()
        )
        self.mock_svc.check_target_permission.return_value = (
            None
        )
        self.mock_svc.assign_group.return_value = (
            _make_user_response(
                group_id="group-001",
                group_name="编辑组",
            )
        )
        resp = await client.put(
            "/admin/users/target-001/groups",
            json={"group_id": "group-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_assign_groups_forbidden(
        self, client, user_headers
    ):
        """普通用户无权分配权限组。"""
        resp = await client.put(
            "/admin/users/target-001/groups",
            json={"group_id": "group-001"},
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestForceLogout:
    """强制下线端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 AdminService。"""
        with patch(
            "app.admin.router.AdminService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_force_logout_success(
        self, client, superuser_headers
    ):
        """管理员可强制下线用户。"""
        self.mock_svc.get_user_model.return_value = (
            _make_user_model()
        )
        self.mock_svc.check_target_permission.return_value = (
            None
        )
        self.mock_svc.force_logout.return_value = None
        resp = await client.delete(
            "/admin/users/target-001/tokens",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "用户已强制下线"

    async def test_force_logout_forbidden(
        self, client, user_headers
    ):
        """普通用户无权强制下线。"""
        resp = await client.delete(
            "/admin/users/target-001/tokens",
            headers=user_headers,
        )
        assert resp.status_code == 403
