"""文章导入导出路由测试。

覆盖文章导入模板下载、预览、确认和导出端点。
"""

from unittest.mock import AsyncMock, patch

import pytest


class TestArticleImportExport:
    """文章导入导出端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_services(self):
        """模拟导入导出服务。"""
        with (
            patch(
                "api.admin.config.web_settings.articles"
                ".router.ArticleImportService"
            ) as mock_import_cls,
            patch(
                "api.admin.config.web_settings.articles"
                ".router.ArticleExportService"
            ) as mock_export_cls,
        ):
            self.mock_import_svc = AsyncMock()
            mock_import_cls.return_value = (
                self.mock_import_svc
            )
            self.mock_export_svc = AsyncMock()
            mock_export_cls.return_value = (
                self.mock_export_svc
            )
            yield

    async def test_download_template(
        self, client, superuser_headers
    ):
        """下载导入模板返回 200 + ZIP。"""
        self.mock_import_svc.generate_template = (
            lambda: b"zip-template"
        )
        resp = await client.get(
            "/admin/web-settings/articles/list/import/template",
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
            "/admin/web-settings/articles/list/import/template",
            headers=superuser_headers,
        )
        assert "content-disposition" in resp.headers

    async def test_preview_import_zip(
        self, client, superuser_headers
    ):
        """预览 ZIP 导入返回 200。"""
        self.mock_import_svc.preview.return_value = {
            "items": [],
            "errors": [],
            "summary": {},
        }
        files = {
            "file": (
                "articles.zip",
                b"fake-zip",
                "application/zip",
            )
        }
        resp = await client.post(
            "/admin/web-settings/articles/list/import/preview"
            "?category_id=cat-1",
            files=files,
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    async def test_preview_import_xlsx(
        self, client, superuser_headers
    ):
        """预览 Excel 导入返回 200。"""
        self.mock_import_svc.preview.return_value = {
            "items": [],
            "errors": [],
            "summary": {},
        }
        files = {
            "file": (
                "articles.xlsx",
                b"fake-excel",
                "application/octet-stream",
            )
        }
        resp = await client.post(
            "/admin/web-settings/articles/list/import/preview"
            "?category_id=cat-1",
            files=files,
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_preview_import_missing_file(
        self, client, superuser_headers
    ):
        """预览导入缺少文件返回 422。"""
        resp = await client.post(
            "/admin/web-settings/articles/list/import/preview"
            "?category_id=cat-1",
            headers=superuser_headers,
        )
        assert resp.status_code == 422

    async def test_confirm_import_success(self):
        """确认导入函数正确调用 service.confirm。"""
        from api.admin.config.web_settings.articles.router import (
            confirm_import,
        )

        self.mock_import_svc.confirm.return_value = {
            "imported": 2,
            "updated": 1,
            "skipped": 0,
        }

        file = AsyncMock()
        file.read = AsyncMock(return_value=b"fake-zip")
        file.filename = "articles.zip"

        session = AsyncMock()
        result = await confirm_import(
            category_id="cat-1",
            items=[],
            user_id="admin-1",
            session=session,
            file=file,
        )

        assert result["imported"] == 2
        assert result["updated"] == 1
        self.mock_import_svc.confirm.assert_awaited_once()

    async def test_confirm_import_xlsx(self):
        """确认导入 Excel 文件识别非 zip 格式。"""
        from api.admin.config.web_settings.articles.router import (
            confirm_import,
        )

        self.mock_import_svc.confirm.return_value = {
            "imported": 1,
            "updated": 0,
            "skipped": 0,
        }

        file = AsyncMock()
        file.read = AsyncMock(return_value=b"fake-excel")
        file.filename = "articles.xlsx"

        session = AsyncMock()
        result = await confirm_import(
            category_id="cat-1",
            items=[],
            user_id="admin-1",
            session=session,
            file=file,
        )

        assert result["imported"] == 1
        # 验证 is_zip=False
        call_args = self.mock_import_svc.confirm.call_args
        assert call_args[1].get("is_zip", call_args[0][-1]) is False

    async def test_confirm_import_missing_file(
        self, client, superuser_headers
    ):
        """确认导入缺少文件返回 422。"""
        resp = await client.post(
            "/admin/web-settings/articles/list/import/confirm"
            "?category_id=cat-1",
            headers=superuser_headers,
        )
        assert resp.status_code == 422

    async def test_export_articles(
        self, client, superuser_headers
    ):
        """导出文章返回 200 + ZIP。"""
        self.mock_export_svc.export_zip.return_value = (
            b"zip-export"
        )
        resp = await client.get(
            "/admin/web-settings/articles/list/export"
            "?category_id=cat-1",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert "zip" in resp.headers["content-type"]

    async def test_export_articles_disposition(
        self, client, superuser_headers
    ):
        """导出文章包含 Content-Disposition 头。"""
        self.mock_export_svc.export_zip.return_value = (
            b"zip-export"
        )
        resp = await client.get(
            "/admin/web-settings/articles/list/export"
            "?category_id=cat-1",
            headers=superuser_headers,
        )
        assert "content-disposition" in resp.headers
