"""图片上传路由测试。

覆盖管理员图片上传端点。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.image.repository import MAX_IMAGE_SIZE

REPO_PATH = (
    "api.admin.config.web_settings.images.router.image_repo"
)


def _mock_image(image_id: str = "img-001") -> MagicMock:
    """创建 mock Image 对象。"""
    image = MagicMock()
    image.id = image_id
    return image


class TestUploadImage:
    """POST /images/upload 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        """模拟 image_repo。"""
        with patch(REPO_PATH) as mock_repo:
            self.mock_repo = mock_repo
            self.mock_repo.create_image = AsyncMock()
            yield

    @pytest.mark.asyncio
    async def test_upload_image_success(
        self, client, superuser_headers
    ):
        """上传有效图片返回 200，响应包含 id 和 url。"""
        self.mock_repo.create_image.return_value = (
            _mock_image("img-001")
        )
        # 构造一个小的有效 PNG 文件
        file_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        resp = await client.post(
            "/admin/web-settings/images/upload",
            headers=superuser_headers,
            files={
                "file": (
                    "test.png",
                    file_data,
                    "image/png",
                )
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "url" in data

    @pytest.mark.asyncio
    async def test_upload_image_invalid_mime_type(
        self, client, superuser_headers
    ):
        """上传不支持的文件类型返回 400。"""
        file_data = b"not an image"
        resp = await client.post(
            "/admin/web-settings/images/upload",
            headers=superuser_headers,
            files={
                "file": (
                    "test.txt",
                    file_data,
                    "text/plain",
                )
            },
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_IMAGE_TYPE"

    @pytest.mark.asyncio
    async def test_upload_image_too_large(
        self, client, superuser_headers
    ):
        """上传超过大小限制的图片返回 400。"""
        # 构造超过 MAX_IMAGE_SIZE 的数据
        file_data = b"\x00" * (MAX_IMAGE_SIZE + 1)
        resp = await client.post(
            "/admin/web-settings/images/upload",
            headers=superuser_headers,
            files={
                "file": (
                    "huge.png",
                    file_data,
                    "image/png",
                )
            },
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "IMAGE_TOO_LARGE"

    @pytest.mark.asyncio
    async def test_upload_image_success_returns_url(
        self, client, superuser_headers
    ):
        """上传成功后返回的 URL 格式正确。"""
        image_id = "abc-123-def"
        self.mock_repo.create_image.return_value = (
            _mock_image(image_id)
        )
        file_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
        resp = await client.post(
            "/admin/web-settings/images/upload",
            headers=superuser_headers,
            files={
                "file": (
                    "logo.png",
                    file_data,
                    "image/png",
                )
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == image_id
        expected_url = (
            f"/api/public/images/detail?id={image_id}"
        )
        assert data["url"] == expected_url
