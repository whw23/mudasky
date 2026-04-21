"""学科分类导出服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository as disc_repo
from app.utils.excel_io import workbook_to_bytes, write_sheet_header


class DisciplineExportService:
    """学科分类导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def export_excel(self) -> bytes:
        """导出所有学科分类为 Excel。"""
        categories = await disc_repo.list_categories(self.session)

        wb = Workbook()
        ws = wb.active
        ws.title = "学科分类"
        write_sheet_header(ws, ["大分类", "小分类"])

        for cat in categories:
            disciplines = await disc_repo.list_disciplines(
                self.session, category_id=cat.id
            )
            for disc in disciplines:
                ws.append([cat.name, disc.name])

        return workbook_to_bytes(wb)
