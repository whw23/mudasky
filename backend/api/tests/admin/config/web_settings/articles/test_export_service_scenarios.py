"""ArticleExportService 单元测试（封面图、置顶等场景）。

测试文章批量导出的封面图处理和其他边界场景。
使用 mock 隔离数据库层和文件工具。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.articles.export_service import (
    ArticleExportService,
)

MODULE = "api.admin.config.web_settings.articles.export_service"
CONTENT_REPO = f"{MODULE}.repository"
IMAGE_REPO = f"{MODULE}.image_repo"
CREATE_ZIP = f"{MODULE}.create_zip"
WB_TO_BYTES = f"{MODULE}.workbook_to_bytes"
WRITE_HEADER = f"{MODULE}.write_sheet_header"
URLS_TO_BASE64 = f"{MODULE}.urls_to_base64"


def _make_article(**kwargs) -> MagicMock:
    """创建模拟 Article 对象。"""
    a = MagicMock()
    a.slug = kwargs.get("slug", "test-article")
    a.title = kwargs.get("title", "测试文章")
    a.content_type = kwargs.get("content_type", "html")
    a.content = kwargs.get("content", "<p>内容</p>")
    a.file_id = kwargs.get("file_id", None)
    a.excerpt = kwargs.get("excerpt", "摘要")
    a.cover_image = kwargs.get("cover_image", None)
    a.status = kwargs.get("status", "published")
    a.is_pinned = kwargs.get("is_pinned", False)
    return a


def _make_image(**kwargs) -> MagicMock:
    """创建模拟 Image 对象。"""
    img = MagicMock()
    img.id = kwargs.get("id", "img-1")
    img.mime_type = kwargs.get("mime_type", "image/jpeg")
    img.file_data = kwargs.get("file_data", b"fake-image-data")
    return img


@pytest.fixture
def service(mock_session) -> ArticleExportService:
    """构建 ArticleExportService 实例，注入 mock session。"""
    return ArticleExportService(mock_session)


# ---- 封面图场景 ----


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(URLS_TO_BASE64, new_callable=AsyncMock, return_value="<p>ok</p>")
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_with_cover_image(
    mock_repo, mock_img_repo, mock_urls,
    mock_header, mock_wb, mock_zip, service,
):
    """文章有封面图时导出包含封面图文件。"""
    article = _make_article(
        slug="cover-post", content_type="html",
        cover_image="/api/public/images/detail?id=img-cover",
    )
    cover_img = _make_image(
        id="img-cover", mime_type="image/png",
        file_data=b"cover-png-data",
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )
    mock_img_repo.get_by_id = AsyncMock(return_value=cover_img)

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    assert "content/cover-post_cover.png" in zip_files
    assert zip_files["content/cover-post_cover.png"] == b"cover-png-data"


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(URLS_TO_BASE64, new_callable=AsyncMock, return_value="<p>ok</p>")
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_cover_image_not_found(
    mock_repo, mock_img_repo, mock_urls,
    mock_header, mock_wb, mock_zip, service,
):
    """封面图 ID 存在但记录不存在时跳过。"""
    article = _make_article(
        slug="no-cover", content_type="html",
        cover_image="/api/public/images/detail?id=img-missing",
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )
    mock_img_repo.get_by_id = AsyncMock(return_value=None)

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    cover_keys = [
        k for k in zip_files if k.endswith("_cover.png")
        or k.endswith("_cover.jpg")
    ]
    assert len(cover_keys) == 0


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(URLS_TO_BASE64, new_callable=AsyncMock, return_value="<p>ok</p>")
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_cover_image_no_id_param(
    mock_repo, mock_img_repo, mock_urls,
    mock_header, mock_wb, mock_zip, service,
):
    """封面图 URL 不含 id= 参数时跳过封面图。"""
    article = _make_article(
        slug="no-id-param", content_type="html",
        cover_image="/some/other/url",
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    cover_keys = [k for k in zip_files if "_cover" in k]
    assert len(cover_keys) == 0


# ---- 其他场景 ----


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(URLS_TO_BASE64, new_callable=AsyncMock, return_value="<p>ok</p>")
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_pinned_article(
    mock_repo, mock_img_repo, mock_urls,
    mock_header, mock_wb, mock_zip, service,
):
    """置顶文章导出时正常打包。"""
    article = _make_article(
        slug="pinned", content_type="html", is_pinned=True,
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )

    await service.export_zip("cat-1")

    assert mock_zip.called
