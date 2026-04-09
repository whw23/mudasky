"""RBAC 权限路由集成测试。

覆盖权限查询和权限组 CRUD 端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_permission(**kwargs) -> dict:
    """创建权限响应数据。"""
    return {
        "id": kwargs.get("id", "perm-001"),
        "code": kwargs.get("code", "blog:write"),
        "description": kwargs.get(
            "description", "写文章"
        ),
    }


def _make_group(**kwargs) -> dict:
    """创建权限组响应数据。"""
    return {
        "id": kwargs.get("id", "group-001"),
        "name": kwargs.get("name", "编辑组"),
        "description": kwargs.get("description", ""),
        "is_system": kwargs.get("is_system", False),
        "auto_include_all": kwargs.get(
            "auto_include_all", False
        ),
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
        """有 group:manage 权限可查看权限列表。"""
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
        """无 group:manage 权限无法查看。"""
        resp = await client.get(
            "/permissions", headers=user_headers
        )
        assert resp.status_code == 403

    async def test_list_permissions_no_auth(self, client):
        """未认证无法查看权限列表。"""
        resp = await client.get("/permissions")
        assert resp.status_code == 403


class TestListGroups:
    """权限组列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_groups_success(
        self, client, superuser_headers
    ):
        """有权限可查看权限组列表。"""
        self.mock_svc.list_groups.return_value = [
            _make_group()
        ]
        resp = await client.get(
            "/groups", headers=superuser_headers
        )
        assert resp.status_code == 200

    async def test_list_groups_forbidden(
        self, client, user_headers
    ):
        """无权限无法查看权限组。"""
        resp = await client.get(
            "/groups", headers=user_headers
        )
        assert resp.status_code == 403


class TestCreateGroup:
    """创建权限组端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_create_group_success(
        self, client, superuser_headers
    ):
        """有权限可创建权限组。"""
        self.mock_svc.create_group.return_value = (
            _make_group()
        )
        resp = await client.post(
            "/groups",
            json={
                "name": "新权限组",
                "description": "测试",
                "permission_ids": ["perm-001"],
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_create_group_forbidden(
        self, client, user_headers
    ):
        """无权限无法创建权限组。"""
        resp = await client.post(
            "/groups",
            json={
                "name": "新权限组",
                "description": "测试",
                "permission_ids": ["perm-001"],
            },
            headers=user_headers,
        )
        assert resp.status_code == 403

    async def test_create_group_invalid_data(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/groups",
            json={"description": "缺少名称"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestGetGroup:
    """获取权限组详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_group_success(
        self, client, superuser_headers
    ):
        """有权限可查看权限组详情。"""
        self.mock_svc.get_group.return_value = _make_group()
        resp = await client.get(
            "/groups/group-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_get_group_not_found(
        self, client, superuser_headers
    ):
        """查看不存在的权限组返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_group.side_effect = (
            NotFoundException(message="权限组不存在")
        )
        resp = await client.get(
            "/groups/nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestUpdateGroup:
    """更新权限组端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_group_success(
        self, client, superuser_headers
    ):
        """有权限可更新权限组。"""
        self.mock_svc.update_group.return_value = (
            _make_group(name="更新后")
        )
        resp = await client.patch(
            "/groups/group-001",
            json={"name": "更新后"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_update_group_forbidden(
        self, client, user_headers
    ):
        """无权限无法更新权限组。"""
        resp = await client.patch(
            "/groups/group-001",
            json={"name": "更新后"},
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestDeleteGroup:
    """删除权限组端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 RbacService。"""
        with patch(
            "app.rbac.router.RbacService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_group_success(
        self, client, superuser_headers
    ):
        """有权限可删除权限组。"""
        self.mock_svc.delete_group.return_value = None
        resp = await client.delete(
            "/groups/group-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "权限组已删除"

    async def test_delete_group_forbidden(
        self, client, user_headers
    ):
        """无权限无法删除权限组。"""
        resp = await client.delete(
            "/groups/group-001", headers=user_headers
        )
        assert resp.status_code == 403
