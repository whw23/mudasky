"""ArticleImportService 测试共用工具。

提供 mock 工厂函数和测试数据构建方法。
"""

import io
import zipfile
from unittest.mock import MagicMock

from openpyxl import Workbook

from app.db.content.models import Article

CONTENT_REPO = (
    "api.admin.config.web_settings.articles.import_service.repository"
)
IMAGE_REPO = (
    "api.admin.config.web_settings.articles.import_service.image_repo"
)
BASE64_TO_URLS = (
    "api.admin.config.web_settings.articles"
    ".import_service.base64_to_urls"
)
GENERATE_SLUG = (
    "api.admin.config.web_settings.articles"
    ".import_service.generate_unique_slug"
)


def make_article(article_id: str = "art-1", **kwargs) -> MagicMock:
    """创建模拟 Article 对象。"""
    art = MagicMock(spec=Article)
    art.id = article_id
    art.title = kwargs.get("title", "德国留学指南")
    art.content_type = kwargs.get("content_type", "html")
    art.content = kwargs.get("content", "<p>内容</p>")
    art.file_id = kwargs.get("file_id", None)
    art.excerpt = kwargs.get("excerpt", "摘要")
    art.cover_image = kwargs.get("cover_image", None)
    art.category_id = kwargs.get("category_id", "cat-1")
    art.author_id = kwargs.get("author_id", "user-1")
    art.status = kwargs.get("status", "draft")
    art.is_pinned = kwargs.get("is_pinned", False)
    return art


def create_valid_workbook() -> Workbook:
    """创建符合文章导入格式的 workbook。"""
    wb = Workbook()
    ws = wb.active
    ws.title = "文章"
    ws.append([
        "标题", "内容类型", "正文文件名", "摘要",
        "封面图文件名", "状态", "是否置顶",
    ])
    ws.append([
        "德国留学指南", "html", "study-guide.html",
        "一篇关于德国留学的指南", "cover.jpg",
        "published", "是",
    ])
    return wb


def workbook_to_bytes(wb: Workbook) -> bytes:
    """将 workbook 转换为字节。"""
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def create_zip_with_excel(wb: Workbook) -> bytes:
    """创建包含 Excel 和 content/ 文件的 ZIP。"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("articles.xlsx", workbook_to_bytes(wb))
        zf.writestr(
            "content/study-guide.html",
            b"<h1>Study Guide</h1>",
        )
        zf.writestr("content/cover.jpg", b"fake-image-data")
    return buf.getvalue()
