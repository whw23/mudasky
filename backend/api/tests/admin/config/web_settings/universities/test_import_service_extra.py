"""ImportService 补充测试 - confirm ZIP 图片处理。

覆盖 confirm 的 ZIP 图片上传、_guess_mime_type 等分支。
"""

import io
import zipfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.universities.import_service import (
    ImportService,
)
from app.db.discipline.models import Discipline, DisciplineCategory
from app.db.university.models import University

DISC_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.disc_repo"
)
UNI_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.uni_repo"
)
PROG_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.prog_repo"
)
IMAGE_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.image_repo"
)


def _make_university(
    university_id: str = "uni-1", **kwargs
) -> MagicMock:
    """创建模拟 University。"""
    uni = MagicMock(spec=University)
    uni.id = university_id
    uni.name = kwargs.get("name", "哈佛大学")
    uni.name_en = kwargs.get("name_en", "Harvard")
    uni.country = kwargs.get("country", "美国")
    uni.province = kwargs.get("province", None)
    uni.city = kwargs.get("city", "剑桥")
    uni.website = kwargs.get("website", None)
    uni.description = kwargs.get("description", None)
    uni.admission_requirements = None
    uni.scholarship_info = None
    uni.latitude = kwargs.get("latitude", None)
    uni.longitude = kwargs.get("longitude", None)
    uni.is_featured = kwargs.get("is_featured", False)
    uni.sort_order = kwargs.get("sort_order", 0)
    uni.qs_rankings = kwargs.get("qs_rankings", None)
    uni.logo_image_id = None
    return uni


def _make_upload_file(
    content: bytes, filename: str = "test.xlsx"
) -> MagicMock:
    """创建模拟 UploadFile。"""
    file = MagicMock()
    file.filename = filename
    file.read = AsyncMock(return_value=content)
    return file


def _make_image(image_id: str = "img-1") -> MagicMock:
    """创建模拟 Image。"""
    img = MagicMock()
    img.id = image_id
    return img


@pytest.fixture
def service(mock_session) -> ImportService:
    """构建 ImportService 实例。"""
    return ImportService(mock_session)


# ---- _guess_mime_type ----


class TestGuessMimeType:
    """_guess_mime_type MIME 类型推测测试。"""

    def test_jpg(self, service):
        """JPG 返回 image/jpeg。"""
        assert service._guess_mime_type("a.jpg") == "image/jpeg"

    def test_jpeg(self, service):
        """JPEG 返回 image/jpeg。"""
        assert service._guess_mime_type("b.jpeg") == "image/jpeg"

    def test_png(self, service):
        """PNG 返回 image/png。"""
        assert service._guess_mime_type("c.png") == "image/png"

    def test_gif(self, service):
        """GIF 返回 image/gif。"""
        assert service._guess_mime_type("d.gif") == "image/gif"

    def test_webp(self, service):
        """WebP 返回 image/webp。"""
        assert service._guess_mime_type("e.webp") == "image/webp"

    def test_svg(self, service):
        """SVG 返回 image/svg+xml。"""
        assert service._guess_mime_type("f.svg") == "image/svg+xml"

    def test_unknown(self, service):
        """未知扩展名默认返回 image/jpeg。"""
        assert service._guess_mime_type("g.bmp") == "image/jpeg"

    def test_uppercase(self, service):
        """大写扩展名也能正确识别。"""
        assert service._guess_mime_type("h.PNG") == "image/png"


# ---- confirm with ZIP + images ----


class TestConfirmWithZip:
    """confirm ZIP 文件（含图片）测试。"""

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_create_with_logo_and_images(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """创建院校时上传 logo 和展示图。"""
        items = [{
            "name": "MIT", "status": "new",
            "data": {"name": "MIT", "country": "美国", "city": "剑桥"},
            "programs": [],
            "logo_filename": "MIT_logo.jpg",
            "image_filenames": ["MIT_1.png", "MIT_2.webp"],
        }]
        uni = _make_university("uni-new", name="MIT")
        mock_u.create_university = AsyncMock(return_value=uni)
        mock_u.update_university = AsyncMock(return_value=uni)
        mock_u.add_university_image = AsyncMock()
        mock_i.create_image = AsyncMock(
            return_value=_make_image()
        )

        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("universities.xlsx", b"fake")
            zf.writestr("images/MIT_logo.jpg", b"logo")
            zf.writestr("images/MIT_1.png", b"img1")
            zf.writestr("images/MIT_2.webp", b"img2")

        file = _make_upload_file(zip_buf.getvalue(), "b.zip")
        result = await service.confirm(file, items, [])

        assert result["imported"] == 1
        assert mock_i.create_image.await_count == 3

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_unchanged_skipped(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """unchanged 的 item 被跳过。"""
        items = [{
            "name": "MIT", "status": "unchanged",
            "data": {"name": "MIT", "country": "美国", "city": "剑桥"},
            "programs": [], "logo_filename": None,
            "image_filenames": [],
        }]
        file = _make_upload_file(b"fake", "test.xlsx")
        result = await service.confirm(file, items, [])
        assert result["skipped"] == 1
        assert result["imported"] == 0

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_update_with_logo(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """更新院校时替换 logo。"""
        items = [{
            "name": "哈佛大学", "status": "update",
            "data": {"name": "哈佛大学", "country": "美国", "city": "剑桥"},
            "programs": [],
            "logo_filename": "logo.jpg",
            "image_filenames": [],
        }]
        existing = _make_university()
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_u.update_university = AsyncMock(
            return_value=existing
        )
        mock_p.replace_programs = AsyncMock()
        mock_i.create_image = AsyncMock(
            return_value=_make_image()
        )

        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("universities.xlsx", b"fake")
            zf.writestr("images/logo.jpg", b"new-logo")
        file = _make_upload_file(zip_buf.getvalue(), "b.zip")
        result = await service.confirm(file, items, [])
        assert result["updated"] == 1

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_update_images_replaces_old(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """更新展示图时删除旧图片再添加新的。"""
        items = [{
            "name": "哈佛大学", "status": "update",
            "data": {"name": "哈佛大学", "country": "美国", "city": "剑桥"},
            "programs": [], "logo_filename": None,
            "image_filenames": ["h1.jpg"],
        }]
        existing = _make_university()
        old_img = MagicMock()
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_u.update_university = AsyncMock(
            return_value=existing
        )
        mock_u.list_university_images = AsyncMock(
            return_value=[old_img]
        )
        mock_u.delete_university_image = AsyncMock()
        mock_u.add_university_image = AsyncMock()
        mock_p.replace_programs = AsyncMock()
        mock_i.create_image = AsyncMock(
            return_value=_make_image()
        )

        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("universities.xlsx", b"fake")
            zf.writestr("images/h1.jpg", b"new-photo")
        file = _make_upload_file(zip_buf.getvalue(), "b.zip")
        result = await service.confirm(file, items, [])
        assert result["updated"] == 1
        mock_u.delete_university_image.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_exception_counted_as_skip(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """创建过程中异常被计为 skipped。"""
        items = [{
            "name": "Bad", "status": "new",
            "data": {"name": "Bad", "country": "X", "city": "Y"},
            "programs": [], "logo_filename": None,
            "image_filenames": [],
        }]
        mock_u.create_university = AsyncMock(
            side_effect=Exception("DB error")
        )
        file = _make_upload_file(b"fake", "test.xlsx")
        result = await service.confirm(file, items, [])
        assert result["skipped"] == 1
        assert result["imported"] == 0
