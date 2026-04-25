"""访客联系模块网关集成测试。

通过网关的完整请求，验证访客联系管理相关接口。
"""

import pytest


@pytest.mark.e2e
class TestListContacts:
    """访客列表接口测试。"""

    async def test_list_contacts(self, superuser_client):
        """超级管理员获取访客列表返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/contacts/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_list_contacts_with_pagination(
        self, superuser_client
    ):
        """分页参数正常工作。"""
        resp = await superuser_client.get(
            "/api/admin/contacts/list",
            params={"page": 1, "page_size": 5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["page"] == 1
        assert data["page_size"] == 5

    async def test_list_contacts_unauthorized(self, e2e_client):
        """未认证用户访问访客列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/contacts/list"
        )
        assert resp.status_code == 401

    async def test_list_contacts_anon_no_csrf(
        self, anon_client
    ):
        """匿名用户（无 CSRF header）访问返回 401。"""
        resp = await anon_client.get(
            "/api/admin/contacts/list"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestContactDetail:
    """访客详情接口测试。"""

    async def test_get_contact_detail(self, superuser_client):
        """从列表获取一个访客 ID，查询详情返回 200。"""
        # 先获取列表
        list_resp = await superuser_client.get(
            "/api/admin/contacts/list"
        )
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        if not items:
            pytest.skip("无访客数据，跳过详情测试")

        user_id = items[0]["id"]
        resp = await superuser_client.get(
            "/api/admin/contacts/list/detail",
            params={"user_id": user_id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == user_id

    async def test_get_contact_detail_unauthorized(
        self, e2e_client
    ):
        """未认证用户查询访客详情返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/contacts/list/detail",
            params={"user_id": "nonexistent"},
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestContactActions:
    """访客联系操作测试（标记状态、添加备注、查询历史）。"""

    async def _get_first_contact_id(
        self, superuser_client
    ) -> str | None:
        """获取第一个访客 ID。"""
        resp = await superuser_client.get(
            "/api/admin/contacts/list"
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        return items[0]["id"] if items else None

    async def test_mark_contact_status(
        self, superuser_client
    ):
        """标记联系状态返回 200。"""
        user_id = await self._get_first_contact_id(
            superuser_client
        )
        if not user_id:
            pytest.skip("无访客数据，跳过标记测试")

        resp = await superuser_client.post(
            "/api/admin/contacts/list/detail/mark",
            json={"user_id": user_id, "status": "contacted"},
        )
        assert resp.status_code == 200
        assert "message" in resp.json()

    async def test_mark_contact_status_and_revert(
        self, superuser_client
    ):
        """标记状态后恢复为 pending。"""
        user_id = await self._get_first_contact_id(
            superuser_client
        )
        if not user_id:
            pytest.skip("无访客数据，跳过标记恢复测试")

        # 标记为 following
        resp = await superuser_client.post(
            "/api/admin/contacts/list/detail/mark",
            json={
                "user_id": user_id,
                "status": "following",
            },
        )
        assert resp.status_code == 200

        # 恢复为 pending
        revert = await superuser_client.post(
            "/api/admin/contacts/list/detail/mark",
            json={"user_id": user_id, "status": "pending"},
        )
        assert revert.status_code == 200

    async def test_add_contact_note(self, superuser_client):
        """添加备注返回 200。"""
        user_id = await self._get_first_contact_id(
            superuser_client
        )
        if not user_id:
            pytest.skip("无访客数据，跳过备注测试")

        resp = await superuser_client.post(
            "/api/admin/contacts/list/detail/note",
            json={
                "user_id": user_id,
                "note": "E2E 测试备注",
            },
        )
        assert resp.status_code == 200
        assert "message" in resp.json()

    async def test_add_contact_note_unauthorized(
        self, e2e_client
    ):
        """未认证用户添加备注返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/contacts/list/detail/note",
            json={
                "user_id": "nonexistent",
                "note": "不应成功",
            },
        )
        assert resp.status_code == 401

    async def test_get_contact_history(
        self, superuser_client
    ):
        """查询联系历史返回 200。"""
        user_id = await self._get_first_contact_id(
            superuser_client
        )
        if not user_id:
            pytest.skip("无访客数据，跳过历史测试")

        resp = await superuser_client.get(
            "/api/admin/contacts/list/detail/history",
            params={"user_id": user_id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_get_contact_history_unauthorized(
        self, e2e_client
    ):
        """未认证用户查询联系历史返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/contacts/list/detail/history",
            params={"user_id": "nonexistent"},
        )
        assert resp.status_code == 401
