"""学科分类导入导出路由测试。

覆盖分类编辑、导入模板下载、预览、确认、导出端点。
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import ConflictException


def _make_category(**overrides):
    """创建模拟分类对象（SimpleNamespace 兼容 from_attributes）。"""
    defaults = dict(
        id="cat-1",
        name="工学",
        sort_order=0,
        created_at=datetime.now(timezone.utc),
        updated_at=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestAdminCategoryUpdate:
    """学科大分类编辑端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.admin.config.web_settings.disciplines.router.DisciplineService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_category_success(self, client, superuser_headers):
        """编辑分类返回 200。"""
        self.mock_svc.update_category.return_value = _make_category(
            name="新分类名"
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/categories/list/detail/edit",
            headers=superuser_headers,
            json={"category_id": "cat-1", "name": "新分类名"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "新分类名"

    async def test_update_category_conflict(self, client, superuser_headers):
        """编辑分类名称冲突返回 409。"""
        self.mock_svc.update_category.side_effect = ConflictException(
            message="分类名称已存在", code="DISCIPLINE_CATEGORY_EXISTS"
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/categories/list/detail/edit",
            headers=superuser_headers,
            json={"category_id": "cat-1", "name": "已存在"},
        )
        assert resp.status_code == 409


class TestDisciplineImportExport:
    """学科分类导入导出端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_services(self):
        """模拟导入导出服务。"""
        with (
            patch(
                "api.admin.config.web_settings.disciplines.router"
                ".DisciplineImportService"
            ) as mock_import_cls,
            patch(
                "api.admin.config.web_settings.disciplines.router"
                ".DisciplineExportService"
            ) as mock_export_cls,
        ):
            self.mock_import_svc = AsyncMock()
            mock_import_cls.return_value = self.mock_import_svc
            self.mock_export_svc = AsyncMock()
            mock_export_cls.return_value = self.mock_export_svc
            yield

    async def test_download_template(self, client, superuser_headers):
        """下载导入模板返回 200 + Excel 文件。"""
        self.mock_import_svc.generate_template = lambda: b"tpl-data"
        resp = await client.get(
            "/admin/web-settings/disciplines/import/template",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers["content-type"]

    async def test_download_template_has_disposition(
        self, client, superuser_headers
    ):
        """下载模板响应头包含 Content-Disposition。"""
        self.mock_import_svc.generate_template = lambda: b"tpl-data"
        resp = await client.get(
            "/admin/web-settings/disciplines/import/template",
            headers=superuser_headers,
        )
        assert "content-disposition" in resp.headers

    async def test_preview_import(self, client, superuser_headers):
        """预览导入返回 200 + 解析结果。"""
        self.mock_import_svc.preview.return_value = {
            "items": [],
            "errors": [],
            "summary": {"new": 0, "update": 0, "unchanged": 0, "error": 0},
        }
        files = {"file": ("test.xlsx", b"fake-excel", "application/octet-stream")}
        resp = await client.post(
            "/admin/web-settings/disciplines/import/preview",
            files=files,
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "summary" in data

    async def test_preview_import_missing_file(
        self, client, superuser_headers
    ):
        """预览导入缺少文件返回 422。"""
        resp = await client.post(
            "/admin/web-settings/disciplines/import/preview",
            headers=superuser_headers,
        )
        assert resp.status_code == 422

    async def test_confirm_import(self, client, superuser_headers):
        """确认导入返回 200 + 导入结果。"""
        self.mock_import_svc.confirm.return_value = {
            "created": 3,
            "skipped": 1,
        }
        resp = await client.post(
            "/admin/web-settings/disciplines/import/confirm",
            headers=superuser_headers,
            json={
                "items": [
                    {
                        "category_name": "工学",
                        "discipline_name": "CS",
                        "status": "new",
                    }
                ]
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 3

    async def test_confirm_import_empty(self, client, superuser_headers):
        """确认导入空列表返回 200。"""
        self.mock_import_svc.confirm.return_value = {
            "created": 0,
            "skipped": 0,
        }
        resp = await client.post(
            "/admin/web-settings/disciplines/import/confirm",
            headers=superuser_headers,
            json={"items": []},
        )
        assert resp.status_code == 200

    async def test_export_disciplines(self, client, superuser_headers):
        """导出学科分类返回 200 + Excel 文件。"""
        self.mock_export_svc.export_excel.return_value = b"export-data"
        resp = await client.get(
            "/admin/web-settings/disciplines/export",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers["content-type"]

    async def test_export_has_disposition(self, client, superuser_headers):
        """导出响应头包含 Content-Disposition。"""
        self.mock_export_svc.export_excel.return_value = b"export-data"
        resp = await client.get(
            "/admin/web-settings/disciplines/export",
            headers=superuser_headers,
        )
        assert "content-disposition" in resp.headers
