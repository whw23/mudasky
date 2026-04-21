"""合作院校公开路由单元测试。

覆盖 5 个 GET 端点的正向和异常场景。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace

import pytest

from app.core.exceptions import NotFoundException


def _uni_obj(**overrides) -> SimpleNamespace:
    """创建模拟院校对象（SimpleNamespace 兼容 from_attributes）。"""
    defaults = dict(
        id="uni-001", name="测试大学",
        name_en="Test Univ", country="中国",
        province="北京", city="北京",
        logo_url=None, description="描述",
        programs=["计算机"], website=None,
        is_featured=False, sort_order=0,
        logo_image_id=None,
        admission_requirements=None,
        scholarship_info=None,
        qs_rankings=None,
        latitude=None,
        longitude=None,
        created_at=datetime.now(timezone.utc),
        updated_at=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestListUniversities:
    """查询院校列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(
            "api.public.university.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_universities_success(self, client):
        """分页查询院校列表返回 200。"""
        self.mock_svc.filter_universities_by_discipline.return_value = (
            [_uni_obj()],
            1,
        )
        resp = await client.get("/public/universities/list")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_list_universities_with_filters(self, client):
        """带筛选参数查询院校列表。"""
        self.mock_svc.filter_universities_by_discipline.return_value = ([], 0)
        resp = await client.get(
            "/public/universities/list",
            params={
                "country": "中国",
                "city": "北京",
                "is_featured": True,
                "search": "清华",
                "program": "计算机",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_universities_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        self.mock_svc.filter_universities_by_discipline.return_value = ([], 0)
        resp1 = await client.get("/public/universities/list")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/universities/list",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_universities_empty(self, client):
        """查询结果为空时返回空列表。"""
        self.mock_svc.filter_universities_by_discipline.return_value = ([], 0)
        resp = await client.get("/public/universities/list")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0


class TestListCountries:
    """获取国家列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.university.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_countries_success(self, client):
        """获取国家列表返回 200。"""
        self.mock_svc.get_distinct_countries.return_value = [
            "中国", "美国"
        ]
        resp = await client.get("/public/universities/countries")
        assert resp.status_code == 200
        data = resp.json()
        assert "中国" in data
        assert "美国" in data
        assert "ETag" in resp.headers

    async def test_list_countries_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        self.mock_svc.get_distinct_countries.return_value = [
            "中国"
        ]
        resp1 = await client.get(
            "/public/universities/countries"
        )
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/universities/countries",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_countries_empty(self, client):
        """无院校时国家列表为空。"""
        self.mock_svc.get_distinct_countries.return_value = []
        resp = await client.get("/public/universities/countries")
        assert resp.status_code == 200
        assert resp.json() == []


class TestListProvinces:
    """获取省份列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.university.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_provinces_success(self, client):
        """获取省份列表返回 200。"""
        self.mock_svc.get_distinct_provinces.return_value = [
            "北京", "上海"
        ]
        resp = await client.get("/public/universities/provinces")
        assert resp.status_code == 200
        assert resp.json() == ["北京", "上海"]

    async def test_list_provinces_with_country(self, client):
        """按国家筛选省份列表。"""
        self.mock_svc.get_distinct_provinces.return_value = ["北京"]
        resp = await client.get(
            "/public/universities/provinces",
            params={"country": "中国"},
        )
        assert resp.status_code == 200
        assert resp.json() == ["北京"]

    async def test_list_provinces_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        self.mock_svc.get_distinct_provinces.return_value = [
            "北京"
        ]
        resp1 = await client.get(
            "/public/universities/provinces"
        )
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/universities/provinces",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_provinces_empty(self, client):
        """省份列表为空时返回空数组。"""
        self.mock_svc.get_distinct_provinces.return_value = []
        resp = await client.get("/public/universities/provinces")
        assert resp.status_code == 200
        assert resp.json() == []


class TestListCities:
    """获取城市列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.university.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_cities_success(self, client):
        """获取城市列表返回 200。"""
        self.mock_svc.get_distinct_cities.return_value = [
            "北京", "东京"
        ]
        resp = await client.get("/public/universities/cities")
        assert resp.status_code == 200
        assert resp.json() == ["北京", "东京"]

    async def test_list_cities_with_country(self, client):
        """按国家筛选城市列表。"""
        self.mock_svc.get_distinct_cities.return_value = ["东京"]
        resp = await client.get(
            "/public/universities/cities",
            params={"country": "日本"},
        )
        assert resp.status_code == 200
        assert resp.json() == ["东京"]

    async def test_list_cities_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        self.mock_svc.get_distinct_cities.return_value = [
            "北京"
        ]
        resp1 = await client.get(
            "/public/universities/cities"
        )
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/universities/cities",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_cities_empty(self, client):
        """城市列表为空时返回空数组。"""
        self.mock_svc.get_distinct_cities.return_value = []
        resp = await client.get("/public/universities/cities")
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetUniversity:
    """获取院校详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.university.router.UniversityService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_university_success(self, client):
        """获取院校详情返回 200。"""
        uni = _uni_obj(
            updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        self.mock_svc.get_university_detail.return_value = {
            "university": uni,
            "disciplines": [],
            "image_ids": [],
            "related_cases": [],
        }
        resp = await client.get(
            "/public/universities/detail/uni-001"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "uni-001"
        assert "ETag" in resp.headers

    async def test_get_university_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        uni = _uni_obj(
            updated_at=datetime(
                2026, 1, 1, tzinfo=timezone.utc
            ),
        )
        self.mock_svc.get_university_detail.return_value = {
            "university": uni,
            "disciplines": [],
            "image_ids": [],
            "related_cases": [],
        }
        resp1 = await client.get(
            "/public/universities/detail/uni-001"
        )
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/universities/detail/uni-001",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_get_university_not_found(self, client):
        """院校不存在返回 404。"""
        self.mock_svc.get_university_detail.side_effect = (
            NotFoundException(
                message="院校不存在", code="UNIVERSITY_NOT_FOUND"
            )
        )
        resp = await client.get(
            "/public/universities/detail/nonexistent"
        )
        assert resp.status_code == 404

    async def test_get_university_no_updated_at(self, client):
        """院校 updated_at 为 None 时仍正常返回。"""
        uni = _uni_obj(
            id="uni-002", name="另一大学",
            name_en=None, country="美国",
            province=None, city="纽约",
            description=None, programs=[],
        )
        self.mock_svc.get_university_detail.return_value = {
            "university": uni,
            "disciplines": [],
            "image_ids": [],
            "related_cases": [],
        }
        resp = await client.get(
            "/public/universities/detail/uni-002"
        )
        assert resp.status_code == 200
