"""成功案例路由测试。

覆盖管理员成功案例管理端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import NotFoundException

SVC_PATH = (
    "api.admin.config.web_settings.cases.router"
    ".CaseService"
)


def _make_case(**kwargs) -> MagicMock:
    """创建模拟案例对象。"""
    case = MagicMock()
    case.id = kwargs.get("id", "case-001")
    case.student_name = kwargs.get(
        "student_name", "张三"
    )
    case.university = kwargs.get("university", "MIT")
    case.program = kwargs.get("program", "CS")
    case.year = kwargs.get("year", 2025)
    case.testimonial = kwargs.get("testimonial", None)
    case.avatar_url = kwargs.get("avatar_url", None)
    case.is_featured = kwargs.get("is_featured", False)
    case.sort_order = kwargs.get("sort_order", 0)
    case.university_id = kwargs.get("university_id", None)
    case.avatar_image_id = kwargs.get("avatar_image_id", None)
    case.offer_image_id = kwargs.get("offer_image_id", None)
    case.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    case.updated_at = kwargs.get("updated_at", None)
    return case


class TestAdminListCases:
    """GET /cases/list 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_cases_success(
        self, client, superuser_headers
    ):
        """查询案例列表返回 200。"""
        self.mock_svc.list_cases.return_value = (
            [_make_case()],
            1,
        )
        resp = await client.get(
            "/admin/web-settings/cases/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_list_cases_empty(
        self, client, superuser_headers
    ):
        """空列表返回 200。"""
        self.mock_svc.list_cases.return_value = ([], 0)
        resp = await client.get(
            "/admin/web-settings/cases/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    async def test_list_cases_pagination(
        self, client, superuser_headers
    ):
        """分页参数传递正确。"""
        self.mock_svc.list_cases.return_value = ([], 0)
        resp = await client.get(
            "/admin/web-settings/cases/list"
            "?page=2&page_size=5",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 2
        assert data["page_size"] == 5


class TestAdminCreateCase:
    """POST /cases/list/create 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_create_case_success(
        self, client, superuser_headers
    ):
        """创建案例返回 201。"""
        self.mock_svc.create_case.return_value = (
            _make_case()
        )
        resp = await client.post(
            "/admin/web-settings/cases/list/create",
            json={
                "student_name": "张三",
                "university": "MIT",
                "program": "CS",
                "year": 2025,
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["student_name"] == "张三"

    async def test_create_case_missing_fields(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/cases/list/create",
            json={"student_name": "张三"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestAdminUpdateCase:
    """POST /cases/list/detail/edit 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_case_success(
        self, client, superuser_headers
    ):
        """更新案例返回 200。"""
        self.mock_svc.update_case.return_value = (
            _make_case(student_name="新名字")
        )
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/edit",
            json={
                "case_id": "case-001",
                "student_name": "新名字",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_update_case_not_found(
        self, client, superuser_headers
    ):
        """更新不存在的案例返回 404。"""
        self.mock_svc.update_case.side_effect = (
            NotFoundException(
                message="案例不存在",
                code="CASE_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/edit",
            json={
                "case_id": "nonexistent",
                "student_name": "新名字",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 404

    async def test_update_case_missing_id(
        self, client, superuser_headers
    ):
        """缺少 case_id 返回 422。"""
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/edit",
            json={"student_name": "新名字"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestAdminDeleteCase:
    """POST /cases/list/detail/delete 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_case_success(
        self, client, superuser_headers
    ):
        """删除案例返回 204。"""
        self.mock_svc.delete_case.return_value = None
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/delete",
            json={"case_id": "case-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 204

    async def test_delete_case_not_found(
        self, client, superuser_headers
    ):
        """删除不存在的案例返回 404。"""
        self.mock_svc.delete_case.side_effect = (
            NotFoundException(
                message="案例不存在",
                code="CASE_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/delete",
            json={"case_id": "nonexistent"},
            headers=superuser_headers,
        )
        assert resp.status_code == 404

    async def test_delete_case_missing_id(
        self, client, superuser_headers
    ):
        """缺少 case_id 返回 422。"""
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/delete",
            json={},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestAdminUploadAvatar:
    """POST /cases/list/detail/upload-avatar 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_upload_avatar_success(
        self, client, superuser_headers
    ):
        """上传学生照片成功返回 200。"""
        self.mock_svc.upload_avatar.return_value = "img-123"

        files = {
            "file": ("avatar.jpg", b"fake image", "image/jpeg")
        }
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-avatar"
            "?case_id=case-001",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["image_id"] == "img-123"

    async def test_upload_avatar_not_found(
        self, client, superuser_headers
    ):
        """案例不存在返回 404。"""
        self.mock_svc.upload_avatar.side_effect = (
            NotFoundException(
                message="案例不存在", code="CASE_NOT_FOUND"
            )
        )

        files = {
            "file": ("avatar.jpg", b"fake image", "image/jpeg")
        }
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-avatar"
            "?case_id=nonexistent",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_upload_avatar_missing_file(
        self, client, superuser_headers
    ):
        """缺少文件参数返回 422。"""
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-avatar"
            "?case_id=case-001",
            headers=superuser_headers,
        )

        assert resp.status_code == 422

    async def test_upload_avatar_missing_case_id(
        self, client, superuser_headers
    ):
        """缺少 case_id 参数返回 422。"""
        files = {
            "file": ("avatar.jpg", b"fake image", "image/jpeg")
        }
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-avatar",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 422


class TestAdminUploadOffer:
    """POST /cases/list/detail/upload-offer 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CaseService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_upload_offer_success(
        self, client, superuser_headers
    ):
        """上传录取通知书成功返回 200。"""
        self.mock_svc.upload_offer.return_value = "img-456"

        files = {
            "file": ("offer.jpg", b"fake image", "image/jpeg")
        }
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-offer"
            "?case_id=case-001",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["image_id"] == "img-456"

    async def test_upload_offer_not_found(
        self, client, superuser_headers
    ):
        """案例不存在返回 404。"""
        self.mock_svc.upload_offer.side_effect = (
            NotFoundException(
                message="案例不存在", code="CASE_NOT_FOUND"
            )
        )

        files = {
            "file": ("offer.jpg", b"fake image", "image/jpeg")
        }
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-offer"
            "?case_id=nonexistent",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_upload_offer_missing_file(
        self, client, superuser_headers
    ):
        """缺少文件参数返回 422。"""
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-offer"
            "?case_id=case-001",
            headers=superuser_headers,
        )

        assert resp.status_code == 422

    async def test_upload_offer_missing_case_id(
        self, client, superuser_headers
    ):
        """缺少 case_id 参数返回 422。"""
        files = {
            "file": ("offer.jpg", b"fake image", "image/jpeg")
        }
        resp = await client.post(
            "/admin/web-settings/cases/list/detail/upload-offer",
            files=files,
            headers=superuser_headers,
        )

        assert resp.status_code == 422


