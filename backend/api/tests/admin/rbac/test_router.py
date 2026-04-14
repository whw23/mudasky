"""RBAC 权限路由集成测试。

覆盖角色 CRUD 端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest


def _make_role(**kwargs) -> dict:
    """创建角色响应数据。"""
    return {
        "id": kwargs.get("id", "role-001"),
        "name": kwargs.get("name", "编辑"),
        "description": kwargs.get("description", ""),
        "is_builtin": kwargs.get("is_builtin", False),
        "sort_order": kwargs.get("sort_order", 0),
        "permissions": kwargs.get("permissions", []),
        "user_count": kwargs.get("user_count", 0),
        "created_at": kwargs.get(
            "created_at",
            datetime.now(timezone.utc).isoformat(),
        ),
        "updated_at": kwargs.get("updated_at", None),
    }


class TestListRoles:
    """角色列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_roles_success(
        self, client, superuser_headers
    ):
        """可查看角色列表。"""
        self.mock_svc.list_roles.return_value = [
            _make_role()
        ]
        resp = await client.get(
            "/admin/roles/meta/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestCreateRole:
    """创建角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_create_role_success(
        self, client, superuser_headers
    ):
        """可创建角色。"""
        self.mock_svc.create_role.return_value = (
            _make_role()
        )
        resp = await client.post(
            "/admin/roles/meta/list/create",
            json={
                "name": "新角色",
                "description": "测试",
                "permissions": ["admin/users/*"],
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_create_role_invalid_data(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/roles/meta/list/create",
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
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_role_success(
        self, client, superuser_headers
    ):
        """可查看角色详情。"""
        self.mock_svc.get_role.return_value = _make_role()
        resp = await client.get(
            "/admin/roles/meta/list/detail?role_id=role-001",
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
            "/admin/roles/meta/list/detail?role_id=nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestUpdateRole:
    """更新角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_role_success(
        self, client, superuser_headers
    ):
        """可更新角色。"""
        self.mock_svc.update_role.return_value = (
            _make_role(name="更新后")
        )
        resp = await client.post(
            "/admin/roles/meta/list/detail/edit",
            json={
                "role_id": "role-001",
                "name": "更新后",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestDeleteRole:
    """删除角色端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_role_success(
        self, client, superuser_headers
    ):
        """可删除角色。"""
        self.mock_svc.delete_role.return_value = None
        resp = await client.post(
            "/admin/roles/meta/list/detail/delete",
            json={"role_id": "role-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "角色已删除"


class TestReorderRoles:
    """角色排序端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_reorder_roles_success(
        self, client, superuser_headers
    ):
        """可更新角色排序。"""
        self.mock_svc.reorder_roles.return_value = None
        resp = await client.post(
            "/admin/roles/meta/list/reorder",
            json={
                "items": [
                    {"id": "r1", "sort_order": 0},
                    {"id": "r2", "sort_order": 1},
                ]
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "排序已更新"


class TestGetRolesMeta:
    """获取角色前置数据端点测试。"""

    @pytest.fixture(autouse=True)
    def _set_permission_tree(self):
        """设置 permission_tree 应用状态。"""
        from api.main import api
        if not hasattr(api.state, "permission_tree"):
            api.state.permission_tree = {"admin": {}, "portal": {}}
        yield

    async def test_get_roles_meta_success(
        self, client, superuser_headers
    ):
        """可获取权限树前置数据。"""
        resp = await client.get(
            "/admin/roles/meta",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "permission_tree" in data
