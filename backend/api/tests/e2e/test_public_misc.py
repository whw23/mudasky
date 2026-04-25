"""公开图片和学科分类模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestDisciplineList:
    """学科分类列表接口测试。"""

    async def test_get_discipline_list(self, e2e_client):
        """查询学科分类树返回 200 和列表数据。"""
        resp = await e2e_client.get(
            "/api/public/disciplines/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_get_discipline_list_no_auth(
        self, anon_client
    ):
        """学科分类为公开接口，无认证无 CSRF 也返回 200。"""
        resp = await anon_client.get(
            "/api/public/disciplines/list"
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


@pytest.mark.e2e
class TestPublicImage:
    """公开图片接口测试。"""

    async def test_get_image_not_found(self, e2e_client):
        """请求不存在的图片 ID 返回 404。"""
        resp = await e2e_client.get(
            "/api/public/images/detail",
            params={"id": "nonexistent-id-000"},
        )
        assert resp.status_code == 404

    async def test_get_image_missing_id(self, e2e_client):
        """缺少 id 参数返回 422。"""
        resp = await e2e_client.get(
            "/api/public/images/detail"
        )
        assert resp.status_code == 422

    async def test_get_image_no_auth(self, anon_client):
        """图片接口为公开接口，无认证访问不存在的图片返回 404。"""
        resp = await anon_client.get(
            "/api/public/images/detail",
            params={"id": "nonexistent-id-001"},
        )
        assert resp.status_code == 404
