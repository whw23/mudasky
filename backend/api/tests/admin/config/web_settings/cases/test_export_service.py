"""ExportService（案例）单元测试。

测试成功案例批量导出的初始化、MIME 类型映射和导出场景。
使用 mock 隔离数据库层和文件工具。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.cases.export_service import (
    ExportService,
)

MODULE = "api.admin.config.web_settings.cases.export_service"
CASE_REPO = f"{MODULE}.repository"
IMAGE_REPO = f"{MODULE}.image_repo"
CREATE_ZIP = f"{MODULE}.create_zip"
WB_TO_BYTES = f"{MODULE}.workbook_to_bytes"
WRITE_HEADER = f"{MODULE}.write_sheet_header"


def _make_case(**kwargs) -> MagicMock:
    """创建模拟 Case 对象。"""
    c = MagicMock()
    c.student_name = kwargs.get("student_name", "张三")
    c.university = kwargs.get("university", "MIT")
    c.program = kwargs.get("program", "CS")
    c.year = kwargs.get("year", 2025)
    c.testimonial = kwargs.get("testimonial", "感言内容")
    c.avatar_image_id = kwargs.get("avatar_image_id", None)
    c.offer_image_id = kwargs.get("offer_image_id", None)
    c.is_featured = kwargs.get("is_featured", False)
    c.sort_order = kwargs.get("sort_order", 0)
    return c


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
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_empty(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """无案例时导出空 Excel ZIP。"""
    mock_repo.list_cases = AsyncMock(return_value=([], 0))

    result = await service.export()

    assert result == b"zip-data"
    mock_repo.list_cases.assert_awaited_once()
    mock_zip.assert_called_once()
    zip_files = mock_zip.call_args[0][0]
    assert "cases.xlsx" in zip_files
    assert len(zip_files) == 1


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_no_images(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """案例无头像和 Offer 图时正常导出。"""
    case = _make_case(avatar_image_id=None, offer_image_id=None)
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))

    result = await service.export()

    assert result == b"zip-data"
    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("images/") for k in zip_files)


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_with_avatar(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """案例有头像时导出包含头像图片文件。"""
    case = _make_case(
        student_name="李四", avatar_image_id="img-av",
    )
    avatar_img = _make_image(
        id="img-av", mime_type="image/png",
        file_data=b"avatar-png-data",
    )
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))
    mock_img_repo.get_by_id = AsyncMock(return_value=avatar_img)

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert "images/李四_avatar.png" in zip_files
    assert zip_files["images/李四_avatar.png"] == b"avatar-png-data"


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_with_offer(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """案例有 Offer 图时导出包含 Offer 图文件。"""
    case = _make_case(
        student_name="王五", offer_image_id="img-of",
    )
    offer_img = _make_image(
        id="img-of", mime_type="image/jpeg",
        file_data=b"offer-jpg-data",
    )
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))
    mock_img_repo.get_by_id = AsyncMock(return_value=offer_img)

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert "images/王五_offer.jpg" in zip_files
    assert zip_files["images/王五_offer.jpg"] == b"offer-jpg-data"


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_avatar_not_found(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """案例有 avatar_image_id 但图片记录不存在时跳过。"""
    case = _make_case(avatar_image_id="img-missing")
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))
    mock_img_repo.get_by_id = AsyncMock(return_value=None)

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("images/") for k in zip_files)


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_offer_not_found(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """案例有 offer_image_id 但图片记录不存在时跳过。"""
    case = _make_case(offer_image_id="img-missing")
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))
    mock_img_repo.get_by_id = AsyncMock(return_value=None)

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("images/") for k in zip_files)


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_with_both_images(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """案例同时有头像和 Offer 图时两张都导出。"""
    case = _make_case(
        student_name="赵六",
        avatar_image_id="img-av",
        offer_image_id="img-of",
    )
    avatar_img = _make_image(
        id="img-av", mime_type="image/webp",
        file_data=b"avatar-webp",
    )
    offer_img = _make_image(
        id="img-of", mime_type="image/gif",
        file_data=b"offer-gif",
    )
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))
    mock_img_repo.get_by_id = AsyncMock(
        side_effect=lambda session, img_id: (
            avatar_img if img_id == "img-av" else offer_img
        )
    )

    await service.export()

    zip_files = mock_zip.call_args[0][0]
    assert "images/赵六_avatar.webp" in zip_files
    assert "images/赵六_offer.gif" in zip_files


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_export_featured_case(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """精选案例在 Excel 中标记为"是"。"""
    case = _make_case(is_featured=True)
    mock_repo.list_cases = AsyncMock(return_value=([case], 1))

    await service.export()

    assert mock_zip.called
