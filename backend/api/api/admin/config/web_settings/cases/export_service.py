"""成功案例批量导出服务。

导出为 ZIP 格式，包含：
- cases.xlsx（单个 sheet：学生姓名 | 院校名称 | 专业 | 入学年份 | 感言 | 头像文件名 | Offer图文件名 | 是否精选 | 排序）
- images/ 目录（所有案例的头像 + Offer 图）
"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.case import repository
from app.db.image import repository as image_repo
from app.utils.excel_io import create_zip, workbook_to_bytes, write_sheet_header


class ExportService:
    """成功案例批量导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def export(self) -> bytes:
        """导出所有案例为 ZIP（包含 Excel + images/）。"""
        cases, _ = await repository.list_cases(
            self.session, offset=0, limit=10000
        )

        wb = Workbook()

        # 单个 sheet
        ws = wb.active
        ws.title = "成功案例"
        headers = [
            "学生姓名",
            "院校名称",
            "专业",
            "入学年份",
            "感言",
            "头像文件名",
            "Offer图文件名",
            "是否精选",
            "排序",
        ]
        write_sheet_header(ws, headers)

        # 收集图片文件
        image_files = {}  # {filename: bytes}

        for case in cases:
            # 头像文件名
            avatar_filename = None
            if case.avatar_image_id:
                avatar_image = await image_repo.get_by_id(
                    self.session, case.avatar_image_id
                )
                if avatar_image:
                    ext = self._get_extension(avatar_image.mime_type)
                    avatar_filename = f"{case.student_name}_avatar{ext}"
                    image_files[f"images/{avatar_filename}"] = (
                        avatar_image.file_data
                    )

            # Offer 图文件名
            offer_filename = None
            if case.offer_image_id:
                offer_image = await image_repo.get_by_id(
                    self.session, case.offer_image_id
                )
                if offer_image:
                    ext = self._get_extension(offer_image.mime_type)
                    offer_filename = f"{case.student_name}_offer{ext}"
                    image_files[f"images/{offer_filename}"] = (
                        offer_image.file_data
                    )

            # 写入行
            ws.append(
                [
                    case.student_name,
                    case.university,
                    case.program,
                    case.year,
                    case.testimonial,
                    avatar_filename,
                    offer_filename,
                    "是" if case.is_featured else "否",
                    case.sort_order,
                ]
            )

        # 打包 ZIP
        excel_bytes = workbook_to_bytes(wb)
        files = {"cases.xlsx": excel_bytes}
        files.update(image_files)

        return create_zip(files)

    def _get_extension(self, mime_type: str) -> str:
        """根据 MIME 类型获取文件扩展名。"""
        mime_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/svg+xml": ".svg",
        }
        return mime_map.get(mime_type, ".jpg")
