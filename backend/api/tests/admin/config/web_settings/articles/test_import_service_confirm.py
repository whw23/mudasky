"""ArticleImportService 单元测试 — preview / confirm。

测试文章批量导入的预览和确认导入逻辑。
"""

import io
import zipfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from openpyxl import Workbook

from api.admin.config.web_settings.articles.import_service import (
    ArticleImportService,
)
from app.core.exceptions import BadRequestException

from .conftest_import import (
    BASE64_TO_URLS,
    CONTENT_REPO,
    GENERATE_SLUG,
    IMAGE_REPO,
    create_valid_workbook,
    create_zip_with_excel,
    make_article,
    workbook_to_bytes,
)


@pytest.fixture
def service(mock_session) -> ArticleImportService:
    """构建 ArticleImportService 实例。"""
    return ArticleImportService(mock_session)


# ---- preview ----


@pytest.mark.asyncio
@patch(CONTENT_REPO)
async def test_preview_excel(mock_repo, service):
    """预览 Excel 文件返回 items/errors/summary。"""
    wb = create_valid_workbook()
    content = workbook_to_bytes(wb)
    mock_repo.get_article_by_title = AsyncMock(return_value=None)

    result = await service.preview(content, "cat-1", is_zip=False)

    assert len(result["items"]) == 1
    assert result["summary"]["new"] == 1
    assert result["available_files"] == []


@pytest.mark.asyncio
@patch(CONTENT_REPO)
async def test_preview_zip(mock_repo, service):
    """预览 ZIP 文件返回 items 和 available_files。"""
    wb = create_valid_workbook()
    zip_bytes = create_zip_with_excel(wb)
    mock_repo.get_article_by_title = AsyncMock(return_value=None)

    result = await service.preview(zip_bytes, "cat-1", is_zip=True)

    assert len(result["items"]) == 1
    assert len(result["available_files"]) > 0
    assert any(
        f.startswith("content/") for f in result["available_files"]
    )


@pytest.mark.asyncio
async def test_preview_zip_no_excel(service):
    """ZIP 中没有 Excel 文件抛出异常。"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("content/readme.txt", b"hello")

    with pytest.raises(BadRequestException):
        await service.preview(buf.getvalue(), "cat-1", is_zip=True)


@pytest.mark.asyncio
@patch(CONTENT_REPO)
async def test_preview_summary_counts(mock_repo, service):
    """预览 summary 正确统计 new/error。"""
    wb = Workbook()
    ws = wb.active
    ws.title = "文章"
    ws.append([
        "标题", "内容类型", "正文文件名", "摘要",
        "封面图文件名", "状态", "是否置顶",
    ])
    ws.append(["文章一", "html", "a.html", "摘要", None, "draft", "否"])
    ws.append(["文章二", "video", "b.mp4", "摘要", None, "draft", "否"])

    content = workbook_to_bytes(wb)
    mock_repo.get_article_by_title = AsyncMock(return_value=None)

    result = await service.preview(content, "cat-1", is_zip=False)

    assert result["summary"]["new"] == 1
    assert result["summary"]["error"] == 1


# ---- confirm ----


@pytest.mark.asyncio
@patch(GENERATE_SLUG)
@patch(BASE64_TO_URLS)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_confirm_create_html(
    mock_repo, mock_img_repo, mock_b64, mock_slug, service
):
    """确认导入创建 HTML 类型新文章。"""
    items = [{
        "status": "new",
        "data": {
            "title": "德国留学指南", "content_type": "html",
            "excerpt": "摘要", "category_id": "cat-1",
            "status": "published", "is_pinned": False,
        },
        "content_filename": "study-guide.html",
        "cover_image_filename": None,
    }]

    wb = create_valid_workbook()
    zip_bytes = create_zip_with_excel(wb)
    mock_b64.return_value = "<h1>Processed</h1>"
    mock_slug.return_value = "slug-1"
    mock_repo.create_article = AsyncMock(return_value=make_article())

    result = await service.confirm(
        items, "user-1", zip_bytes, is_zip=True
    )

    assert result == {"imported": 1, "updated": 0, "skipped": 0}
    mock_repo.create_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(GENERATE_SLUG)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_confirm_create_pdf(
    mock_repo, mock_img_repo, mock_slug, service
):
    """确认导入创建 PDF 类型新文章。"""
    items = [{
        "status": "new",
        "data": {
            "title": "签证指南", "content_type": "file",
            "excerpt": "PDF", "category_id": "cat-1",
            "status": "draft", "is_pinned": False,
        },
        "content_filename": "visa.pdf",
        "cover_image_filename": None,
    }]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("articles.xlsx", b"fake")
        zf.writestr("content/visa.pdf", b"fake-pdf-data")

    img = MagicMock()
    img.id = "img-1"
    mock_img_repo.create_image = AsyncMock(return_value=img)
    mock_slug.return_value = "slug-2"
    mock_repo.create_article = AsyncMock(return_value=make_article())

    result = await service.confirm(
        items, "user-1", buf.getvalue(), is_zip=True
    )

    assert result["imported"] == 1
    mock_img_repo.create_image.assert_awaited_once()


@pytest.mark.asyncio
@patch(GENERATE_SLUG)
@patch(BASE64_TO_URLS)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_confirm_create_with_cover(
    mock_repo, mock_img_repo, mock_b64, mock_slug, service
):
    """确认导入创建文章并上传封面图。"""
    items = [{
        "status": "new",
        "data": {
            "title": "德国留学指南", "content_type": "html",
            "excerpt": "摘要", "category_id": "cat-1",
            "status": "draft", "is_pinned": False,
        },
        "content_filename": "study-guide.html",
        "cover_image_filename": "cover.jpg",
    }]

    zip_bytes = create_zip_with_excel(create_valid_workbook())
    mock_b64.return_value = "<h1>Content</h1>"
    mock_slug.return_value = "slug-3"
    img = MagicMock()
    img.id = "img-cover"
    mock_img_repo.create_image = AsyncMock(return_value=img)
    mock_repo.create_article = AsyncMock(return_value=make_article())

    result = await service.confirm(
        items, "user-1", zip_bytes, is_zip=True
    )

    assert result["imported"] == 1
    mock_img_repo.create_image.assert_awaited_once()


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_confirm_update(mock_repo, mock_img_repo, service):
    """确认导入更新已有文章。"""
    existing = make_article(content_type="html")
    items = [{
        "status": "update",
        "data": {
            "title": "德国留学指南", "content_type": "html",
            "excerpt": "新摘要", "category_id": "cat-1",
            "status": "published", "is_pinned": True,
        },
        "content_filename": None,
        "cover_image_filename": None,
    }]

    mock_repo.get_article_by_title = AsyncMock(return_value=existing)
    mock_repo.update_article = AsyncMock(return_value=existing)

    result = await service.confirm(
        items, "user-1", b"fake", is_zip=False
    )

    assert result["updated"] == 1
    mock_repo.update_article.assert_awaited_once()


@pytest.mark.asyncio
async def test_confirm_skip_unchanged(service):
    """确认导入跳过 unchanged 条目。"""
    items = [{"status": "unchanged", "data": {"title": "不变"}}]

    result = await service.confirm(
        items, "user-1", b"fake", is_zip=False
    )

    assert result == {"imported": 0, "updated": 0, "skipped": 1}


@pytest.mark.asyncio
async def test_confirm_skip_on_exception(service):
    """确认导入时异常的行被跳过。"""
    items = [{
        "status": "new",
        "data": {
            "title": "失败", "content_type": "html",
            "excerpt": "", "category_id": "cat-1",
            "status": "draft", "is_pinned": False,
        },
        "content_filename": "missing.html",
        "cover_image_filename": None,
    }]

    result = await service.confirm(
        items, "user-1", b"fake", is_zip=False
    )

    assert result["skipped"] == 1
