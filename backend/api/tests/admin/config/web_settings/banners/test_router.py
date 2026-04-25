"""Banner 管理路由测试。

覆盖管理员 Banner 管理端点。
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
)

SVC_PATH = (
    "api.admin.config.web_settings.banners.router"
    ".BannerService"
)


class TestListBanners:
    """GET /banners/list 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 BannerService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_banners_success(
        self, client, superuser_headers
    ):
        """获取 Banner 配置返回 200 及完整数据。"""
        banners = {
            "home": {"image_ids": ["img-1", "img-2"]},
            "about": {"image_ids": ["img-3"]},
        }
        self.mock_svc.get_all_banners.return_value = (
            banners
        )

        resp = await client.get(
            "/admin/web-settings/banners/list",
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["home"]["image_ids"]) == 2
        assert data["about"]["image_ids"] == ["img-3"]

    async def test_list_banners_empty(
        self, client, superuser_headers
    ):
        """无 Banner 配置时返回空字典。"""
        self.mock_svc.get_all_banners.return_value = {}

        resp = await client.get(
            "/admin/web-settings/banners/list",
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        assert resp.json() == {}


class TestUploadBanner:
    """POST /banners/upload 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 BannerService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_upload_banner_success(
        self, client, superuser_headers
    ):
        """上传 Banner 成功返回 200 及图片 ID。"""
        self.mock_svc.upload_banner.return_value = (
            "new-img-id"
        )

        resp = await client.post(
            "/admin/web-settings/banners/upload",
            params={"page_key": "home"},
            files={
                "file": (
                    "banner.png",
                    b"fake-png",
                    "image/png",
                )
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        assert resp.json()["image_id"] == "new-img-id"

    async def test_upload_banner_jpeg(
        self, client, superuser_headers
    ):
        """上传 JPEG Banner 成功。"""
        self.mock_svc.upload_banner.return_value = (
            "jpeg-img-id"
        )

        resp = await client.post(
            "/admin/web-settings/banners/upload",
            params={"page_key": "about"},
            files={
                "file": (
                    "photo.jpg",
                    b"fake-jpeg",
                    "image/jpeg",
                )
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 200
        assert resp.json()["image_id"] == "jpeg-img-id"

    async def test_upload_banner_invalid_type(
        self, client, superuser_headers
    ):
        """不支持的图片格式返回 400。"""
        self.mock_svc.upload_banner.side_effect = (
            BadRequestException(
                message="不支持的图片格式",
                code="INVALID_IMAGE_TYPE",
            )
        )

        resp = await client.post(
            "/admin/web-settings/banners/upload",
            params={"page_key": "home"},
            files={
                "file": (
                    "doc.txt",
                    b"text",
                    "text/plain",
                )
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 400

    async def test_upload_banner_config_not_found(
        self, client, superuser_headers
    ):
        """配置不存在返回 404。"""
        self.mock_svc.upload_banner.side_effect = (
            NotFoundException(
                message="Banner 配置不存在",
                code="BANNER_CONFIG_NOT_FOUND",
            )
        )

        resp = await client.post(
            "/admin/web-settings/banners/upload",
            params={"page_key": "home"},
            files={
                "file": (
                    "banner.png",
                    b"fake-png",
                    "image/png",
                )
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 404


class TestRemoveBanner:
    """POST /banners/remove 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 BannerService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_remove_banner_success(
        self, client, superuser_headers
    ):
        """移除 Banner 成功返回 204。"""
        self.mock_svc.remove_banner.return_value = None

        resp = await client.post(
            "/admin/web-settings/banners/remove",
            json={
                "page_key": "home",
                "image_id": "img-1",
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 204

    async def test_remove_banner_from_another_page(
        self, client, superuser_headers
    ):
        """从另一个页面移除 Banner 成功。"""
        self.mock_svc.remove_banner.return_value = None

        resp = await client.post(
            "/admin/web-settings/banners/remove",
            json={
                "page_key": "about",
                "image_id": "img-3",
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 204
        self.mock_svc.remove_banner.assert_awaited_once_with(
            "about", "img-3"
        )

    async def test_remove_banner_not_found(
        self, client, superuser_headers
    ):
        """图片不存在返回 404。"""
        self.mock_svc.remove_banner.side_effect = (
            NotFoundException(
                message="图片不存在于该页面",
                code="BANNER_IMAGE_NOT_FOUND",
            )
        )

        resp = await client.post(
            "/admin/web-settings/banners/remove",
            json={
                "page_key": "home",
                "image_id": "nonexistent",
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_remove_banner_missing_fields(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/banners/remove",
            json={},
            headers=superuser_headers,
        )

        assert resp.status_code == 422


class TestReorderBanners:
    """POST /banners/reorder 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 BannerService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_reorder_banners_success(
        self, client, superuser_headers
    ):
        """重排 Banner 顺序成功返回 204。"""
        self.mock_svc.reorder_banners.return_value = None

        resp = await client.post(
            "/admin/web-settings/banners/reorder",
            json={
                "page_key": "home",
                "image_ids": ["img-2", "img-1"],
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 204

    async def test_reorder_banners_single_image(
        self, client, superuser_headers
    ):
        """单张图片重排成功。"""
        self.mock_svc.reorder_banners.return_value = None

        resp = await client.post(
            "/admin/web-settings/banners/reorder",
            json={
                "page_key": "about",
                "image_ids": ["img-3"],
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 204
        self.mock_svc.reorder_banners.assert_awaited_once_with(
            "about", ["img-3"]
        )

    async def test_reorder_banners_not_found(
        self, client, superuser_headers
    ):
        """配置不存在返回 404。"""
        self.mock_svc.reorder_banners.side_effect = (
            NotFoundException(
                message="Banner 配置不存在",
                code="BANNER_CONFIG_NOT_FOUND",
            )
        )

        resp = await client.post(
            "/admin/web-settings/banners/reorder",
            json={
                "page_key": "home",
                "image_ids": ["img-1"],
            },
            headers=superuser_headers,
        )

        assert resp.status_code == 404

    async def test_reorder_banners_missing_fields(
        self, client, superuser_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/banners/reorder",
            json={},
            headers=superuser_headers,
        )

        assert resp.status_code == 422
