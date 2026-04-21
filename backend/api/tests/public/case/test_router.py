"""成功案例公开路由单元测试。

覆盖 2 个 GET 端点的正向和异常场景。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import NotFoundException


class TestListCases:
    """分页查询成功案例端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(
            "api.public.case.router.CaseService"
        ) as mock_cls, patch(
            "api.public.case.router.university_repo.get_university_by_id",
            new_callable=AsyncMock,
        ) as mock_get_uni:
            self.mock_svc = AsyncMock()
            self.mock_get_uni = mock_get_uni
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_cases_success(self, client):
        """分页查询案例列表返回 200。"""
        case = MagicMock(
            spec=[
                "id", "student_name", "university", "program",
                "year", "testimonial", "avatar_url", "is_featured",
                "sort_order", "university_id", "avatar_image_id",
                "offer_image_id", "created_at", "updated_at"
            ],
            id="case-001", student_name="张三",
            university="测试大学", program="计算机",
            year=2025, testimonial="很棒",
            avatar_url=None, is_featured=False,
            sort_order=0, university_id=None,
            avatar_image_id=None, offer_image_id=None,
            created_at=datetime.now(timezone.utc),
            updated_at=None,
        )
        self.mock_svc.list_cases.return_value = ([case], 1)
        self.mock_get_uni.return_value = None
        resp = await client.get("/public/cases/list")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_list_cases_with_filters(self, client):
        """带筛选参数查询案例列表。"""
        self.mock_svc.list_cases.return_value = ([], 0)
        resp = await client.get(
            "/public/cases/list",
            params={"year": 2025, "featured": True},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_cases_empty(self, client):
        """查询结果为空时返回空列表。"""
        self.mock_svc.list_cases.return_value = ([], 0)
        resp = await client.get("/public/cases/list")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0

    async def test_list_cases_etag_match(self, client):
        """列表 ETag 匹配时返回 304。"""
        self.mock_svc.list_cases.return_value = ([], 0)
        resp1 = await client.get("/public/cases/list")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/cases/list",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_cases_pagination(self, client):
        """分页参数正确传递。"""
        self.mock_svc.list_cases.return_value = ([], 0)
        resp = await client.get(
            "/public/cases/list",
            params={"page": 2, "page_size": 5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 2
        assert data["page_size"] == 5


class TestGetCase:
    """获取成功案例详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.case.router.CaseService"
        ) as mock_cls, patch(
            "api.public.case.router.university_repo.get_university_by_id",
            new_callable=AsyncMock,
        ) as mock_get_uni:
            self.mock_svc = AsyncMock()
            self.mock_get_uni = mock_get_uni
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_case_success(self, client):
        """获取案例详情返回 200。"""
        case = MagicMock(
            spec=[
                "id", "student_name", "university", "program",
                "year", "testimonial", "avatar_url", "is_featured",
                "sort_order", "university_id", "avatar_image_id",
                "offer_image_id", "created_at", "updated_at"
            ],
            id="case-001", student_name="张三",
            university="测试大学", program="计算机",
            year=2025, testimonial="很棒",
            avatar_url=None, is_featured=False,
            sort_order=0, university_id=None,
            avatar_image_id=None, offer_image_id=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        self.mock_svc.get_case.return_value = case
        self.mock_get_uni.return_value = None
        resp = await client.get("/public/cases/detail/case-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "case-001"
        assert "ETag" in resp.headers

    async def test_get_case_not_found(self, client):
        """案例不存在返回 404。"""
        self.mock_svc.get_case.side_effect = NotFoundException(
            message="案例不存在", code="CASE_NOT_FOUND"
        )
        resp = await client.get(
            "/public/cases/detail/nonexistent"
        )
        assert resp.status_code == 404

    async def test_get_case_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        case = MagicMock(
            spec=[
                "id", "student_name", "university", "program",
                "year", "testimonial", "avatar_url", "is_featured",
                "sort_order", "university_id", "avatar_image_id",
                "offer_image_id", "created_at", "updated_at"
            ],
            id="case-001", student_name="张三",
            university="测试大学", program="计算机",
            year=2025, testimonial="很棒",
            avatar_url=None, is_featured=False,
            sort_order=0, university_id=None,
            avatar_image_id=None, offer_image_id=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        self.mock_svc.get_case.return_value = case
        self.mock_get_uni.return_value = None
        resp1 = await client.get("/public/cases/detail/case-001")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/cases/detail/case-001",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_get_case_no_updated_at(self, client):
        """案例 updated_at 为 None 时仍正常返回。"""
        case = MagicMock(
            spec=[
                "id", "student_name", "university", "program",
                "year", "testimonial", "avatar_url", "is_featured",
                "sort_order", "university_id", "avatar_image_id",
                "offer_image_id", "created_at", "updated_at"
            ],
            id="case-002", student_name="李四",
            university="另一大学", program="数学",
            year=2024, testimonial=None,
            avatar_url=None, is_featured=True,
            sort_order=1, university_id=None,
            avatar_image_id=None, offer_image_id=None,
            created_at=datetime.now(timezone.utc),
            updated_at=None,
        )
        self.mock_svc.get_case.return_value = case
        self.mock_get_uni.return_value = None
        resp = await client.get("/public/cases/detail/case-002")
        assert resp.status_code == 200
