"""成功案例模块 E2E 测试。"""

import uuid

import pytest


@pytest.mark.e2e
class TestPublicCase:
    """公开案例端点测试（无需认证）。"""

    async def test_list_cases(self, anon_client):
        """匿名访问案例列表返回 200。"""
        resp = await anon_client.get("/api/cases")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)


@pytest.mark.e2e
class TestCaseCrud:
    """管理员案例 CRUD 测试。"""

    async def test_case_lifecycle(
        self, superuser_client, anon_client
    ):
        """创建 -> 公开访问 -> 更新 -> 删除案例。"""
        suffix = uuid.uuid4().hex[:8]

        # 1. 创建案例
        create_resp = await superuser_client.post(
            "/api/admin/cases",
            json={
                "student_name": f"E2E 学生 {suffix}",
                "university": f"E2E 大学 {suffix}",
                "program": "计算机科学",
                "year": 2026,
                "testimonial": "E2E 测试感言",
                "is_featured": True,
            },
        )
        assert create_resp.status_code == 201
        case = create_resp.json()
        case_id = case["id"]
        assert case["student_name"] == f"E2E 学生 {suffix}"
        assert case["university"] == f"E2E 大学 {suffix}"
        assert case["program"] == "计算机科学"
        assert case["year"] == 2026
        assert case["is_featured"] is True

        try:
            # 2. 匿名用户可以访问案例详情
            public_resp = await anon_client.get(
                f"/api/cases/{case_id}"
            )
            assert public_resp.status_code == 200
            assert (
                public_resp.json()["student_name"]
                == f"E2E 学生 {suffix}"
            )

            # 3. 更新案例
            update_resp = await superuser_client.patch(
                f"/api/admin/cases/{case_id}",
                json={
                    "student_name": f"E2E 更新学生 {suffix}",
                    "year": 2027,
                },
            )
            assert update_resp.status_code == 200
            updated = update_resp.json()
            assert (
                updated["student_name"]
                == f"E2E 更新学生 {suffix}"
            )
            assert updated["year"] == 2027

        finally:
            # 4. 删除案例（清理）
            delete_resp = await superuser_client.delete(
                f"/api/admin/cases/{case_id}"
            )
            assert delete_resp.status_code == 204

    async def test_create_case_unauthorized(
        self, e2e_client
    ):
        """未认证创建案例返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/cases",
            json={
                "student_name": "unauthorized",
                "university": "unauthorized",
                "program": "unauthorized",
                "year": 2026,
            },
        )
        assert resp.status_code == 401
