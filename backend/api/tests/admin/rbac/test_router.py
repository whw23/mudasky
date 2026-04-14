"""RBAC 权限路由集成测试。

覆盖权限查询和角色 CRUD 端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.rbac.router import _filter_openapi_spec


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
            "api.admin.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_permissions_success(
        self, client, superuser_headers
    ):
        """可查看权限列表。"""
        self.mock_svc.list_permissions.return_value = [
            _make_permission()
        ]
        resp = await client.get(
            "/admin/roles/permissions",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1


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
            "/admin/roles/list",
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
            "/admin/roles/create",
            json={
                "name": "新角色",
                "description": "测试",
                "permission_ids": ["perm-001"],
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_create_role_invalid_data(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/roles/create",
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
            "/admin/roles/detail/role-001",
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
            "/admin/roles/detail/nonexistent",
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
            "/admin/roles/edit/role-001",
            json={"name": "更新后"},
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
            "/admin/roles/delete/role-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "角色已删除"


class TestOpenApiSpec:
    """OpenAPI spec 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_filter_openapi_spec(self):
        """模拟 _filter_openapi_spec 函数。"""
        mock_schema = {
            "paths": {
                "/admin/roles/list": {
                    "get": {"summary": "查询角色列表"}
                }
            },
        }
        with patch(
            "api.admin.rbac.router._filter_openapi_spec",
            return_value=mock_schema,
        ) as mock_fn:
            self.mock_fn = mock_fn
            yield

    async def test_get_openapi_json_success(
        self, client, superuser_headers
    ):
        """可获取 OpenAPI spec，响应 200 且包含 paths。"""
        resp = await client.get(
            "/admin/roles/list/openapi.json",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "paths" in data


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
            "/admin/roles/reorder",
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


class TestFilterOpenApiSpec:
    """_filter_openapi_spec 函数单元测试。"""

    def test_filter_with_openapi_method(self):
        """使用 app.openapi() 方法获取 spec 并过滤。"""
        mock_app = MagicMock()
        mock_app.openapi.return_value = {
            "paths": {
                "/admin/roles/list": {"get": {}},
                "/portal/user/profile": {"get": {}},
                "/auth/login": {"post": {}},
                "/public/config": {"get": {}},
                "/health": {"get": {}},
                "/other/path": {"get": {}},
            }
        }

        result = _filter_openapi_spec(mock_app)

        assert "/admin/roles/list" in result["paths"]
        assert "/portal/user/profile" in result["paths"]
        assert "/auth/login" not in result["paths"]
        assert "/public/config" not in result["paths"]
        assert "/health" not in result["paths"]
        assert "/other/path" not in result["paths"]

    def test_filter_without_openapi_method(self):
        """无 openapi 方法时使用 get_openapi 回退。"""
        mock_app = MagicMock(spec=[])
        mock_app.title = "test"
        mock_app.version = "1.0"
        mock_app.routes = []

        with patch(
            "api.admin.rbac.router.get_openapi",
            create=True,
        ) as mock_get:
            mock_get.return_value = {
                "paths": {
                    "/admin/users/list": {"get": {}},
                }
            }
            # 需要 mock fastapi.openapi.utils.get_openapi
            with patch(
                "fastapi.openapi.utils.get_openapi",
                return_value={
                    "paths": {
                        "/admin/users/list": {"get": {}},
                    }
                },
            ):
                result = _filter_openapi_spec(mock_app)

        assert "/admin/users/list" in result["paths"]

    def test_filter_empty_paths(self):
        """空 paths 返回空结果。"""
        mock_app = MagicMock()
        mock_app.openapi.return_value = {"paths": {}}

        result = _filter_openapi_spec(mock_app)

        assert result["paths"] == {}

    def test_filter_none_paths(self):
        """paths 为 None 时返回空结果。"""
        mock_app = MagicMock()
        mock_app.openapi.return_value = {}

        result = _filter_openapi_spec(mock_app)

        assert result["paths"] == {}
