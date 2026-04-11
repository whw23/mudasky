"""RBAC 权限模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestPermissions:
    """权限列表查询测试。"""

    async def test_list_permissions(self, superuser_client):
        """超级管理员获取所有权限列表。"""
        resp = await superuser_client.get(
            "/api/admin/roles/permissions"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        first = data[0]
        assert "id" in first
        assert "code" in first
        assert "description" in first


@pytest.mark.e2e
class TestRoles:
    """角色 CRUD 测试。"""

    async def test_list_roles(self, superuser_client):
        """获取预置角色列表。"""
        resp = await superuser_client.get(
            "/api/admin/roles/list"
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
        # 1. 获取一个权限 ID 用于创建
        perm_resp = await superuser_client.get(
            "/api/admin/roles/permissions"
        )
        assert perm_resp.status_code == 200
        permissions = perm_resp.json()
        assert len(permissions) > 0
        perm_id = permissions[0]["id"]

        # 2. 创建自定义角色
        create_resp = await superuser_client.post(
            "/api/admin/roles/create",
            json={
                "name": "e2e_test_role",
                "description": "E2E 测试用角色",
                "permission_ids": [perm_id],
            },
        )
        assert create_resp.status_code == 200
        role = create_resp.json()
        role_id = role["id"]
        assert role["name"] == "e2e_test_role"
        assert len(role["permissions"]) == 1

        try:
            # 3. 获取详情
            detail_resp = await superuser_client.get(
                f"/api/admin/roles/detail/{role_id}"
            )
            assert detail_resp.status_code == 200
            detail = detail_resp.json()
            assert detail["id"] == role_id
            assert detail["name"] == "e2e_test_role"
            assert detail["description"] == "E2E 测试用角色"

            # 4. 更新名称和描述
            update_resp = await superuser_client.post(
                f"/api/admin/roles/edit/{role_id}",
                json={
                    "name": "e2e_test_role_updated",
                    "description": "更新后的描述",
                },
            )
            assert update_resp.status_code == 200
            updated = update_resp.json()
            assert updated["name"] == "e2e_test_role_updated"
            assert updated["description"] == "更新后的描述"

        finally:
            # 5. 删除（清理）
            delete_resp = await superuser_client.post(
                f"/api/admin/roles/delete/{role_id}"
            )
            assert delete_resp.status_code == 200
            assert delete_resp.json()["message"] == "角色已删除"

        # 6. 验证已删除（404）
        gone_resp = await superuser_client.get(
            f"/api/admin/roles/detail/{role_id}"
        )
        assert gone_resp.status_code == 404


@pytest.mark.e2e
class TestRbacUnauthorized:
    """RBAC 接口未授权访问测试。"""

    async def test_list_permissions_without_auth(self, e2e_client):
        """未登录访问权限列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/roles/permissions"
        )
        assert resp.status_code == 401

    async def test_list_roles_without_auth(self, e2e_client):
        """未登录访问角色列表返回 401。"""
        resp = await e2e_client.get("/api/admin/roles/list")
        assert resp.status_code == 401

    async def test_create_role_without_auth(self, e2e_client):
        """未登录创建角色返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/roles/create",
            json={
                "name": "hack_role",
                "permission_ids": [],
            },
        )
        assert resp.status_code == 401
