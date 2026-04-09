"""RBAC 权限路由集成测试。

覆盖权限查询和角色 CRUD 端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_permission(**kwargs) -> dict:
    """创建权限响应数据。"""
    return {
        "id": kwargs.get("id", "perm-001"),
        "code": kwargs.get("code", "admin.content.edit"),
        "name_key": kwargs.get("name_key", ""),
        "description": kwargs.get(
            "description", "写文章"
        ),
    }


def _make_role(**kwargs) -> dict:
    """创建角色响应数据。"""
    return {
        "id": kwargs.get("id", "role-001"),
        "name": kwargs.get("name", "编辑"),
        "description": kwargs.get("description", ""),
        "permissions": kwargs.get("permissions", []),
        "user_count": kwargs.get("user_count", 0),
        "created_at": kwargs.get(
            "created_at",
            datetime.now(timezone.utc).isoformat(),
        ),
        "updated_at": kwargs.get("updated_at", None),
    }


class TestListPermissions:
    """权限列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_permissions_with_perm(
        self, client, superuser_headers
    ):
        """有 admin.role.list 权限可查看权限列表。"""
        self.mock_svc.list_permissions.return_value = [
            _make_permission()
        ]
        resp = await client.get(
            "/permissions", headers=superuser_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    async def test_list_permissions_forbidden(
        self, client, user_headers
    ):
        """无 admin.role.list 权限无法查看。"""
        resp = await client.get(
            "/permissions", headers=user_headers
        )
        assert resp.status_code == 403

    async def test_list_permissions_no_auth(self, client):
        """未认证无法查看权限列表。"""
        resp = await client.get("/permissions")
        assert resp.status_code == 403


class TestListRoles:
    """角色列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_roles_success(
        self, client, superuser_headers
    ):
        """有权限可查看角色列表。"""
        self.mock_svc.list_roles.return_value = [
            _make_role()
        ]
        resp = await client.get(
            "/roles", headers=superuser_headers
        )
        assert resp.status_code == 200

    async def test_list_roles_forbidden(
        self, client, user_headers
    ):
        """无权限无法查看角色。"""
        resp = await client.get(
            "/roles", headers=user_headers
        )
        assert resp.status_code == 403


class TestCreateRole:
    """创建角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_create_role_success(
        self, client, superuser_headers
    ):
        """有权限可创建角色。"""
        self.mock_svc.create_role.return_value = (
            _make_role()
        )
        resp = await client.post(
            "/roles",
            json={
                "name": "新角色",
                "description": "测试",
                "permission_ids": ["perm-001"],
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_create_role_forbidden(
        self, client, user_headers
    ):
        """无权限无法创建角色。"""
        resp = await client.post(
            "/roles",
            json={
                "name": "新角色",
                "description": "测试",
                "permission_ids": ["perm-001"],
            },
            headers=user_headers,
        )
        assert resp.status_code == 403

    async def test_create_role_invalid_data(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/roles",
            json={"description": "缺少名称"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestGetRole:
    """获取角色详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_role_success(
        self, client, superuser_headers
    ):
        """有权限可查看角色详情。"""
        self.mock_svc.get_role.return_value = _make_role()
        resp = await client.get(
            "/roles/role-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_get_role_not_found(
        self, client, superuser_headers
    ):
        """查看不存在的角色返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_role.side_effect = (
            NotFoundException(message="角色不存在")
        )
        resp = await client.get(
            "/roles/nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestUpdateRole:
    """更新角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_role_success(
        self, client, superuser_headers
    ):
        """有权限可更新角色。"""
        self.mock_svc.update_role.return_value = (
            _make_role(name="更新后")
        )
        resp = await client.patch(
            "/roles/role-001",
            json={"name": "更新后"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_update_role_forbidden(
        self, client, user_headers
    ):
        """无权限无法更新角色。"""
        resp = await client.patch(
            "/roles/role-001",
            json={"name": "更新后"},
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestDeleteRole:
    """删除角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_role_success(
        self, client, superuser_headers
    ):
        """有权限可删除角色。"""
        self.mock_svc.delete_role.return_value = None
        resp = await client.delete(
            "/roles/role-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "角色已删除"

    async def test_delete_role_forbidden(
        self, client, user_headers
    ):
        """无权限无法删除角色。"""
        resp = await client.delete(
            "/roles/role-001", headers=user_headers
        )
        assert resp.status_code == 403
