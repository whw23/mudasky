"""图片公开路由单元测试。

覆盖图片获取端点及缓存分支。
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundException


class TestGetImage:
    """获取图片端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ImageService。"""
        with patch("api.public.image.router.ImageService") as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_image_success(self, client):
        """获取 PNG 图片返回 200。"""
        self.mock_svc.get_image.return_value = (
            b"\x89PNG\r\n\x1a\n",
            "image/png",
        )
        resp = await client.get("/public/images/detail?id=img-1")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert resp.content == b"\x89PNG\r\n\x1a\n"

    async def test_get_image_success_jpeg(self, client):
        """获取 JPEG 图片返回 200。"""
        self.mock_svc.get_image.return_value = (
            b"\xff\xd8\xff",
            "image/jpeg",
        )
        resp = await client.get("/public/images/detail?id=img-2")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        assert resp.content == b"\xff\xd8\xff"

    async def test_get_image_not_found(self, client):
        """图片不存在返回 404。"""
        self.mock_svc.get_image.side_effect = NotFoundException(
            message="图片不存在", code="IMAGE_NOT_FOUND"
        )
        resp = await client.get("/public/images/detail?id=nonexistent")
        assert resp.status_code == 404

    async def test_get_image_missing_id(self, client):
        """缺少 id 参数返回 422。"""
        resp = await client.get("/public/images/detail")
        assert resp.status_code == 422
