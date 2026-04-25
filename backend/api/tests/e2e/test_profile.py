"""Portal 用户资料模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestProfileMeta:
    """个人资料前置数据接口测试。"""

    async def test_get_profile_meta(self, superuser_client):
        """已认证用户获取个人资料前置数据返回 200。"""
        resp = await superuser_client.get(
            "/api/portal/profile/meta"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "username" in data

    async def test_get_profile_meta_unauthorized(
        self, e2e_client
    ):
        """未认证用户获取前置数据返回 401。"""
        resp = await e2e_client.get(
            "/api/portal/profile/meta"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestProfileList:
    """个人资料查看接口测试。"""

    async def test_get_profile_list(self, superuser_client):
        """已认证用户查看个人资料返回 200。"""
        resp = await superuser_client.get(
            "/api/portal/profile/meta/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "username" in data
        assert "role_name" in data
        assert data["is_active"] is True

    async def test_get_profile_list_unauthorized(
        self, e2e_client
    ):
        """未认证用户查看个人资料返回 401。"""
        resp = await e2e_client.get(
            "/api/portal/profile/meta/list"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestProfileEdit:
    """个人资料编辑接口测试。"""

    async def test_update_profile_and_revert(
        self, superuser_client
    ):
        """修改用户名后恢复原值，验证编辑接口正常。"""
        # 1. 获取原始用户名
        me_resp = await superuser_client.get(
            "/api/portal/profile/meta/list"
        )
        assert me_resp.status_code == 200
        original_username = me_resp.json()["username"]

        new_username = "e2e_profile_temp"
        try:
            # 2. 更新用户名
            update_resp = await superuser_client.post(
                "/api/portal/profile/meta/list/edit",
                json={"username": new_username},
            )
            assert update_resp.status_code == 200
            assert (
                update_resp.json()["username"] == new_username
            )

            # 3. 验证更新生效
            verify_resp = await superuser_client.get(
                "/api/portal/profile/meta/list"
            )
            assert verify_resp.status_code == 200
            assert (
                verify_resp.json()["username"] == new_username
            )
        finally:
            # 4. 恢复原始用户名
            revert_resp = await superuser_client.post(
                "/api/portal/profile/meta/list/edit",
                json={"username": original_username},
            )
            assert revert_resp.status_code == 200
            assert (
                revert_resp.json()["username"]
                == original_username
            )

    async def test_update_profile_unauthorized(
        self, e2e_client
    ):
        """未认证用户编辑资料返回 401。"""
        resp = await e2e_client.post(
            "/api/portal/profile/meta/list/edit",
            json={"username": "hacker"},
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestDeleteAccountUnauthorized:
    """注销账号未认证测试。"""

    async def test_delete_account_unauthorized(
        self, e2e_client
    ):
        """未认证用户注销账号返回 401。"""
        resp = await e2e_client.post(
            "/api/portal/profile/delete-account",
            json={"code": "000000"},
        )
        assert resp.status_code == 401
