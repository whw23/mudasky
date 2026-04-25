"""ImportService（成功案例）单元测试 — preview / confirm。

测试成功案例批量导入的预览和确认导入逻辑。
"""

import io
import zipfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from openpyxl import Workbook

from api.admin.config.web_settings.cases.import_service import (
    ImportService,
)
from app.core.exceptions import BadRequestException

from .conftest_import import (
    CASE_REPO,
    IMAGE_REPO,
    UNI_REPO,
    create_valid_workbook,
    create_zip_with_excel,
    make_case,
    make_upload_file,
    workbook_to_bytes,
)


@pytest.fixture
def service(mock_session) -> ImportService:
    """构建 ImportService 实例。"""
    return ImportService(mock_session)


# ---- preview ----


@pytest.mark.asyncio
@patch(UNI_REPO)
@patch(CASE_REPO)
async def test_preview_excel(mock_repo, mock_uni_repo, service):
    """预览 Excel 文件返回 items/errors/summary。"""
    wb = create_valid_workbook()
    file = make_upload_file(workbook_to_bytes(wb), "test.xlsx")
    mock_repo.find_case = AsyncMock(return_value=None)
    mock_uni_repo.get_university_by_name = AsyncMock(return_value=None)

    result = await service.preview(file)

    assert len(result["items"]) == 1
    assert result["summary"]["new"] == 1
    assert result["available_images"] == []


@pytest.mark.asyncio
@patch(UNI_REPO)
@patch(CASE_REPO)
async def test_preview_zip(mock_repo, mock_uni_repo, service):
    """预览 ZIP 文件返回 items 和 available_images。"""
    wb = create_valid_workbook()
    file = make_upload_file(create_zip_with_excel(wb), "cases.zip")
    mock_repo.find_case = AsyncMock(return_value=None)
    mock_uni_repo.get_university_by_name = AsyncMock(return_value=None)

    result = await service.preview(file)

    assert len(result["items"]) == 1
    assert len(result["available_images"]) == 2
    assert any(i.startswith("images/") for i in result["available_images"])


@pytest.mark.asyncio
async def test_preview_zip_no_excel(service):
    """ZIP 中没有 Excel 文件抛出异常。"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("images/photo.jpg", b"fake")

    file = make_upload_file(buf.getvalue(), "cases.zip")

    with pytest.raises(BadRequestException):
        await service.preview(file)


@pytest.mark.asyncio
@patch(UNI_REPO)
@patch(CASE_REPO)
async def test_preview_summary_counts(mock_repo, mock_uni_repo, service):
    """预览 summary 正确统计 new/error。"""
    wb = Workbook()
    ws = wb.active
    ws.title = "成功案例"
    _h = ["学生姓名", "院校", "专业", "年份", "感言", "头像", "Offer", "精选", "排序"]
    ws.append(_h)
    ws.append(["张三", "哈佛", "CS", 2026, None, None, None, None, None])
    ws.append(["李四", "MIT", None, 2026, None, None, None, None, None])

    file = make_upload_file(workbook_to_bytes(wb), "test.xlsx")
    mock_repo.find_case = AsyncMock(return_value=None)
    mock_uni_repo.get_university_by_name = AsyncMock(return_value=None)

    result = await service.preview(file)

    assert result["summary"]["new"] == 1
    assert result["summary"]["error"] == 1


# ---- confirm ----


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_confirm_create_case(mock_repo, mock_img_repo, service):
    """确认导入创建新案例。"""
    items = [{
        "status": "new",
        "data": {
            "student_name": "张三", "university": "哈佛大学",
            "program": "CS", "year": 2026, "testimonial": "感谢",
            "is_featured": False, "sort_order": 0, "university_id": None,
        },
        "avatar_filename": None, "offer_filename": None,
    }]

    mock_repo.create_case = AsyncMock(return_value=make_case())
    file = make_upload_file(b"fake", "test.xlsx")
    result = await service.confirm(file, items)

    assert result == {"imported": 1, "updated": 0, "skipped": 0}
    mock_repo.create_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_confirm_create_with_images(mock_repo, mock_img_repo, service):
    """确认导入创建案例并上传图片。"""
    items = [{
        "status": "new",
        "data": {
            "student_name": "张三", "university": "哈佛大学",
            "program": "CS", "year": 2026, "testimonial": None,
            "is_featured": True, "sort_order": 1, "university_id": None,
        },
        "avatar_filename": "张三_avatar.jpg",
        "offer_filename": "张三_offer.jpg",
    }]

    case = make_case()
    mock_repo.create_case = AsyncMock(return_value=case)
    mock_repo.update_case = AsyncMock(return_value=case)
    img = MagicMock()
    img.id = "img-1"
    mock_img_repo.create_image = AsyncMock(return_value=img)

    zip_bytes = create_zip_with_excel(create_valid_workbook())
    file = make_upload_file(zip_bytes, "cases.zip")
    result = await service.confirm(file, items)

    assert result["imported"] == 1
    assert mock_img_repo.create_image.await_count == 2


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_confirm_update_case(mock_repo, mock_img_repo, service):
    """确认导入更新已有案例。"""
    existing = make_case()
    items = [{
        "status": "update",
        "data": {
            "student_name": "张三", "university": "哈佛大学",
            "program": "物理学", "year": 2026, "testimonial": "新感言",
            "is_featured": True, "sort_order": 1, "university_id": None,
        },
        "avatar_filename": None, "offer_filename": None,
    }]

    mock_repo.find_case = AsyncMock(return_value=existing)
    mock_repo.update_case = AsyncMock(return_value=existing)

    file = make_upload_file(b"fake", "test.xlsx")
    result = await service.confirm(file, items)

    assert result["updated"] == 1
    mock_repo.update_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CASE_REPO)
async def test_confirm_update_with_images(mock_repo, mock_img_repo, service):
    """确认导入更新案例并上传新图片。"""
    existing = make_case()
    items = [{
        "status": "update",
        "data": {
            "student_name": "张三", "university": "哈佛大学",
            "program": "CS", "year": 2026, "testimonial": None,
            "is_featured": False, "sort_order": 0, "university_id": None,
        },
        "avatar_filename": "张三_avatar.jpg",
        "offer_filename": "张三_offer.jpg",
    }]

    mock_repo.find_case = AsyncMock(return_value=existing)
    mock_repo.update_case = AsyncMock(return_value=existing)
    img = MagicMock()
    img.id = "img-new"
    mock_img_repo.create_image = AsyncMock(return_value=img)

    zip_bytes = create_zip_with_excel(create_valid_workbook())
    file = make_upload_file(zip_bytes, "cases.zip")
    result = await service.confirm(file, items)

    assert result["updated"] == 1
    assert mock_img_repo.create_image.await_count == 2


@pytest.mark.asyncio
async def test_confirm_skip_unchanged(service):
    """确认导入跳过 unchanged 条目。"""
    items = [{"status": "unchanged", "data": {"student_name": "张三"}}]

    file = make_upload_file(b"fake", "test.xlsx")
    result = await service.confirm(file, items)

    assert result == {"imported": 0, "updated": 0, "skipped": 1}


@pytest.mark.asyncio
@patch(CASE_REPO)
async def test_confirm_skip_on_exception(mock_repo, service):
    """确认导入时异常的行被跳过。"""
    items = [{
        "status": "update",
        "data": {"student_name": "张三", "university": "哈佛", "year": 2026},
        "avatar_filename": None, "offer_filename": None,
    }]

    mock_repo.find_case = AsyncMock(return_value=None)
    file = make_upload_file(b"fake", "test.xlsx")
    result = await service.confirm(file, items)

    assert result["skipped"] == 1
