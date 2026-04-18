"""RBAC 权限模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestRoles:
    """角色 CRUD 测试。"""

    async def test_list_roles(self, superuser_client):
        """获取预置角色列表。"""
        resp = await superuser_client.get(
            "/api/admin/roles/meta/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # 预置角色应包含 visitor
        names = [r["name"] for r in data]
        assert "visitor" in names

    async def test_create_get_update_delete_role(
        self, superuser_client
    ):
        """创建自定义角色 -> 查详情 -> 更新 -> 删除。"""
        # 1. 创建自定义角色
        create_resp = await superuser_client.post(
            "/api/admin/roles/meta/list/create",
            json={
                "name": "e2e_test_role",
                "description": "E2E 测试用角色",
                "permissions": ["admin/users/*"],
            },
        )
        assert create_resp.status_code == 200
        role = create_resp.json()
        role_id = role["id"]
        assert role["name"] == "e2e_test_role"
        assert len(role["permissions"]) == 1
        assert role["permissions"][0] == "admin/users/*"

        try:
            # 2. 获取详情
            detail_resp = await superuser_client.get(
                "/api/admin/roles/meta/list/detail",
                params={"role_id": role_id},
            )
            assert detail_resp.status_code == 200
            detail = detail_resp.json()
            assert detail["id"] == role_id
            assert detail["name"] == "e2e_test_role"
            assert detail["description"] == "E2E 测试用角色"

            # 3. 更新名称和描述
            update_resp = await superuser_client.post(
                "/api/admin/roles/meta/list/detail/edit",
                json={
                    "role_id": role_id,
                    "name": "e2e_test_role_updated",
                    "description": "更新后的描述",
                },
            )
            assert update_resp.status_code == 200
            updated = update_resp.json()
            assert updated["name"] == "e2e_test_role_updated"
            assert updated["description"] == "更新后的描述"

        finally:
            # 4. 删除（清理）
            delete_resp = await superuser_client.post(
                "/api/admin/roles/meta/list/detail/delete",
                json={"role_id": role_id},
            )
            assert delete_resp.status_code == 200
            assert delete_resp.json()["message"] == "角色已删除"

        # 5. 验证已删除（404）
        gone_resp = await superuser_client.get(
            "/api/admin/roles/meta/list/detail",
            params={"role_id": role_id},
        )
        assert gone_resp.status_code == 404

    async def test_reorder_roles(self, superuser_client):
        """角色排序。"""
        # 获取所有角色
        resp = await superuser_client.get(
            "/api/admin/roles/meta/list"
        )
        assert resp.status_code == 200
        roles = resp.json()
        assert len(roles) >= 2

        # 构造排序请求（交换前两个的 sort_order）
        items = [
            {"id": roles[0]["id"], "sort_order": roles[1].get("sort_order", 1)},
            {"id": roles[1]["id"], "sort_order": roles[0].get("sort_order", 0)},
        ]
        reorder_resp = await superuser_client.post(
            "/api/admin/roles/meta/list/reorder",
            json={"items": items},
        )
        assert reorder_resp.status_code == 200

        # 恢复原始排序
        restore_items = [
            {"id": roles[0]["id"], "sort_order": roles[0].get("sort_order", 0)},
            {"id": roles[1]["id"], "sort_order": roles[1].get("sort_order", 1)},
        ]
        await superuser_client.post(
            "/api/admin/roles/meta/list/reorder",
            json={"items": restore_items},
        )


@pytest.mark.e2e
class TestOpenApiSpec:
    """OpenAPI spec 端点 E2E 测试。"""

    async def test_get_openapi_spec(self, superuser_client):
        """OpenAPI spec 仅在 DEBUG 模式下可用，非 DEBUG 返回 404。"""
        resp = await superuser_client.get(
            "/api/openapi.json"
        )
        # DEBUG=false 时 openapi_url=None，返回 404
        # DEBUG=true 时返回 200
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            data = resp.json()
            assert "paths" in data
            paths = list(data["paths"].keys())
            assert any("/admin/" in p for p in paths)

    async def test_get_openapi_spec_without_auth(
        self, e2e_client
    ):
        """未登录访问 OpenAPI spec 返回 401 或 404。"""
        resp = await e2e_client.get(
            "/api/openapi.json"
        )
        assert resp.status_code in (401, 404)


@pytest.mark.e2e
class TestRbacUnauthorized:
    """RBAC 接口未授权访问测试。"""

    async def test_list_roles_without_auth(self, e2e_client):
        """未登录访问角色列表返回 401。"""
        resp = await e2e_client.get("/api/admin/roles/meta/list")
        assert resp.status_code == 401

    async def test_create_role_without_auth(self, e2e_client):
        """未登录创建角色返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/roles/meta/list/create",
            json={
                "name": "hack_role",
                "permissions": [],
            },
        )
        assert resp.status_code == 401
