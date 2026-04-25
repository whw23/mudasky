"""html_images 工具单元测试。

测试 HTML 中图片 URL 与 base64 的互转。
"""

import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.image.models import Image
from app.utils.html_images import (
    BASE64_PATTERN,
    IMAGE_URL_PATTERN,
    base64_to_urls,
    urls_to_base64,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


# ---- urls_to_base64 ----


class TestUrlsToBase64:
    """URL 转 base64 测试。"""

    async def test_no_images(self, session):
        """无图片标签时返回原 HTML。"""
        html = "<p>Hello World</p>"

        result = await urls_to_base64(session, html)

        assert result == html

    @patch("app.utils.html_images.image_repo")
    async def test_single_image(self, mock_repo, session):
        """单个图片 URL 替换为 base64。"""
        img = MagicMock(spec=Image)
        img.file_data = b"fake_image_data"
        img.mime_type = "image/webp"
        mock_repo.get_by_id = AsyncMock(return_value=img)

        html = (
            '<img src="/api/public/images/detail?id=abc-123">'
        )
        result = await urls_to_base64(session, html)

        expected_b64 = base64.b64encode(b"fake_image_data").decode("ascii")
        assert f"data:image/webp;base64,{expected_b64}" in result
        assert "/api/public/images/detail" not in result

    @patch("app.utils.html_images.image_repo")
    async def test_image_not_found(self, mock_repo, session):
        """图片不存在时保留原 URL。"""
        mock_repo.get_by_id = AsyncMock(return_value=None)

        html = (
            '<img src="/api/public/images/detail?id=not-found">'
        )
        result = await urls_to_base64(session, html)

        assert "/api/public/images/detail?id=not-found" in result

    @patch("app.utils.html_images.image_repo")
    async def test_multiple_images(self, mock_repo, session):
        """多个图片 URL 全部替换。"""
        img1 = MagicMock(spec=Image)
        img1.file_data = b"data1"
        img1.mime_type = "image/png"
        img2 = MagicMock(spec=Image)
        img2.file_data = b"data2"
        img2.mime_type = "image/jpeg"

        async def get_by_id_side(session, image_id):
            return {"aaa-111": img1, "bbb-222": img2}.get(image_id)

        mock_repo.get_by_id = AsyncMock(side_effect=get_by_id_side)

        html = (
            '<img src="/api/public/images/detail?id=aaa-111">'
            '<img src="/api/public/images/detail?id=bbb-222">'
        )
        result = await urls_to_base64(session, html)

        assert "data:image/png;base64," in result
        assert "data:image/jpeg;base64," in result

    @patch("app.utils.html_images.image_repo")
    async def test_img_with_attributes(self, mock_repo, session):
        """img 标签带其他属性时正确替换。"""
        img = MagicMock(spec=Image)
        img.file_data = b"img_data"
        img.mime_type = "image/webp"
        mock_repo.get_by_id = AsyncMock(return_value=img)

        html = (
            '<img class="photo" '
            'src="/api/public/images/detail?id=abc-def" '
            'alt="photo">'
        )
        result = await urls_to_base64(session, html)

        assert "data:image/webp;base64," in result
        assert 'class="photo"' in result


# ---- base64_to_urls ----


class TestBase64ToUrls:
    """base64 转 URL 测试。"""

    async def test_no_base64(self, session):
        """无 base64 图片时返回原 HTML。"""
        html = "<p>No images</p>"

        result = await base64_to_urls(session, html)

        assert result == html

    @patch("app.utils.html_images.image_repo")
    async def test_single_base64(self, mock_repo, session):
        """单个 base64 替换为服务器 URL。"""
        mock_image = MagicMock(spec=Image)
        mock_image.id = "new-img-id"
        mock_repo.create_image = AsyncMock(
            return_value=mock_image
        )

        b64 = base64.b64encode(b"fake_data").decode("ascii")
        html = f'<img src="data:image/png;base64,{b64}">'

        result = await base64_to_urls(session, html)

        assert "/api/public/images/detail?id=new-img-id" in result
        assert "data:image/png;base64," not in result

    @patch("app.utils.html_images.image_repo")
    async def test_base64_creates_image(self, mock_repo, session):
        """base64 转 URL 时调用 create_image 保存。"""
        mock_image = MagicMock(spec=Image)
        mock_image.id = "saved-id"
        mock_repo.create_image = AsyncMock(
            return_value=mock_image
        )

        b64 = base64.b64encode(b"png_bytes").decode("ascii")
        html = f'<img src="data:image/png;base64,{b64}">'

        await base64_to_urls(session, html)

        mock_repo.create_image.assert_awaited_once()
        call_args = mock_repo.create_image.call_args
        assert call_args[0][1] == b"png_bytes"
        assert call_args[0][2] == "imported.png"
        assert call_args[0][3] == "image/png"

    @patch("app.utils.html_images.image_repo")
    async def test_svg_base64_extension(self, mock_repo, session):
        """SVG base64 提取正确扩展名。"""
        mock_image = MagicMock(spec=Image)
        mock_image.id = "svg-id"
        mock_repo.create_image = AsyncMock(
            return_value=mock_image
        )

        b64 = base64.b64encode(b"<svg></svg>").decode("ascii")
        html = f'<img src="data:image/svg+xml;base64,{b64}">'

        await base64_to_urls(session, html)

        call_args = mock_repo.create_image.call_args
        # svg+xml -> split("+")[0] -> "svg"
        assert call_args[0][2] == "imported.svg"


# ---- 正则模式测试 ----


class TestPatterns:
    """正则模式匹配测试。"""

    def test_url_pattern_match(self):
        """URL 模式匹配正确的 img src。"""
        html = '<img src="/api/public/images/detail?id=abc-def-123">'
        match = IMAGE_URL_PATTERN.search(html)
        assert match is not None
        assert match.group(3) == "abc-def-123"

    def test_url_pattern_no_match(self):
        """URL 模式不匹配其他 src。"""
        html = '<img src="/other/path">'
        match = IMAGE_URL_PATTERN.search(html)
        assert match is None

    def test_base64_pattern_match(self):
        """base64 模式匹配 data URI。"""
        html = '<img src="data:image/png;base64,abc123==">'
        match = BASE64_PATTERN.search(html)
        assert match is not None
        assert match.group(2) == "image/png"

    def test_base64_pattern_no_match(self):
        """base64 模式不匹配普通 src。"""
        html = '<img src="http://example.com/img.png">'
        match = BASE64_PATTERN.search(html)
        assert match is None
