"""用户模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestGetMe:
    """获取当前用户信息测试。"""

    async def test_get_me_success(self, superuser_client):
        """已认证用户获取个人信息返回 200。"""
        resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "username" in data
        assert "role_name" in data
        assert data["is_active"] is True

    async def test_get_me_unauthenticated(self, e2e_client):
        """未认证用户访问个人信息返回 401。"""
        resp = await e2e_client.get(
            "/api/portal/profile/view"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestUpdateMe:
    """更新当前用户个人信息测试。"""

    async def test_update_username_and_revert(
        self, superuser_client
    ):
        """修改用户名后恢复原值。"""
        # 1. 获取原始用户名
        me_resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert me_resp.status_code == 200
        original_username = me_resp.json()["username"]

        # 2. 更新用户名
        new_username = "e2e_temp_name"
        update_resp = await superuser_client.post(
            "/api/portal/profile/edit",
            json={"username": new_username},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["username"] == new_username

        # 3. 验证更新生效
        verify_resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["username"] == new_username

        # 4. 恢复原始用户名
        revert_resp = await superuser_client.post(
            "/api/portal/profile/edit",
            json={"username": original_username},
        )
        assert revert_resp.status_code == 200
        assert (
            revert_resp.json()["username"] == original_username
        )
