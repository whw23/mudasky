"""RBAC 权限模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestPermissions:
    """权限列表查询测试。"""

    async def test_list_permissions(self, superuser_client):
        """超级管理员获取所有权限列表。"""
        resp = await superuser_client.get("/api/permissions")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        first = data[0]
        assert "id" in first
        assert "code" in first
        assert "description" in first

    async def test_list_permission_categories(self, superuser_client):
        """获取权限分类树。"""
        resp = await superuser_client.get(
            "/api/permissions/categories"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # 每个分类包含 key、label、permissions
        first = data[0]
        assert "key" in first
        assert "label" in first
        assert "permissions" in first
        assert isinstance(first["permissions"], list)


@pytest.mark.e2e
class TestGroups:
    """权限组 CRUD 测试。"""

    async def test_list_groups(self, superuser_client):
        """获取预置权限组列表。"""
        resp = await superuser_client.get("/api/groups")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # 预置组：global_admin, content_editor, student_advisor, member
        names = [g["name"] for g in data]
        assert "global_admin" in names
        assert "member" in names

    async def test_create_get_update_delete_group(
        self, superuser_client
    ):
        """创建自定义权限组 -> 查详情 -> 更新 -> 删除。"""
        # 1. 获取一个权限 ID 用于创建
        perm_resp = await superuser_client.get("/api/permissions")
        assert perm_resp.status_code == 200
        permissions = perm_resp.json()
        assert len(permissions) > 0
        perm_id = permissions[0]["id"]

        # 2. 创建自定义权限组
        create_resp = await superuser_client.post(
            "/api/groups",
            json={
                "name": "e2e_test_group",
                "description": "E2E 测试用权限组",
                "permission_ids": [perm_id],
            },
        )
        assert create_resp.status_code == 200
        group = create_resp.json()
        group_id = group["id"]
        assert group["name"] == "e2e_test_group"
        assert group["is_system"] is False
        assert len(group["permissions"]) == 1

        try:
            # 3. 获取详情
            detail_resp = await superuser_client.get(
                f"/api/groups/{group_id}"
            )
            assert detail_resp.status_code == 200
            detail = detail_resp.json()
            assert detail["id"] == group_id
            assert detail["name"] == "e2e_test_group"
            assert detail["description"] == "E2E 测试用权限组"

            # 4. 更新名称和描述
            update_resp = await superuser_client.patch(
                f"/api/groups/{group_id}",
                json={
                    "name": "e2e_test_group_updated",
                    "description": "更新后的描述",
                },
            )
            assert update_resp.status_code == 200
            updated = update_resp.json()
            assert updated["name"] == "e2e_test_group_updated"
            assert updated["description"] == "更新后的描述"

        finally:
            # 5. 删除（清理）
            delete_resp = await superuser_client.delete(
                f"/api/groups/{group_id}"
            )
            assert delete_resp.status_code == 200
            assert delete_resp.json()["message"] == "权限组已删除"

        # 6. 验证已删除（404）
        gone_resp = await superuser_client.get(
            f"/api/groups/{group_id}"
        )
        assert gone_resp.status_code == 404


@pytest.mark.e2e
class TestRbacUnauthorized:
    """RBAC 接口未授权访问测试。"""

    async def test_list_permissions_without_auth(self, e2e_client):
        """未登录访问权限列表返回 401。"""
        resp = await e2e_client.get("/api/permissions")
        assert resp.status_code == 401

    async def test_list_groups_without_auth(self, e2e_client):
        """未登录访问权限组列表返回 401。"""
        resp = await e2e_client.get("/api/groups")
        assert resp.status_code == 401

    async def test_create_group_without_auth(self, e2e_client):
        """未登录创建权限组返回 401。"""
        resp = await e2e_client.post(
            "/api/groups",
            json={
                "name": "hack_group",
                "permission_ids": [],
            },
        )
        assert resp.status_code == 401
