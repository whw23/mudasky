"""院校批量导入服务。"""

import io
import zipfile

from fastapi import UploadFile
from openpyxl import Workbook, load_workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository as disc_repo
from app.db.discipline.models import (
    Discipline,
    DisciplineCategory,
)
from app.db.university import repository as uni_repo
from app.db.university import program_repository as prog_repo
from app.db.university.models import University


class ImportService:
    """院校批量导入服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def preview(self, file: UploadFile) -> dict:
        """解析上传文件，返回预览结果。"""
        content = await file.read()
        if file.filename and file.filename.endswith(".zip"):
            workbooks = self._extract_zip(content)
        else:
            workbooks = [load_workbook(io.BytesIO(content))]

        valid_rows = []
        error_rows = []
        all_disciplines = set()

        for wb in workbooks:
            try:
                row = self._parse_workbook(wb)
                valid_rows.append(row)
                all_disciplines.update(row.get("disciplines", []))
            except ValueError as e:
                error_rows.append({"error": str(e)})

        unknown = await self._find_unknown_disciplines(all_disciplines)

        return {
            "valid_rows": valid_rows,
            "error_rows": error_rows,
            "unknown_disciplines": unknown,
        }

    async def confirm(self, rows: list[dict], discipline_mappings: list[dict]) -> dict:
        """执行导入。"""
        await self._apply_discipline_mappings(discipline_mappings)

        imported = 0
        skipped = 0
        for row in rows:
            try:
                await self._import_university(row)
                imported += 1
            except Exception:
                skipped += 1

        return {"imported": imported, "skipped": skipped}

    def generate_template(self) -> bytes:
        """生成 Excel 导入模板。"""
        wb = Workbook()

        ws1 = wb.active
        ws1.title = "基本信息"
        fields = [
            "名称", "英文名", "国家", "省份", "城市",
            "网站", "描述", "录取要求", "奖学金信息",
            "纬度", "经度",
        ]
        examples = [
            "哈佛大学", "Harvard University", "美国",
            "马萨诸塞州", "剑桥", "https://harvard.edu",
            "世界顶尖学府", "GPA 3.8+, TOEFL 100+",
            "多种奖学金可申请", "42.377", "-71.1167",
        ]
        for i, (field, example) in enumerate(zip(fields, examples), 1):
            ws1.cell(row=i, column=1, value=field)
            ws1.cell(row=i, column=2, value=example)

        ws2 = wb.create_sheet("学科分类")
        ws2.append(["大分类", "学科"])
        ws2.append(["工学", "计算机科学"])
        ws2.append(["商学", "金融学"])

        ws3 = wb.create_sheet("QS排名")
        ws3.append(["年份", "排名"])
        ws3.append([2026, 4])
        ws3.append([2025, 5])

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    def _extract_zip(self, content: bytes) -> list[Workbook]:
        """从 zip 中提取所有 xlsx 文件。"""
        workbooks = []
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for name in zf.namelist():
                if name.endswith(".xlsx") and not name.startswith("__"):
                    data = zf.read(name)
                    workbooks.append(load_workbook(io.BytesIO(data)))
        return workbooks

    def _parse_workbook(self, wb: Workbook) -> dict:
        """解析单个 workbook 为院校数据。"""
        ws1 = wb["基本信息"]
        info = {}
        for row in ws1.iter_rows(min_row=1, max_col=2, values_only=True):
            if row[0] and row[1]:
                info[str(row[0]).strip()] = row[1]

        if "名称" not in info:
            raise ValueError("缺少必填字段：名称")
        if "国家" not in info:
            raise ValueError("缺少必填字段：国家")
        if "城市" not in info:
            raise ValueError("缺少必填字段：城市")

        disciplines = []
        if "学科分类" in wb.sheetnames:
            ws2 = wb["学科分类"]
            for row in ws2.iter_rows(min_row=2, max_col=2, values_only=True):
                if row[0] and row[1]:
                    disciplines.append(f"{str(row[0]).strip()}/{str(row[1]).strip()}")

        qs_rankings = []
        if "QS排名" in wb.sheetnames:
            ws3 = wb["QS排名"]
            for row in ws3.iter_rows(min_row=2, max_col=2, values_only=True):
                if row[0] and row[1]:
                    qs_rankings.append({"year": int(row[0]), "ranking": int(row[1])})

        return {
            **info,
            "disciplines": disciplines,
            "qs_rankings": qs_rankings or None,
        }

    async def _find_unknown_disciplines(self, disc_paths: set[str]) -> list[str]:
        """查找系统中不存在的学科分类。"""
        unknown = []
        for path in disc_paths:
            parts = path.split("/", 1)
            if len(parts) != 2:
                unknown.append(path)
                continue
            cat_name, disc_name = parts
            cat = await disc_repo.get_category_by_name(self.session, cat_name)
            if not cat:
                unknown.append(path)
                continue
            disc = await disc_repo.get_discipline_by_name(self.session, cat.id, disc_name)
            if not disc:
                unknown.append(path)
        return unknown

    async def _apply_discipline_mappings(self, mappings: list[dict]) -> None:
        """根据用户决策创建或映射学科。"""
        for m in mappings:
            if m.get("action") == "create":
                parts = m["name"].split("/", 1)
                if len(parts) != 2:
                    continue
                cat_name, disc_name = parts
                cat = await disc_repo.get_category_by_name(self.session, cat_name)
                if not cat:
                    cat = DisciplineCategory(name=cat_name)
                    cat = await disc_repo.create_category(self.session, cat)
                disc = Discipline(category_id=cat.id, name=disc_name)
                await disc_repo.create_discipline(self.session, disc)

    async def _import_university(self, row: dict) -> University:
        """导入单个院校。"""
        university = University(
            name=row["名称"],
            name_en=row.get("英文名"),
            country=row["国家"],
            province=row.get("省份"),
            city=row["城市"],
            website=row.get("网站"),
            description=row.get("描述"),
            admission_requirements=row.get("录取要求"),
            scholarship_info=row.get("奖学金信息"),
            qs_rankings=row.get("qs_rankings"),
            latitude=float(row["纬度"]) if row.get("纬度") else None,
            longitude=float(row["经度"]) if row.get("经度") else None,
        )
        university = await uni_repo.create_university(self.session, university)

        # Create programs from disciplines
        programs = []
        for path in row.get("disciplines", []):
            parts = path.split("/", 1)
            if len(parts) != 2:
                continue
            cat = await disc_repo.get_category_by_name(self.session, parts[0])
            if cat:
                disc = await disc_repo.get_discipline_by_name(self.session, cat.id, parts[1])
                if disc:
                    programs.append({
                        "name": disc.name,
                        "discipline_id": disc.id,
                    })
        if programs:
            await prog_repo.replace_programs(self.session, university.id, programs)

        return university
