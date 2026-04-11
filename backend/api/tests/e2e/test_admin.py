"""管理员模块 E2E 测试。"""

import httpx
import pytest

from tests.e2e.conftest import encrypt_password


@pytest.mark.e2e
class TestAdminUsers:
    """管理员用户管理测试。"""

    async def test_list_users(self, superuser_client):
        """超级管理员分页查询用户列表。"""
        resp = await superuser_client.get("/api/admin/users/list")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)
        assert data["total"] >= 1  # 至少有超级管理员

    async def test_list_users_with_pagination(self, superuser_client):
        """分页参数生效。"""
        resp = await superuser_client.get(
            "/api/admin/users/list", params={"page": 1, "page_size": 1}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["items"]) <= 1

    async def test_get_user_detail(self, superuser_client):
        """获取超级管理员自身用户详情。"""
        # 先获取自身 user_id
        me_resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert me_resp.status_code == 200
        user_id = me_resp.json()["id"]

        # 通过管理接口查询
        resp = await superuser_client.get(
            f"/api/admin/users/detail/{user_id}"
        )
        assert resp.status_code == 200
        user = resp.json()
        assert user["id"] == user_id

    async def test_update_user_toggle_active(
        self, superuser_client, e2e_client
    ):
        """创建测试用户 -> 禁用 -> 验证 -> 恢复 -> 清理。"""
        import random
        phone = f"+86139{random.randint(10000000, 99999999)}"

        # 1. 注册测试用户
        sms_resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone},
        )
        assert sms_resp.status_code == 200
        code = sms_resp.json()["code"]

        encrypted = await encrypt_password(e2e_client, "testpass123")
        reg_resp = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone,
                "code": code,
                "username": f"e2e_admin_{phone[-6:]}",
                **encrypted,
            },
        )
        assert reg_resp.status_code == 200
        user_id = reg_resp.json()["user"]["id"]

        try:
            # 2. 禁用用户
            disable_resp = await superuser_client.post(
                f"/api/admin/users/edit/{user_id}",
                json={"is_active": False},
            )
            assert disable_resp.status_code == 200
            assert disable_resp.json()["is_active"] is False

            # 3. 验证用户已被禁用
            detail_resp = await superuser_client.get(
                f"/api/admin/users/detail/{user_id}"
            )
            assert detail_resp.status_code == 200
            assert detail_resp.json()["is_active"] is False

            # 4. 恢复激活状态
            enable_resp = await superuser_client.post(
                f"/api/admin/users/edit/{user_id}",
                json={"is_active": True},
            )
            assert enable_resp.status_code == 200
            assert enable_resp.json()["is_active"] is True

        finally:
            # 5. 清理：强制下线测试用户
            await superuser_client.post(
                f"/api/admin/users/force-logout/{user_id}"
            )


@pytest.mark.e2e
class TestAdminUnauthorized:
    """管理员接口未授权访问测试。"""

    async def test_list_users_without_auth(self, e2e_client):
        """未登录访问用户列表返回 401。"""
        resp = await e2e_client.get("/api/admin/users/list")
        assert resp.status_code == 401

    async def test_get_user_without_auth(self, e2e_client):
        """未登录获取用户详情返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/users/detail/nonexistent-id"
        )
        assert resp.status_code == 401

    async def test_update_user_without_auth(self, e2e_client):
        """未登录更新用户返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/users/edit/nonexistent-id",
            json={"is_active": False},
        )
        assert resp.status_code == 401
