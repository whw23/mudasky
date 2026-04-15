"""跨角色访问 E2E 测试。

验证低权限角色（或未认证用户）无法访问高权限端点。
"""

import pytest


@pytest.mark.e2e
class TestCrossRoleAdminAccess:
    """管理员端点的跨角色访问控制测试。"""

    async def test_admin_can_access_admin_endpoint(
        self, superuser_client
    ):
        """正向：管理员可以访问管理端点。"""
        resp = await superuser_client.get(
            "/api/admin/users/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    async def test_admin_can_access_public_endpoint(
        self, superuser_client
    ):
        """正向：管理员可以访问公开端点。"""
        resp = await superuser_client.get(
            "/api/public/config/list"
        )
        assert resp.status_code in (200, 304)


@pytest.mark.e2e
class TestCrossRoleUnauthenticated:
    """未认证用户访问受保护端点的测试。

    由于没有 student_client fixture，使用 e2e_client
    （未认证但带 CSRF header）模拟低权限访问。
    """

    async def test_unauthenticated_admin_read_returns_401(
        self, e2e_client
    ):
        """反向：未认证请求访问管理读取端点返回 401。"""
        resp = await e2e_client.get("/api/admin/users/list")
        assert resp.status_code == 401

    async def test_unauthenticated_admin_write_returns_401(
        self, e2e_client
    ):
        """反向：未认证请求访问管理写入端点返回 401 或 403。"""
        resp = await e2e_client.post(
            "/api/admin/users/list/detail/edit",
            json={
                "user_id": "00000000-0000-0000-0000-000000000000",
                "is_active": False,
            },
        )
        assert resp.status_code in (401, 403)
