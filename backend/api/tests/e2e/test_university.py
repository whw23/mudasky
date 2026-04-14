"""合作院校模块 E2E 测试。"""

import uuid

import pytest


@pytest.mark.e2e
class TestPublicUniversity:
    """公开院校端点测试（无需认证）。"""

    async def test_list_universities(self, anon_client):
        """匿名访问院校列表返回 200。"""
        resp = await anon_client.get(
            "/api/public/universities/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_list_countries(self, anon_client):
        """匿名访问国家列表返回 200。"""
        resp = await anon_client.get(
            "/api/public/universities/countries"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


@pytest.mark.e2e
class TestUniversityCrud:
    """管理员院校 CRUD 测试。"""

    async def test_university_lifecycle(
        self, superuser_client, anon_client
    ):
        """创建 -> 公开访问 -> 更新 -> 删除院校。"""
        suffix = uuid.uuid4().hex[:8]

        # 1. 创建院校
        create_resp = await superuser_client.post(
            "/api/admin/universities/create",
            json={
                "name": f"E2E 测试大学 {suffix}",
                "name_en": f"E2E Test University {suffix}",
                "country": "英国",
                "city": "伦敦",
                "description": "E2E 测试院校简介",
                "programs": ["计算机科学", "数据科学"],
                "is_featured": True,
            },
        )
        assert create_resp.status_code == 201
        university = create_resp.json()
        university_id = university["id"]
        assert (
            university["name"] == f"E2E 测试大学 {suffix}"
        )
        assert university["country"] == "英国"
        assert university["city"] == "伦敦"
        assert university["programs"] == [
            "计算机科学",
            "数据科学",
        ]
        assert university["is_featured"] is True

        try:
            # 2. 匿名用户可以访问院校详情
            public_resp = await anon_client.get(
                f"/api/public/universities/detail/{university_id}"
            )
            assert public_resp.status_code == 200
            assert (
                public_resp.json()["name"]
                == f"E2E 测试大学 {suffix}"
            )

            # 3. 更新院校
            update_resp = await superuser_client.post(
                f"/api/admin/universities/edit/{university_id}",
                json={
                    "name": f"E2E 更新大学 {suffix}",
                    "city": "曼彻斯特",
                    "programs": [
                        "计算机科学",
                        "数据科学",
                        "人工智能",
                    ],
                },
            )
            assert update_resp.status_code == 200
            updated = update_resp.json()
            assert (
                updated["name"]
                == f"E2E 更新大学 {suffix}"
            )
            assert updated["city"] == "曼彻斯特"
            assert len(updated["programs"]) == 3

        finally:
            # 4. 删除院校（清理）
            delete_resp = await superuser_client.post(
                f"/api/admin/universities/delete/{university_id}"
            )
            assert delete_resp.status_code == 204

    async def test_create_university_unauthorized(
        self, e2e_client
    ):
        """未认证创建院校返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/universities/create",
            json={
                "name": "unauthorized",
                "country": "unauthorized",
                "city": "unauthorized",
            },
        )
        assert resp.status_code == 401

    async def test_admin_list_universities(
        self, superuser_client
    ):
        """管理员查询院校列表。"""
        resp = await superuser_client.get(
            "/api/admin/universities/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
