"""image/repository 单元测试。

测试图片的创建、查询、删除、WebP 转换等功能。
使用 mock session 和 mock PIL 隔离真实依赖。
"""

import hashlib
import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.image.models import Image
from app.db.image.repository import (
    CONVERTIBLE_MIME_TYPES,
    MAX_IMAGE_SIZE,
    _convert_to_webp,
    create_image,
    delete_image,
    get_by_hash,
    get_by_id,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


# ---- _convert_to_webp ----


class TestConvertToWebp:
    """WebP 转换测试。"""

    @patch("app.db.image.repository.PILImage")
    def test_rgb_image(self, mock_pil):
        """RGB 模式图片直接转 WebP。"""
        mock_img = MagicMock()
        mock_img.mode = "RGB"
        mock_img.info = {}
        mock_pil.open.return_value = mock_img

        def save_side_effect(buf, format, quality):
            buf.write(b"webp_data")

        mock_img.save.side_effect = save_side_effect

        data, mime, ext = _convert_to_webp(b"fake_png_data")

        assert mime == "image/webp"
        assert ext == ".webp"
        assert data == b"webp_data"
        mock_img.save.assert_called_once()

    @patch("app.db.image.repository.PILImage")
    def test_rgba_image(self, mock_pil):
        """RGBA 模式图片直接转 WebP。"""
        mock_img = MagicMock()
        mock_img.mode = "RGBA"
        mock_img.info = {}
        mock_pil.open.return_value = mock_img

        def save_side_effect(buf, format, quality):
            buf.write(b"webp_rgba")

        mock_img.save.side_effect = save_side_effect

        data, mime, ext = _convert_to_webp(b"fake_png_data")

        assert mime == "image/webp"
        assert ext == ".webp"

    @patch("app.db.image.repository.PILImage")
    def test_palette_with_transparency(self, mock_pil):
        """带透明度的调色板模式转 RGBA。"""
        mock_img = MagicMock()
        mock_img.mode = "P"
        mock_img.info = {"transparency": True}
        mock_converted = MagicMock()
        mock_img.convert.return_value = mock_converted
        mock_pil.open.return_value = mock_img

        def save_side_effect(buf, format, quality):
            buf.write(b"webp_data")

        mock_converted.save.side_effect = save_side_effect

        data, mime, ext = _convert_to_webp(b"palette_data")

        mock_img.convert.assert_called_once_with("RGBA")
        assert mime == "image/webp"

    @patch("app.db.image.repository.PILImage")
    def test_palette_without_transparency(self, mock_pil):
        """不带透明度的调色板模式转 RGB。"""
        mock_img = MagicMock()
        mock_img.mode = "P"
        mock_img.info = {}
        mock_converted = MagicMock()
        mock_img.convert.return_value = mock_converted
        mock_pil.open.return_value = mock_img

        def save_side_effect(buf, format, quality):
            buf.write(b"webp_data")

        mock_converted.save.side_effect = save_side_effect

        _convert_to_webp(b"palette_data")

        mock_img.convert.assert_called_once_with("RGB")


# ---- create_image ----


class TestCreateImage:
    """图片创建测试。"""

    @patch("app.db.image.repository._convert_to_webp")
    @patch("app.db.image.repository.get_by_hash")
    async def test_create_png_converts_to_webp(
        self, mock_get_hash, mock_convert, session
    ):
        """PNG 图片自动转 WebP。"""
        mock_convert.return_value = (
            b"webp_data", "image/webp", ".webp"
        )
        mock_get_hash.return_value = None

        result = await create_image(
            session, b"png_data", "photo.png", "image/png"
        )

        mock_convert.assert_called_once_with(b"png_data")
        session.add.assert_called_once()
        added_image = session.add.call_args[0][0]
        assert added_image.filename == "photo.webp"
        assert added_image.mime_type == "image/webp"

    @patch("app.db.image.repository._convert_to_webp")
    @patch("app.db.image.repository.get_by_hash")
    async def test_create_jpeg_converts_to_webp(
        self, mock_get_hash, mock_convert, session
    ):
        """JPEG 图片自动转 WebP。"""
        mock_convert.return_value = (
            b"webp_data", "image/webp", ".webp"
        )
        mock_get_hash.return_value = None

        await create_image(
            session, b"jpeg_data", "photo.jpg", "image/jpeg"
        )

        mock_convert.assert_called_once()

    @patch("app.db.image.repository.get_by_hash")
    async def test_create_svg_no_conversion(
        self, mock_get_hash, session
    ):
        """SVG 不转换格式。"""
        mock_get_hash.return_value = None

        await create_image(
            session, b"<svg></svg>", "icon.svg", "image/svg+xml"
        )

        added_image = session.add.call_args[0][0]
        assert added_image.mime_type == "image/svg+xml"
        assert added_image.filename == "icon.svg"

    @patch("app.db.image.repository._convert_to_webp")
    @patch("app.db.image.repository.get_by_hash")
    async def test_create_dedup_by_hash(
        self, mock_get_hash, mock_convert, session
    ):
        """哈希重复时返回已有图片，不创建新记录。"""
        existing = MagicMock(spec=Image)
        mock_convert.return_value = (
            b"webp_data", "image/webp", ".webp"
        )
        mock_get_hash.return_value = existing

        result = await create_image(
            session, b"png_data", "dup.png", "image/png"
        )

        assert result == existing
        session.add.assert_not_called()

    @patch("app.db.image.repository._convert_to_webp")
    @patch("app.db.image.repository.get_by_hash")
    async def test_create_filename_without_extension(
        self, mock_get_hash, mock_convert, session
    ):
        """文件名无扩展名时正确追加 .webp。"""
        mock_convert.return_value = (
            b"webp_data", "image/webp", ".webp"
        )
        mock_get_hash.return_value = None

        await create_image(
            session, b"png_data", "photo", "image/png"
        )

        added_image = session.add.call_args[0][0]
        assert added_image.filename == "photo.webp"

    @patch("app.db.image.repository.get_by_hash")
    async def test_create_commits_and_refreshes(
        self, mock_get_hash, session
    ):
        """新图片创建后 commit 并 refresh。"""
        mock_get_hash.return_value = None

        await create_image(
            session, b"pdf_data", "doc.pdf", "application/pdf"
        )

        session.commit.assert_awaited_once()
        session.refresh.assert_awaited_once()


# ---- get_by_id ----


class TestGetById:
    """按 ID 查询测试。"""

    async def test_found(self, session):
        """存在的图片返回 Image 对象。"""
        img = MagicMock(spec=Image)
        session.get = AsyncMock(return_value=img)

        result = await get_by_id(session, "img-1")

        session.get.assert_awaited_once_with(Image, "img-1")
        assert result == img

    async def test_not_found(self, session):
        """不存在的图片返回 None。"""
        session.get = AsyncMock(return_value=None)

        result = await get_by_id(session, "nonexistent")

        assert result is None


# ---- get_by_hash ----


class TestGetByHash:
    """按哈希查询测试。"""

    async def test_found(self, session):
        """已存在哈希返回对应图片。"""
        img = MagicMock(spec=Image)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = img
        session.execute.return_value = mock_result

        result = await get_by_hash(session, "abc123hash")

        assert result == img

    async def test_not_found(self, session):
        """不存在的哈希返回 None。"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result

        result = await get_by_hash(session, "nonexistent")

        assert result is None


# ---- delete_image ----


class TestDeleteImage:
    """图片删除测试。"""

    async def test_delete(self, session):
        """正常删除图片。"""
        img = MagicMock(spec=Image)

        await delete_image(session, img)

        session.delete.assert_awaited_once_with(img)
        session.commit.assert_awaited_once()

    async def test_delete_commits(self, session):
        """删除操作后提交事务。"""
        img = MagicMock(spec=Image)

        await delete_image(session, img)

        assert session.commit.await_count == 1


# ---- 常量验证 ----


class TestConstants:
    """常量配置测试。"""

    def test_convertible_types(self):
        """可转换类型包含 PNG、JPEG、GIF。"""
        assert "image/png" in CONVERTIBLE_MIME_TYPES
        assert "image/jpeg" in CONVERTIBLE_MIME_TYPES
        assert "image/gif" in CONVERTIBLE_MIME_TYPES
        assert "image/svg+xml" not in CONVERTIBLE_MIME_TYPES

    def test_max_size(self):
        """最大上传大小为 10MB。"""
        assert MAX_IMAGE_SIZE == 10 * 1024 * 1024
