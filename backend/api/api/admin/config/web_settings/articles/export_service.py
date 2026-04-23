"""文章批量导出服务。

导出为 ZIP 格式，包含：
- articles.xlsx（单个 sheet）
- content/ 目录（HTML 文件 + PDF 文件 + 封面图）

仅导出指定 category_id 下的文章。
"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.content import repository
from app.db.image import repository as image_repo
from app.utils.excel_io import create_zip, workbook_to_bytes, write_sheet_header
from app.utils.html_images import urls_to_base64


class ArticleExportService:
    """文章批量导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def export_zip(self, category_id: str) -> bytes:
        """导出指定分类下的所有文章为 ZIP（包含 Excel + content/）。"""
        articles = await repository.list_articles_by_category(
            self.session, category_id
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "文章"
        headers = [
            "标题",
            "内容类型",
            "正文文件名",
            "摘要",
            "封面图文件名",
            "状态",
            "是否置顶",
        ]
        write_sheet_header(ws, headers)

        # 收集内容文件
        content_files = {}  # {filename: bytes}

        for article in articles:
            # 正文文件名
            content_filename = None
            if article.content_type == "html":
                content_filename = f"{article.slug}.html"
                html_content = await urls_to_base64(self.session, article.content)
                content_files[f"content/{content_filename}"] = html_content.encode(
                    "utf-8"
                )
            else:  # file (PDF)
                if article.file_id:
                    file_image = await image_repo.get_by_id(
                        self.session, article.file_id
                    )
                    if file_image:
                        ext = self._get_extension(file_image.mime_type)
                        content_filename = f"{article.slug}{ext}"
                        content_files[f"content/{content_filename}"] = (
                            file_image.file_data
                        )

            # 封面图文件名
            cover_image_filename = None
            if article.cover_image:
                # 解析 URL: /api/public/images/detail?id={image_id}
                if "id=" in article.cover_image:
                    image_id = article.cover_image.split("id=")[-1]
                    cover_image = await image_repo.get_by_id(
                        self.session, image_id
                    )
                    if cover_image:
                        ext = self._get_extension(cover_image.mime_type)
                        cover_image_filename = f"{article.slug}_cover{ext}"
                        content_files[f"content/{cover_image_filename}"] = (
                            cover_image.file_data
                        )

            # 写入行
            ws.append(
                [
                    article.title,
                    article.content_type,
                    content_filename,
                    article.excerpt,
                    cover_image_filename,
                    article.status,
                    "是" if article.is_pinned else "否",
                ]
            )

        # 打包 ZIP
        excel_bytes = workbook_to_bytes(wb)
        files = {"articles.xlsx": excel_bytes}
        files.update(content_files)

        return create_zip(files)

    def _get_extension(self, mime_type: str) -> str:
        """根据 MIME 类型获取文件扩展名。"""
        mime_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/svg+xml": ".svg",
            "application/pdf": ".pdf",
        }
        return mime_map.get(mime_type, ".jpg")
