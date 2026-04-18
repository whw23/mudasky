"""院校管理路由集成测试。

覆盖管理员院校 CRUD 端点：list/create/edit/delete。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_university(**kwargs) -> MagicMock:
    """创建模拟院校对象。"""
    u = MagicMock()
    u.id = kwargs.get("id", "uni-001")
    u.name = kwargs.get("name", "北京大学")
    u.name_en = kwargs.get("name_en", "Peking University")
    u.country = kwargs.get("country", "中国")
    u.province = kwargs.get("province", "北京")
    u.city = kwargs.get("city", "北京")
    u.logo_url = kwargs.get("logo_url", None)
    u.description = kwargs.get("description", "简介")
    u.programs = kwargs.get("programs", ["计算机"])
    u.website = kwargs.get("website", None)
    u.is_featured = kwargs.get("is_featured", False)
    u.sort_order = kwargs.get("sort_order", 0)
    u.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    u.updated_at = kwargs.get("updated_at", None)
    return u


class TestAdminListUniversities:
    """管理员查询院校列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(
            "api.admin.config.web_settings.universities.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_universities_success(
        self, client, superuser_headers
    ):
        """管理员查询院校列表返回 200。"""
        self.mock_svc.list_universities.return_value = (
            [_make_university()],
            1,
        )
        resp = await client.get(
            "/admin/web-settings/universities/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_list_universities_empty(
        self, client, superuser_headers
    ):
        """院校列表为空时返回空列表。"""
        self.mock_svc.list_universities.return_value = (
            [],
            0,
        )
        resp = await client.get(
            "/admin/web-settings/universities/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_universities_custom_page_size(
        self, client, superuser_headers
    ):
        """自定义 page_size 参数传递正确。"""
        self.mock_svc.list_universities.return_value = (
            [],
            0,
        )
        resp = await client.get(
            "/admin/web-settings/universities/list?page_size=50",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        self.mock_svc.list_universities.assert_awaited_once_with(
            0, 50
        )


class TestAdminCreateUniversity:
    """管理员创建院校端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(
            "api.admin.config.web_settings.universities.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_create_university_success(
        self, client, superuser_headers
    ):
        """管理员创建院校返回 201。"""
        self.mock_svc.create_university.return_value = (
            _make_university()
        )
        resp = await client.post(
            "/admin/web-settings/universities/list/create",
            json={
                "name": "北京大学",
                "country": "中国",
                "city": "北京",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "北京大学"

    async def test_create_university_missing_fields(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/universities/list/create",
            json={"name": "北京大学"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestAdminUpdateUniversity:
    """管理员更新院校端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(
            "api.admin.config.web_settings.universities.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_university_success(
        self, client, superuser_headers
    ):
        """管理员更新院校返回 200。"""
        self.mock_svc.update_university.return_value = (
            _make_university(name="清华大学")
        )
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/edit",
            json={
                "university_id": "uni-001",
                "name": "清华大学",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "清华大学"

    async def test_update_university_not_found(
        self, client, superuser_headers
    ):
        """更新不存在的院校，service 抛异常返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.update_university.side_effect = (
            NotFoundException(
                message="院校不存在",
                code="UNIVERSITY_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/edit",
            json={
                "university_id": "nonexistent",
                "name": "不存在",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestAdminDeleteUniversity:
    """管理员删除院校端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(
            "api.admin.config.web_settings.universities.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_university_success(
        self, client, superuser_headers
    ):
        """管理员删除院校返回 204。"""
        self.mock_svc.delete_university.return_value = None
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/delete",
            json={"university_id": "uni-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 204

    async def test_delete_university_not_found(
        self, client, superuser_headers
    ):
        """删除不存在的院校返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.delete_university.side_effect = (
            NotFoundException(
                message="院校不存在",
                code="UNIVERSITY_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/delete",
            json={"university_id": "nonexistent"},
            headers=superuser_headers,
        )
        assert resp.status_code == 404
