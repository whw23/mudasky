"""ExportService 单元测试（初始化、扩展名、基础导出）。

测试院校批量导出的初始化、MIME 类型映射和基础导出场景。
使用 mock 隔离数据库层和文件工具。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.universities.export_service import (
    ExportService,
)

MODULE = "api.admin.config.web_settings.universities.export_service"
UNI_REPO = f"{MODULE}.uni_repo"
PROG_REPO = f"{MODULE}.prog_repo"
DISC_REPO = f"{MODULE}.disc_repo"
IMAGE_REPO = f"{MODULE}.image_repo"
CREATE_ZIP = f"{MODULE}.create_zip"
WB_TO_BYTES = f"{MODULE}.workbook_to_bytes"
WRITE_HEADER = f"{MODULE}.write_sheet_header"


def _make_university(**kwargs) -> MagicMock:
    """创建模拟 University 对象。"""
    u = MagicMock()
    u.id = kwargs.get("id", "uni-1")
    u.name = kwargs.get("name", "清华大学")
    u.name_en = kwargs.get("name_en", "Tsinghua University")
    u.country = kwargs.get("country", "中国")
    u.province = kwargs.get("province", "北京")
    u.city = kwargs.get("city", "北京")
    u.website = kwargs.get("website", "https://tsinghua.edu.cn")
    u.description = kwargs.get("description", "综合性大学")
    u.admission_requirements = kwargs.get(
        "admission_requirements", "高考成绩优秀"
    )
    u.scholarship_info = kwargs.get("scholarship_info", "奖学金")
    u.latitude = kwargs.get("latitude", 39.99)
    u.longitude = kwargs.get("longitude", 116.33)
    u.is_featured = kwargs.get("is_featured", True)
    u.sort_order = kwargs.get("sort_order", 1)
    u.logo_image_id = kwargs.get("logo_image_id", None)
    u.qs_rankings = kwargs.get("qs_rankings", None)
    return u


def _make_image(**kwargs) -> MagicMock:
    """创建模拟 Image 对象。"""
    img = MagicMock()
    img.id = kwargs.get("id", "img-1")
    img.mime_type = kwargs.get("mime_type", "image/jpeg")
    img.file_data = kwargs.get("file_data", b"fake-image-data")
    return img


@pytest.fixture
def service(mock_session) -> ExportService:
    """构建 ExportService 实例，注入 mock session。"""
    return ExportService(mock_session)


# ---- __init__ ----


def test_init_sets_session(mock_session):
    """初始化时正确注入 session。"""
    svc = ExportService(mock_session)
    assert svc.session is mock_session


# ---- _get_extension ----


def test_get_extension_jpeg(service):
    """JPEG 类型返回 .jpg 扩展名。"""
    assert service._get_extension("image/jpeg") == ".jpg"


def test_get_extension_png(service):
    """PNG 类型返回 .png 扩展名。"""
    assert service._get_extension("image/png") == ".png"


def test_get_extension_gif(service):
    """GIF 类型返回 .gif 扩展名。"""
    assert service._get_extension("image/gif") == ".gif"


def test_get_extension_webp(service):
    """WebP 类型返回 .webp 扩展名。"""
    assert service._get_extension("image/webp") == ".webp"


def test_get_extension_svg(service):
    """SVG 类型返回 .svg 扩展名。"""
    assert service._get_extension("image/svg+xml") == ".svg"


def test_get_extension_unknown(service):
    """未知类型默认返回 .jpg 扩展名。"""
    assert service._get_extension("application/octet-stream") == ".jpg"


def test_get_extension_empty(service):
    """空字符串默认返回 .jpg 扩展名。"""
    assert service._get_extension("") == ".jpg"


# ---- export（基础场景） ----


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
@patch(IMAGE_REPO)
@patch(PROG_REPO)
@patch(UNI_REPO)
async def test_export_empty(
    mock_uni_repo, mock_prog_repo, mock_img_repo,
    mock_disc_repo, mock_header, mock_wb, mock_zip, service,
):
    """无院校时导出空 Excel ZIP。"""
    mock_uni_repo.list_universities = AsyncMock(return_value=([], 0))

    result = await service.export()

    assert result == b"zip-data"
    mock_uni_repo.list_universities.assert_awaited_once()
    mock_zip.assert_called_once()
    zip_files = mock_zip.call_args[0][0]
    assert "universities.xlsx" in zip_files
    assert len(zip_files) == 1


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
@patch(IMAGE_REPO)
@patch(PROG_REPO)
@patch(UNI_REPO)
async def test_export_no_logo_no_images(
    mock_uni_repo, mock_prog_repo, mock_img_repo,
    mock_disc_repo, mock_header, mock_wb, mock_zip, service,
):
    """院校无 logo、无展示图、无专业时正常导出。"""
    uni = _make_university(logo_image_id=None)
    mock_uni_repo.list_universities = AsyncMock(
        return_value=([uni], 1)
    )
    mock_prog_repo.list_programs = AsyncMock(return_value=[])
    mock_uni_repo.list_university_images = AsyncMock(
        return_value=[]
    )

    result = await service.export()

    assert result == b"zip-data"
    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("images/") for k in zip_files)


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
@patch(IMAGE_REPO)
@patch(PROG_REPO)
@patch(UNI_REPO)
async def test_export_with_logo(
    mock_uni_repo, mock_prog_repo, mock_img_repo,
    mock_disc_repo, mock_header, mock_wb, mock_zip, service,
):
    """院校有 logo 时导出包含 logo 图片文件。"""
    uni = _make_university(logo_image_id="img-logo")
    logo_img = _make_image(
        id="img-logo", mime_type="image/png",
        file_data=b"logo-png-data",
    )

    mock_uni_repo.list_universities = AsyncMock(
        return_value=([uni], 1)
    )
    mock_img_repo.get_by_id = AsyncMock(return_value=logo_img)
    mock_prog_repo.list_programs = AsyncMock(return_value=[])
    mock_uni_repo.list_university_images = AsyncMock(
        return_value=[]
    )

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert "images/清华大学_logo.png" in zip_files
    assert zip_files["images/清华大学_logo.png"] == b"logo-png-data"


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
@patch(IMAGE_REPO)
@patch(PROG_REPO)
@patch(UNI_REPO)
async def test_export_logo_not_found(
    mock_uni_repo, mock_prog_repo, mock_img_repo,
    mock_disc_repo, mock_header, mock_wb, mock_zip, service,
):
    """院校有 logo_image_id 但图片记录不存在时跳过。"""
    uni = _make_university(logo_image_id="img-missing")
    mock_uni_repo.list_universities = AsyncMock(
        return_value=([uni], 1)
    )
    mock_img_repo.get_by_id = AsyncMock(return_value=None)
    mock_prog_repo.list_programs = AsyncMock(return_value=[])
    mock_uni_repo.list_university_images = AsyncMock(
        return_value=[]
    )

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("images/") for k in zip_files)
