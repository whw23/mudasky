"""ArticleExportService 单元测试（初始化、扩展名、基础导出）。

测试文章批量导出的初始化、MIME 类型映射和基础导出场景。
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


# ---- __init__ ----


def test_init_sets_session(mock_session):
    """初始化时正确注入 session。"""
    svc = ArticleExportService(mock_session)
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


def test_get_extension_pdf(service):
    """PDF 类型返回 .pdf 扩展名。"""
    assert service._get_extension("application/pdf") == ".pdf"


def test_get_extension_unknown(service):
    """未知类型默认返回 .jpg 扩展名。"""
    assert service._get_extension("application/octet-stream") == ".jpg"


def test_get_extension_empty(service):
    """空字符串默认返回 .jpg 扩展名。"""
    assert service._get_extension("") == ".jpg"


# ---- export_zip（基础场景） ----


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_empty(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """无文章时导出空 Excel ZIP。"""
    mock_repo.list_articles_by_category = AsyncMock(return_value=[])

    result = await service.export_zip("cat-1")

    assert result == b"zip-data"
    mock_repo.list_articles_by_category.assert_awaited_once_with(
        service.session, "cat-1"
    )
    mock_zip.assert_called_once()
    zip_files = mock_zip.call_args[0][0]
    assert "articles.xlsx" in zip_files
    assert len(zip_files) == 1


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(URLS_TO_BASE64, new_callable=AsyncMock, return_value="<p>converted</p>")
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_html_article(
    mock_repo, mock_img_repo, mock_urls,
    mock_header, mock_wb, mock_zip, service,
):
    """HTML 文章导出包含 .html 内容文件。"""
    article = _make_article(
        slug="my-post", content_type="html",
        content="<p>hello</p>",
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    assert "content/my-post.html" in zip_files
    assert zip_files["content/my-post.html"] == b"<p>converted</p>"


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_file_article_with_pdf(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """PDF 文章导出包含 PDF 文件。"""
    article = _make_article(
        slug="pdf-post", content_type="file",
        file_id="file-1",
    )
    pdf_image = _make_image(
        id="file-1", mime_type="application/pdf",
        file_data=b"pdf-data",
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )
    mock_img_repo.get_by_id = AsyncMock(return_value=pdf_image)

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    assert "content/pdf-post.pdf" in zip_files
    assert zip_files["content/pdf-post.pdf"] == b"pdf-data"


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_file_no_file_id(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """文件类型文章无 file_id 时跳过内容文件。"""
    article = _make_article(
        slug="no-file", content_type="file", file_id=None,
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("content/") for k in zip_files)


@pytest.mark.asyncio
@patch(CREATE_ZIP, return_value=b"zip-data")
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(IMAGE_REPO)
@patch(CONTENT_REPO)
async def test_export_file_not_found(
    mock_repo, mock_img_repo,
    mock_header, mock_wb, mock_zip, service,
):
    """文件类型文章 file_id 存在但记录不存在时跳过。"""
    article = _make_article(
        slug="missing", content_type="file", file_id="file-gone",
    )
    mock_repo.list_articles_by_category = AsyncMock(
        return_value=[article]
    )
    mock_img_repo.get_by_id = AsyncMock(return_value=None)

    await service.export_zip("cat-1")

    zip_files = mock_zip.call_args[0][0]
    assert not any(k.startswith("content/") for k in zip_files)
