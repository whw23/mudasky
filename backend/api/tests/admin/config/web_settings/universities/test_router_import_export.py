"""院校导入导出和专业设置路由测试。

覆盖院校专业设置、导入模板下载、预览、确认和导出端点。
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundException

SVC_PATH = (
    "api.admin.config.web_settings.universities.router.UniversityService"
)
IMPORT_SVC_PATH = (
    "api.admin.config.web_settings.universities.router.ImportService"
)
EXPORT_SVC_PATH = (
    "api.admin.config.web_settings.universities.router.ExportService"
)


class TestSetPrograms:
    """POST /universities/list/detail/programs 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 UniversityService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_set_programs_success(self, client, superuser_headers):
        """设置院校专业返回 204。"""
        self.mock_svc.set_programs.return_value = None
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/programs",
            json={
                "university_id": "uni-001",
                "programs": [{"name": "CS", "discipline_id": "disc-1"}],
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 204

    async def test_set_programs_empty(self, client, superuser_headers):
        """清空院校专业返回 204。"""
        self.mock_svc.set_programs.return_value = None
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/programs",
            json={"university_id": "uni-001", "programs": []},
            headers=superuser_headers,
        )
        assert resp.status_code == 204

    async def test_set_programs_not_found(self, client, superuser_headers):
        """院校不存在返回 404。"""
        self.mock_svc.set_programs.side_effect = NotFoundException(
            message="院校不存在", code="UNIVERSITY_NOT_FOUND"
        )
        resp = await client.post(
            "/admin/web-settings/universities/list/detail/programs",
            json={
                "university_id": "nonexistent",
                "programs": [],
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestUniversityImportExport:
    """院校导入导出端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_services(self):
        """模拟导入导出服务。"""
        with (
            patch(IMPORT_SVC_PATH) as mock_import_cls,
            patch(EXPORT_SVC_PATH) as mock_export_cls,
        ):
            self.mock_import_svc = AsyncMock()
            mock_import_cls.return_value = self.mock_import_svc
            self.mock_export_svc = AsyncMock()
            mock_export_cls.return_value = self.mock_export_svc
            yield

    async def test_import_preview(self, client, superuser_headers):
        """预览导入返回 200 + 解析结果。"""
        self.mock_import_svc.preview.return_value = {
            "items": [],
            "errors": [],
            "summary": {},
        }
        files = {
            "file": (
                "universities.xlsx",
                b"fake-excel",
                "application/octet-stream",
            )
        }
        resp = await client.post(
            "/admin/web-settings/universities/list/import/preview",
            files=files,
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    async def test_import_preview_missing_file(
        self, client, superuser_headers
    ):
        """预览导入缺少文件返回 422。"""
        resp = await client.post(
            "/admin/web-settings/universities/list/import/preview",
            headers=superuser_headers,
        )
        assert resp.status_code == 422

    async def test_import_confirm(self, client, superuser_headers):
        """确认导入返回 200。"""
        self.mock_import_svc.confirm.return_value = {
            "created": 2,
            "updated": 1,
        }
        files = {
            "file": (
                "universities.zip",
                b"fake-zip",
                "application/zip",
            )
        }
        resp = await client.post(
            "/admin/web-settings/universities/list/import/confirm",
            files=files,
            data={
                "items": '[{"name": "test"}]',
                "discipline_actions": '[{"action": "create"}]',
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_import_confirm_empty_items(
        self, client, superuser_headers
    ):
        """确认导入空 items 返回 200。"""
        self.mock_import_svc.confirm.return_value = {
            "created": 0,
            "updated": 0,
        }
        files = {
            "file": (
                "universities.zip",
                b"fake-zip",
                "application/zip",
            )
        }
        resp = await client.post(
            "/admin/web-settings/universities/list/import/confirm",
            files=files,
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_download_template(self, client, superuser_headers):
        """下载导入模板返回 200 + ZIP。"""
        self.mock_import_svc.generate_template = (
            lambda: b"zip-template"
        )
        resp = await client.get(
            "/admin/web-settings/universities/list/import/template",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert "zip" in resp.headers["content-type"]

    async def test_download_template_disposition(
        self, client, superuser_headers
    ):
        """下载模板包含 Content-Disposition 头。"""
        self.mock_import_svc.generate_template = (
            lambda: b"zip-template"
        )
        resp = await client.get(
            "/admin/web-settings/universities/list/import/template",
            headers=superuser_headers,
        )
        assert "content-disposition" in resp.headers

    async def test_export_universities(
        self, client, superuser_headers
    ):
        """导出院校返回 200 + ZIP。"""
        self.mock_export_svc.export.return_value = b"zip-export"
        resp = await client.get(
            "/admin/web-settings/universities/list/export",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert "zip" in resp.headers["content-type"]

    async def test_export_disposition(
        self, client, superuser_headers
    ):
        """导出院校包含 Content-Disposition 头。"""
        self.mock_export_svc.export.return_value = b"zip-export"
        resp = await client.get(
            "/admin/web-settings/universities/list/export",
            headers=superuser_headers,
        )
        assert "content-disposition" in resp.headers
