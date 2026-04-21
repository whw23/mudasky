# Excel 导入导出 + 院校专业模型改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为学科分类、院校、成功案例、文章四类数据实现 Excel 批量导入（merge 策略）、导出（ZIP 打包）、模板下载，同时将院校专业从 JSONB 改为独立关联表。

**Architecture:** 后端 Python (FastAPI + SQLAlchemy + openpyxl) 实现数据模型改造和导入导出服务，前端 React (Next.js + shadcn/ui) 实现工具栏和预览弹窗。每类数据独立实现导入导出逻辑，共享 `excel_io.py` 工具函数。导入采用 preview → confirm 两阶段工作流，支持 merge（有值覆盖、空值保留）。

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy (async), openpyxl, zipfile; Next.js, React, TypeScript, shadcn/ui, Tailwind CSS

---

## File Map

### Backend — New Files

| File | Responsibility |
|------|----------------|
| `backend/shared/app/db/university/program_models.py` | UniversityProgram SQLAlchemy 模型 |
| `backend/shared/app/db/university/program_repository.py` | UniversityProgram CRUD |
| `backend/shared/app/utils/excel_io.py` | 通用 Excel/ZIP 读写工具 |
| `backend/api/api/admin/config/web_settings/disciplines/import_service.py` | 学科分类导入 |
| `backend/api/api/admin/config/web_settings/disciplines/export_service.py` | 学科分类导出 |
| `backend/api/api/admin/config/web_settings/universities/export_service.py` | 院校导出 |
| `backend/api/api/admin/config/web_settings/cases/import_service.py` | 案例导入 |
| `backend/api/api/admin/config/web_settings/cases/export_service.py` | 案例导出 |
| `backend/api/api/admin/config/web_settings/articles/import_service.py` | 文章导入 |
| `backend/api/api/admin/config/web_settings/articles/export_service.py` | 文章导出 |

### Backend — Modified Files

| File | Changes |
|------|---------|
| `backend/shared/app/db/university/models.py` | 删除 `programs` 列 |
| `backend/shared/app/db/discipline/models.py` | 删除 `UniversityDiscipline` 类 |
| `backend/shared/app/db/discipline/repository.py` | 删除 `set_university_disciplines` 等方法，添加按名称查询 |
| `backend/shared/app/db/university/repository.py` | 移除 programs 相关逻辑 |
| `backend/api/api/admin/config/web_settings/universities/import_service.py` | 完全重写 |
| `backend/api/api/admin/config/web_settings/universities/router.py` | 新增 export 路由，改造 import 路由 |
| `backend/api/api/admin/config/web_settings/universities/service.py` | 替换 disciplines → programs |
| `backend/api/api/admin/config/web_settings/universities/schemas.py` | 替换 programs 字段 |
| `backend/api/api/admin/config/web_settings/disciplines/router.py` | 新增 import/export 路由 |
| `backend/api/api/admin/config/web_settings/cases/router.py` | 新增 import/export 路由 |
| `backend/api/api/admin/config/web_settings/articles/router.py` | 新增 import/export 路由 |
| `backend/alembic/env.py` | 导入新模型 |

### Frontend — New Files

| File | Responsibility |
|------|----------------|
| `frontend/components/admin/ImportExportToolbar.tsx` | 下载模板/导入/导出三按钮工具栏 |
| `frontend/components/admin/ImportPreviewDialog.tsx` | 导入预览弹窗（表格+冲突+确认） |

### Frontend — Modified Files

| File | Changes |
|------|---------|
| `frontend/components/admin/web-settings/UniversitiesEditPreview.tsx` | 添加工具栏，改造学科/专业 UI |
| `frontend/components/admin/web-settings/UniversityEditDialog.tsx` | 替换 programs 为专业管理 UI |
| `frontend/components/admin/web-settings/CasesEditPreview.tsx` | 添加工具栏 |
| `frontend/components/admin/web-settings/ArticleListPreview.tsx` | 添加工具栏 |

---

### Task 1: 数据模型改造 — UniversityProgram + 清理旧结构

**Files:**
- Create: `backend/shared/app/db/university/program_models.py`
- Create: `backend/shared/app/db/university/program_repository.py`
- Modify: `backend/shared/app/db/university/models.py`
- Modify: `backend/shared/app/db/discipline/models.py`
- Modify: `backend/shared/app/db/discipline/repository.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/service.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/schemas.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/router.py`
- Modify: `backend/alembic/env.py`

- [ ] **Step 1: 创建 UniversityProgram 模型**

创建 `backend/shared/app/db/university/program_models.py`：

```python
"""院校专业模型。"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.db.base import Base


class UniversityProgram(Base):
    """院校专业，关联学科小分类。"""

    __tablename__ = "university_program"
    __table_args__ = (
        UniqueConstraint("university_id", "name", name="uq_university_program"),
    )

    id = Column(String(36), primary_key=True)
    university_id = Column(
        String(36),
        ForeignKey("university.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(200), nullable=False)
    discipline_id = Column(
        String(36),
        ForeignKey("discipline.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
```

- [ ] **Step 2: 创建 UniversityProgram repository**

创建 `backend/shared/app/db/university/program_repository.py`：

```python
"""院校专业数据访问。"""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .program_models import UniversityProgram


async def list_programs(session: AsyncSession, university_id: str) -> list[UniversityProgram]:
    """获取院校的所有专业。"""
    stmt = (
        select(UniversityProgram)
        .where(UniversityProgram.university_id == university_id)
        .order_by(UniversityProgram.sort_order)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_program(
    session: AsyncSession,
    university_id: str,
    name: str,
    discipline_id: str,
    sort_order: int = 0,
) -> UniversityProgram:
    """创建专业。"""
    program = UniversityProgram(
        id=str(uuid.uuid4()),
        university_id=university_id,
        name=name,
        discipline_id=discipline_id,
        sort_order=sort_order,
    )
    session.add(program)
    await session.flush()
    return program


async def delete_program(session: AsyncSession, program_id: str) -> None:
    """删除专业。"""
    stmt = delete(UniversityProgram).where(UniversityProgram.id == program_id)
    await session.execute(stmt)


async def replace_programs(
    session: AsyncSession,
    university_id: str,
    programs: list[dict],
) -> list[UniversityProgram]:
    """替换院校的所有专业。"""
    stmt = delete(UniversityProgram).where(
        UniversityProgram.university_id == university_id
    )
    await session.execute(stmt)

    result = []
    for i, p in enumerate(programs):
        prog = UniversityProgram(
            id=str(uuid.uuid4()),
            university_id=university_id,
            name=p["name"],
            discipline_id=p["discipline_id"],
            sort_order=i,
        )
        session.add(prog)
        result.append(prog)
    await session.flush()
    return result
```

- [ ] **Step 3: 删除 University.programs 列**

修改 `backend/shared/app/db/university/models.py`，删除 `programs` 列：

```python
# 删除这一行：
programs = Column(JSONB, nullable=False, server_default="[]")
```

同时删除该文件中对 JSONB 的 import（如果没有其他列使用 JSONB 的话）。保留 `qs_rankings` 如果它也用 JSONB。

- [ ] **Step 4: 删除 UniversityDiscipline 模型**

修改 `backend/shared/app/db/discipline/models.py`，删除整个 `UniversityDiscipline` 类。

- [ ] **Step 5: 清理 discipline repository**

修改 `backend/shared/app/db/discipline/repository.py`：

1. 删除 `set_university_disciplines()` 函数
2. 删除 `discipline_has_universities()` 函数（或改为检查 UniversityProgram）
3. 添加按名称查询的便捷方法：

```python
async def get_category_by_name(session: AsyncSession, name: str) -> DisciplineCategory | None:
    """按名称查询大分类。"""
    stmt = select(DisciplineCategory).where(DisciplineCategory.name == name)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_discipline_by_name(
    session: AsyncSession, category_id: str, name: str
) -> Discipline | None:
    """按名称查询小分类。"""
    stmt = select(Discipline).where(
        Discipline.category_id == category_id,
        Discipline.name == name,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
```

注意：这两个函数可能已经存在（现有 import_service 调用了它们），检查后保留或添加。

- [ ] **Step 6: 更新 university schemas**

修改 `backend/api/api/admin/config/web_settings/universities/schemas.py`：

1. 删除 `programs: list[str]` 字段
2. 在 `UniversityResponse` 中添加 programs 嵌套响应：

```python
class ProgramResponse(BaseModel):
    """专业响应。"""
    id: str
    name: str
    discipline_id: str
    sort_order: int

class UniversityResponse(BaseModel):
    """院校响应。"""
    # ... 现有字段 ...
    programs: list[ProgramResponse] = []
```

3. 添加专业管理的请求 schema：

```python
class ProgramItem(BaseModel):
    """专业条目。"""
    name: str
    discipline_id: str

class SetProgramsRequest(BaseModel):
    """设置专业请求。"""
    university_id: str
    programs: list[ProgramItem]
```

- [ ] **Step 7: 更新 university service**

修改 `backend/api/api/admin/config/web_settings/universities/service.py`：

1. 删除 `set_disciplines()` 方法
2. 添加 `set_programs()` 方法：

```python
async def set_programs(
    self, university_id: str, programs: list[dict]
) -> list:
    """设置院校专业。"""
    university = await uni_repo.get_university(self.session, university_id)
    if not university:
        raise AppException(status_code=404, code="NOT_FOUND", message="院校不存在")

    for p in programs:
        disc = await disc_repo.get_discipline(self.session, p["discipline_id"])
        if not disc:
            raise AppException(
                status_code=400,
                code="DISCIPLINE_NOT_FOUND",
                message=f"学科不存在: {p['discipline_id']}",
            )

    return await prog_repo.replace_programs(self.session, university_id, programs)
```

3. 更新 `list_universities()` 返回值，包含 programs 数据

- [ ] **Step 8: 更新 university router**

修改 `backend/api/api/admin/config/web_settings/universities/router.py`：

1. 将 `POST /list/detail/disciplines` 端点改为 `POST /list/detail/programs`
2. 使用新的 `SetProgramsRequest` schema
3. 在 `GET /list` 响应中包含 programs

- [ ] **Step 9: 更新 alembic env.py**

修改 `backend/alembic/env.py`，添加新模型导入：

```python
from app.db.university.program_models import UniversityProgram  # noqa: F401
```

- [ ] **Step 10: 重建数据库**

```bash
docker compose down -v
docker compose up -d
```

等待所有容器 healthy。

- [ ] **Step 11: 生成 alembic 迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "add_university_program_remove_old"
```

检查生成的迁移文件，确认包含：
- 创建 `university_program` 表
- 删除 `university_discipline` 表
- 删除 `university.programs` 列

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor: 院校专业模型改造 — UniversityProgram 替换 programs JSONB + UniversityDiscipline"
```

---

### Task 2: 通用 Excel 工具 + 学科分类导入导出

**Files:**
- Create: `backend/shared/app/utils/excel_io.py`
- Create: `backend/api/api/admin/config/web_settings/disciplines/import_service.py`
- Create: `backend/api/api/admin/config/web_settings/disciplines/export_service.py`
- Modify: `backend/api/api/admin/config/web_settings/disciplines/router.py`

- [ ] **Step 1: 创建通用 Excel/ZIP 工具**

创建 `backend/shared/app/utils/excel_io.py`：

```python
"""Excel/ZIP 读写通用工具。"""

import io
import zipfile

from openpyxl import Workbook, load_workbook
from openpyxl.worksheet.worksheet import Worksheet


def read_sheet_rows(ws: Worksheet, skip_header: bool = True) -> list[list]:
    """读取 sheet 所有行，返回二维列表。"""
    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append(list(row))
    return rows[1:] if skip_header else rows


def write_sheet_header(ws: Worksheet, headers: list[str]) -> None:
    """写入表头行。"""
    for col, header in enumerate(headers, 1):
        ws.cell(row=1, column=col, value=header)


def workbook_to_bytes(wb: Workbook) -> bytes:
    """将 Workbook 序列化为 bytes。"""
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def load_workbook_from_bytes(data: bytes) -> Workbook:
    """从 bytes 加载 Workbook。"""
    return load_workbook(io.BytesIO(data))


def extract_zip(content: bytes) -> dict[str, bytes]:
    """解压 ZIP，返回 {文件名: 内容} 字典。忽略 macOS 隐藏文件。"""
    files = {}
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for name in zf.namelist():
            if name.startswith("__") or name.startswith("."):
                continue
            files[name] = zf.read(name)
    return files


def create_zip(files: dict[str, bytes]) -> bytes:
    """打包文件为 ZIP，返回 bytes。"""
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    output.seek(0)
    return output.getvalue()
```

- [ ] **Step 2: 创建学科分类导入服务**

创建 `backend/api/api/admin/config/web_settings/disciplines/import_service.py`：

```python
"""学科分类批量导入服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository as disc_repo
from app.db.discipline.models import Discipline, DisciplineCategory
from app.utils.excel_io import (
    load_workbook_from_bytes,
    read_sheet_rows,
    workbook_to_bytes,
    write_sheet_header,
)


class DisciplineImportService:
    """学科分类导入服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def preview(self, content: bytes) -> dict:
        """解析 Excel，返回预览结果。"""
        wb = load_workbook_from_bytes(content)
        ws = wb.active
        rows = read_sheet_rows(ws)

        items = []
        errors = []

        for i, row in enumerate(rows, 2):
            if len(row) < 2 or not row[0] or not row[1]:
                errors.append({"row": i, "error": "大分类和小分类不能为空"})
                continue

            cat_name = str(row[0]).strip()
            disc_name = str(row[1]).strip()

            cat = await disc_repo.get_category_by_name(self.session, cat_name)
            disc = None
            if cat:
                disc = await disc_repo.get_discipline_by_name(
                    self.session, cat.id, disc_name
                )

            status = "unchanged" if disc else ("update" if cat else "new")
            items.append({
                "row": i,
                "category_name": cat_name,
                "discipline_name": disc_name,
                "status": status,
                "existing_category_id": cat.id if cat else None,
                "existing_discipline_id": disc.id if disc else None,
            })

        summary = {
            "new": sum(1 for it in items if it["status"] == "new"),
            "update": sum(1 for it in items if it["status"] == "update"),
            "unchanged": sum(1 for it in items if it["status"] == "unchanged"),
            "error": len(errors),
        }

        return {"items": items, "errors": errors, "summary": summary}

    async def confirm(self, items: list[dict]) -> dict:
        """执行导入。"""
        created = 0
        skipped = 0

        for item in items:
            if item["status"] == "unchanged":
                skipped += 1
                continue

            cat_name = item["category_name"]
            disc_name = item["discipline_name"]

            cat = await disc_repo.get_category_by_name(self.session, cat_name)
            if not cat:
                cat = DisciplineCategory(name=cat_name)
                cat = await disc_repo.create_category(self.session, cat)

            disc = await disc_repo.get_discipline_by_name(
                self.session, cat.id, disc_name
            )
            if not disc:
                disc = Discipline(category_id=cat.id, name=disc_name)
                await disc_repo.create_discipline(self.session, disc)
                created += 1
            else:
                skipped += 1

        return {"created": created, "skipped": skipped}

    def generate_template(self) -> bytes:
        """生成导入模板。"""
        wb = Workbook()
        ws = wb.active
        ws.title = "学科分类"
        write_sheet_header(ws, ["大分类", "小分类"])
        ws.append(["工学", "计算机科学"])
        ws.append(["工学", "电子工程"])
        ws.append(["商学", "金融学"])
        ws.append(["医学", "临床医学"])
        return workbook_to_bytes(wb)
```

- [ ] **Step 3: 创建学科分类导出服务**

创建 `backend/api/api/admin/config/web_settings/disciplines/export_service.py`：

```python
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
```

- [ ] **Step 4: 添加学科分类导入导出路由**

修改 `backend/api/api/admin/config/web_settings/disciplines/router.py`，添加：

```python
from fastapi import UploadFile
from fastapi.responses import Response

from .import_service import DisciplineImportService
from .export_service import DisciplineExportService


@router.get("/import/template", description="下载学科分类导入模板")
async def download_template():
    """下载学科分类导入模板。"""
    svc = DisciplineImportService(None)
    content = svc.generate_template()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=disciplines_template.xlsx"},
    )


@router.post("/import/preview", description="预览学科分类导入")
async def preview_import(file: UploadFile, session: AsyncSession = Depends(get_session)):
    """预览学科分类导入。"""
    content = await file.read()
    svc = DisciplineImportService(session)
    return await svc.preview(content)


@router.post("/import/confirm", description="确认学科分类导入")
async def confirm_import(
    items: list[dict],
    session: AsyncSession = Depends(get_session),
):
    """确认学科分类导入。"""
    svc = DisciplineImportService(session)
    result = await svc.confirm(items)
    await session.commit()
    return result


@router.get("/export", description="导出学科分类")
async def export_disciplines(session: AsyncSession = Depends(get_session)):
    """导出所有学科分类为 Excel。"""
    svc = DisciplineExportService(session)
    content = await svc.export_excel()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=disciplines.xlsx"},
    )
```

注意：需要检查现有 router 的 session 获取方式（`Depends(get_session)` 的具体导入路径）并保持一致。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 通用 Excel 工具 + 学科分类导入导出"
```

---

### Task 3: 院校导入导出（重写）

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/universities/import_service.py` (完全重写)
- Create: `backend/api/api/admin/config/web_settings/universities/export_service.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/router.py`

- [ ] **Step 1: 重写院校导入服务**

完全重写 `backend/api/api/admin/config/web_settings/universities/import_service.py`：

```python
"""院校批量导入服务。"""

import uuid

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository as disc_repo
from app.db.discipline.models import Discipline, DisciplineCategory
from app.db.image import repository as img_repo
from app.db.image.models import Image
from app.db.university import repository as uni_repo
from app.db.university.models import University
from app.db.university.program_models import UniversityProgram
from app.db.university import program_repository as prog_repo
from app.utils.excel_io import (
    create_zip,
    extract_zip,
    load_workbook_from_bytes,
    read_sheet_rows,
    workbook_to_bytes,
    write_sheet_header,
)


BASIC_HEADERS = [
    "名称", "英文名", "国家", "省份", "城市", "网站", "描述",
    "录取要求", "奖学金信息", "纬度", "经度", "是否精选", "排序",
    "Logo文件名", "展示图文件名", "QS排名",
]

PROGRAM_HEADERS = ["院校名称", "专业名称", "大分类", "小分类"]


class UniversityImportService:
    """院校批量导入服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def preview(self, content: bytes, is_zip: bool = False) -> dict:
        """解析上传文件，返回预览结果。"""
        images = {}
        if is_zip:
            files = extract_zip(content)
            xlsx_files = {k: v for k, v in files.items() if k.endswith(".xlsx")}
            if not xlsx_files:
                return {"items": [], "errors": [{"error": "ZIP 中未找到 .xlsx 文件"}], "summary": {}}
            xlsx_name = next(iter(xlsx_files))
            wb = load_workbook_from_bytes(xlsx_files[xlsx_name])
            images = {k: v for k, v in files.items() if not k.endswith(".xlsx")}
        else:
            wb = load_workbook_from_bytes(content)

        items = []
        errors = []
        unknown_disciplines = []
        programs_by_uni = {}

        if "专业列表" in wb.sheetnames:
            prog_rows = read_sheet_rows(wb["专业列表"])
            for i, row in enumerate(prog_rows, 2):
                if len(row) < 4 or not row[0] or not row[1]:
                    continue
                uni_name = str(row[0]).strip()
                prog_name = str(row[1]).strip()
                cat_name = str(row[2] or "").strip()
                disc_name = str(row[3] or "").strip()

                if uni_name not in programs_by_uni:
                    programs_by_uni[uni_name] = []
                programs_by_uni[uni_name].append({
                    "name": prog_name,
                    "category_name": cat_name,
                    "discipline_name": disc_name,
                })

                if cat_name and disc_name:
                    cat = await disc_repo.get_category_by_name(self.session, cat_name)
                    if not cat:
                        path = f"{cat_name}/{disc_name}"
                        if path not in unknown_disciplines:
                            unknown_disciplines.append(path)
                    else:
                        disc = await disc_repo.get_discipline_by_name(
                            self.session, cat.id, disc_name
                        )
                        if not disc:
                            path = f"{cat_name}/{disc_name}"
                            if path not in unknown_disciplines:
                                unknown_disciplines.append(path)

        basic_rows = read_sheet_rows(wb["基本信息"] if "基本信息" in wb.sheetnames else wb.active)
        for i, row in enumerate(basic_rows, 2):
            if len(row) < 5 or not row[0]:
                errors.append({"row": i, "error": "名称为空"})
                continue

            name = str(row[0]).strip()
            existing = await uni_repo.get_university_by_name(self.session, name)

            changed_fields = []
            if existing:
                field_map = [
                    (1, "name_en"), (2, "country"), (3, "province"), (4, "city"),
                    (5, "website"), (6, "description"), (7, "admission_requirements"),
                    (8, "scholarship_info"),
                ]
                for col_idx, field_name in field_map:
                    new_val = str(row[col_idx]).strip() if col_idx < len(row) and row[col_idx] else None
                    if new_val and new_val != str(getattr(existing, field_name, "") or ""):
                        changed_fields.append(field_name)

            status = "new" if not existing else ("update" if changed_fields else "unchanged")

            items.append({
                "row": i,
                "name": name,
                "status": status,
                "changed_fields": changed_fields,
                "data": {
                    "name": name,
                    "name_en": str(row[1]).strip() if len(row) > 1 and row[1] else None,
                    "country": str(row[2]).strip() if len(row) > 2 and row[2] else None,
                    "province": str(row[3]).strip() if len(row) > 3 and row[3] else None,
                    "city": str(row[4]).strip() if len(row) > 4 and row[4] else None,
                    "website": str(row[5]).strip() if len(row) > 5 and row[5] else None,
                    "description": str(row[6]).strip() if len(row) > 6 and row[6] else None,
                    "admission_requirements": str(row[7]).strip() if len(row) > 7 and row[7] else None,
                    "scholarship_info": str(row[8]).strip() if len(row) > 8 and row[8] else None,
                    "latitude": float(row[9]) if len(row) > 9 and row[9] else None,
                    "longitude": float(row[10]) if len(row) > 10 and row[10] else None,
                    "is_featured": str(row[11]).strip() == "是" if len(row) > 11 and row[11] else False,
                    "sort_order": int(row[12]) if len(row) > 12 and row[12] else 0,
                    "logo_filename": str(row[13]).strip() if len(row) > 13 and row[13] else None,
                    "image_filenames": str(row[14]).strip().split(";") if len(row) > 14 and row[14] else [],
                    "qs_rankings": self._parse_qs_rankings(str(row[15]).strip()) if len(row) > 15 and row[15] else None,
                },
                "programs": programs_by_uni.get(name, []),
                "existing_id": existing.id if existing else None,
            })

        summary = {
            "new": sum(1 for it in items if it["status"] == "new"),
            "update": sum(1 for it in items if it["status"] == "update"),
            "unchanged": sum(1 for it in items if it["status"] == "unchanged"),
            "error": len(errors),
        }

        return {
            "items": items,
            "errors": errors,
            "summary": summary,
            "unknown_disciplines": unknown_disciplines,
            "available_images": list(images.keys()),
        }

    async def confirm(
        self,
        items: list[dict],
        discipline_actions: list[dict],
        image_data: dict[str, bytes],
    ) -> dict:
        """执行导入。"""
        await self._apply_discipline_actions(discipline_actions)

        created = 0
        updated = 0
        skipped = 0

        for item in items:
            if item["status"] == "unchanged":
                skipped += 1
                continue

            data = item["data"]

            if item["status"] == "new":
                university = await self._create_university(data, image_data)
                created += 1
            else:
                university = await self._merge_university(
                    item["existing_id"], data, image_data
                )
                updated += 1

            await self._set_programs(university.id, item.get("programs", []))

        return {"created": created, "updated": updated, "skipped": skipped}

    def generate_template(self) -> bytes:
        """生成导入模板 ZIP。"""
        wb = Workbook()
        ws1 = wb.active
        ws1.title = "基本信息"
        write_sheet_header(ws1, BASIC_HEADERS)
        ws1.append([
            "哈佛大学", "Harvard University", "美国", "马萨诸塞州", "剑桥",
            "https://harvard.edu", "世界顶尖学府", "GPA 3.8+, TOEFL 100+",
            "多种奖学金可申请", "42.377", "-71.1167", "是", "1",
            "哈佛大学_logo.jpg", "哈佛大学_1.jpg;哈佛大学_2.jpg", "2026:4;2025:5",
        ])

        ws2 = wb.create_sheet("专业列表")
        write_sheet_header(ws2, PROGRAM_HEADERS)
        ws2.append(["哈佛大学", "计算机科学", "工学", "计算机科学"])
        ws2.append(["哈佛大学", "金融学", "商学", "金融学"])

        xlsx_bytes = workbook_to_bytes(wb)
        return create_zip({"universities.xlsx": xlsx_bytes})

    def _parse_qs_rankings(self, text: str) -> list[dict] | None:
        """解析 QS 排名文本，如 '2026:4;2025:5'。"""
        if not text:
            return None
        rankings = []
        for part in text.split(";"):
            parts = part.strip().split(":")
            if len(parts) == 2:
                try:
                    rankings.append({"year": int(parts[0]), "ranking": int(parts[1])})
                except ValueError:
                    continue
        return rankings or None

    async def _apply_discipline_actions(self, actions: list[dict]) -> None:
        """处理学科冲突决策。"""
        for action in actions:
            if action.get("action") == "create":
                parts = action["path"].split("/", 1)
                if len(parts) != 2:
                    continue
                cat_name, disc_name = parts
                cat = await disc_repo.get_category_by_name(self.session, cat_name)
                if not cat:
                    cat = DisciplineCategory(name=cat_name)
                    cat = await disc_repo.create_category(self.session, cat)
                disc = Discipline(category_id=cat.id, name=disc_name)
                await disc_repo.create_discipline(self.session, disc)

    async def _create_university(self, data: dict, image_data: dict[str, bytes]) -> University:
        """创建院校。"""
        logo_image_id = None
        if data.get("logo_filename") and data["logo_filename"] in image_data:
            logo_image_id = await self._upload_image(
                data["logo_filename"], image_data[data["logo_filename"]]
            )

        university = University(
            name=data["name"],
            name_en=data.get("name_en"),
            country=data.get("country", ""),
            province=data.get("province"),
            city=data.get("city", ""),
            website=data.get("website"),
            description=data.get("description"),
            admission_requirements=data.get("admission_requirements"),
            scholarship_info=data.get("scholarship_info"),
            qs_rankings=data.get("qs_rankings"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            is_featured=data.get("is_featured", False),
            sort_order=data.get("sort_order", 0),
            logo_image_id=logo_image_id,
        )
        university = await uni_repo.create_university(self.session, university)

        for filename in data.get("image_filenames", []):
            fn = filename.strip()
            if fn and fn in image_data:
                img_id = await self._upload_image(fn, image_data[fn])
                await uni_repo.add_university_image(
                    self.session, university.id, img_id
                )

        return university

    async def _merge_university(
        self, university_id: str, data: dict, image_data: dict[str, bytes]
    ) -> University:
        """合并更新院校（有值覆盖，空值保留）。"""
        updates = {}
        field_keys = [
            "name_en", "country", "province", "city", "website", "description",
            "admission_requirements", "scholarship_info", "latitude", "longitude",
            "is_featured", "sort_order", "qs_rankings",
        ]
        for key in field_keys:
            val = data.get(key)
            if val is not None and val != "":
                updates[key] = val

        if data.get("logo_filename") and data["logo_filename"] in image_data:
            updates["logo_image_id"] = await self._upload_image(
                data["logo_filename"], image_data[data["logo_filename"]]
            )

        if updates:
            await uni_repo.update_university(self.session, university_id, updates)

        return await uni_repo.get_university(self.session, university_id)

    async def _set_programs(self, university_id: str, programs: list[dict]) -> None:
        """设置院校专业。"""
        if not programs:
            return

        prog_items = []
        for p in programs:
            cat = await disc_repo.get_category_by_name(self.session, p["category_name"])
            if not cat:
                continue
            disc = await disc_repo.get_discipline_by_name(
                self.session, cat.id, p["discipline_name"]
            )
            if not disc:
                continue
            prog_items.append({"name": p["name"], "discipline_id": disc.id})

        if prog_items:
            await prog_repo.replace_programs(self.session, university_id, prog_items)

    async def _upload_image(self, filename: str, data: bytes) -> str:
        """上传图片到 Image 表，返回 ID。"""
        image = await img_repo.create_image(
            self.session,
            Image(
                filename=filename,
                file_data=data,
                mime_type=self._guess_mime(filename),
                file_size=len(data),
            ),
        )
        return image.id

    def _guess_mime(self, filename: str) -> str:
        """根据扩展名猜测 MIME 类型。"""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return {
            "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png", "gif": "image/gif",
            "webp": "image/webp", "pdf": "application/pdf",
        }.get(ext, "application/octet-stream")
```

- [ ] **Step 2: 创建院校导出服务**

创建 `backend/api/api/admin/config/web_settings/universities/export_service.py`：

```python
"""院校导出服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository as disc_repo
from app.db.image import repository as img_repo
from app.db.university import repository as uni_repo
from app.db.university import program_repository as prog_repo
from app.utils.excel_io import create_zip, workbook_to_bytes, write_sheet_header


BASIC_HEADERS = [
    "名称", "英文名", "国家", "省份", "城市", "网站", "描述",
    "录取要求", "奖学金信息", "纬度", "经度", "是否精选", "排序",
    "Logo文件名", "展示图文件名", "QS排名",
]

PROGRAM_HEADERS = ["院校名称", "专业名称", "大分类", "小分类"]


class UniversityExportService:
    """院校导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def export_zip(self) -> bytes:
        """导出所有院校为 ZIP（Excel + 图片）。"""
        universities = await uni_repo.list_universities(self.session)
        images_to_pack: dict[str, bytes] = {}

        wb = Workbook()
        ws1 = wb.active
        ws1.title = "基本信息"
        write_sheet_header(ws1, BASIC_HEADERS)

        ws2 = wb.create_sheet("专业列表")
        write_sheet_header(ws2, PROGRAM_HEADERS)

        for uni in universities:
            logo_filename = ""
            if uni.logo_image_id:
                img = await img_repo.get_by_id(self.session, uni.logo_image_id)
                if img:
                    logo_filename = f"{uni.name}_logo.{self._ext(img.filename)}"
                    images_to_pack[f"images/{logo_filename}"] = img.file_data

            uni_images = await uni_repo.list_university_images(self.session, uni.id)
            image_filenames = []
            for idx, ui in enumerate(uni_images):
                img = await img_repo.get_by_id(self.session, ui.image_id)
                if img:
                    fn = f"{uni.name}_{idx + 1}.{self._ext(img.filename)}"
                    images_to_pack[f"images/{fn}"] = img.file_data
                    image_filenames.append(fn)

            qs_text = ""
            if uni.qs_rankings:
                qs_text = ";".join(
                    f"{r['year']}:{r['ranking']}" for r in uni.qs_rankings
                )

            ws1.append([
                uni.name, uni.name_en, uni.country, uni.province, uni.city,
                uni.website, uni.description, uni.admission_requirements,
                uni.scholarship_info, uni.latitude, uni.longitude,
                "是" if uni.is_featured else "否", uni.sort_order,
                logo_filename, ";".join(image_filenames), qs_text,
            ])

            programs = await prog_repo.list_programs(self.session, uni.id)
            for prog in programs:
                disc = await disc_repo.get_discipline(self.session, prog.discipline_id)
                cat = await disc_repo.get_category(self.session, disc.category_id) if disc else None
                ws2.append([
                    uni.name, prog.name,
                    cat.name if cat else "", disc.name if disc else "",
                ])

        files = {"universities.xlsx": workbook_to_bytes(wb)}
        files.update(images_to_pack)
        return create_zip(files)

    def _ext(self, filename: str) -> str:
        """提取文件扩展名。"""
        return filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
```

- [ ] **Step 3: 更新院校路由 — 重写 import 端点 + 新增 export**

修改 `backend/api/api/admin/config/web_settings/universities/router.py`，重写现有的 import 端点并添加 export：

```python
# 替换现有的 import preview/confirm/template 端点

@router.get("/list/import/template", description="下载院校导入模板")
async def download_template():
    """下载院校导入模板 ZIP。"""
    svc = UniversityImportService(None)
    content = svc.generate_template()
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=universities_template.zip"},
    )


@router.post("/list/import/preview", description="预览院校导入")
async def preview_import(file: UploadFile, session: AsyncSession = Depends(get_session)):
    """预览院校导入。"""
    content = await file.read()
    is_zip = file.filename and file.filename.endswith(".zip")
    svc = UniversityImportService(session)
    return await svc.preview(content, is_zip=is_zip)


@router.post("/list/import/confirm", description="确认院校导入")
async def confirm_import(
    request: dict,
    session: AsyncSession = Depends(get_session),
):
    """确认院校导入。"""
    svc = UniversityImportService(session)
    result = await svc.confirm(
        items=request["items"],
        discipline_actions=request.get("discipline_actions", []),
        image_data=request.get("image_data", {}),
    )
    await session.commit()
    return result


@router.get("/list/export", description="导出院校 ZIP")
async def export_universities(session: AsyncSession = Depends(get_session)):
    """导出所有院校为 ZIP。"""
    svc = UniversityExportService(session)
    content = await svc.export_zip()
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=universities.zip"},
    )
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: 院校导入导出重写（merge + ZIP 图片 + 专业关联）"
```

---

### Task 4: 成功案例导入导出

**Files:**
- Create: `backend/api/api/admin/config/web_settings/cases/import_service.py`
- Create: `backend/api/api/admin/config/web_settings/cases/export_service.py`
- Modify: `backend/api/api/admin/config/web_settings/cases/router.py`

- [ ] **Step 1: 创建案例导入服务**

创建 `backend/api/api/admin/config/web_settings/cases/import_service.py`：

```python
"""成功案例批量导入服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.case import repository as case_repo
from app.db.case.models import SuccessCase
from app.db.image import repository as img_repo
from app.db.image.models import Image
from app.db.university import repository as uni_repo
from app.utils.excel_io import (
    create_zip,
    extract_zip,
    load_workbook_from_bytes,
    read_sheet_rows,
    workbook_to_bytes,
    write_sheet_header,
)


HEADERS = [
    "学生姓名", "院校名称", "专业", "入学年份", "感言",
    "头像文件名", "Offer图文件名", "是否精选", "排序",
]


class CaseImportService:
    """成功案例导入服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def preview(self, content: bytes, is_zip: bool = False) -> dict:
        """解析上传文件，返回预览。"""
        images = {}
        if is_zip:
            files = extract_zip(content)
            xlsx_files = {k: v for k, v in files.items() if k.endswith(".xlsx")}
            if not xlsx_files:
                return {"items": [], "errors": [{"error": "ZIP 中未找到 .xlsx 文件"}], "summary": {}}
            wb = load_workbook_from_bytes(next(iter(xlsx_files.values())))
            images = {k: v for k, v in files.items() if not k.endswith(".xlsx")}
        else:
            wb = load_workbook_from_bytes(content)

        rows = read_sheet_rows(wb.active)
        items = []
        errors = []
        unknown_universities = []

        for i, row in enumerate(rows, 2):
            if len(row) < 4 or not row[0]:
                errors.append({"row": i, "error": "学生姓名为空"})
                continue

            student_name = str(row[0]).strip()
            university_name = str(row[1] or "").strip()
            program = str(row[2] or "").strip()
            year = int(row[3]) if row[3] else None

            if not year:
                errors.append({"row": i, "error": f"{student_name}: 入学年份为空"})
                continue

            existing = await case_repo.find_case(
                self.session, student_name, university_name, year
            )

            university_id = None
            if university_name:
                uni = await uni_repo.get_university_by_name(self.session, university_name)
                if uni:
                    university_id = uni.id
                elif university_name not in unknown_universities:
                    unknown_universities.append(university_name)

            status = "new" if not existing else "update"

            items.append({
                "row": i,
                "status": status,
                "existing_id": existing.id if existing else None,
                "data": {
                    "student_name": student_name,
                    "university": university_name,
                    "program": program,
                    "year": year,
                    "testimonial": str(row[4]).strip() if len(row) > 4 and row[4] else None,
                    "avatar_filename": str(row[5]).strip() if len(row) > 5 and row[5] else None,
                    "offer_filename": str(row[6]).strip() if len(row) > 6 and row[6] else None,
                    "is_featured": str(row[7]).strip() == "是" if len(row) > 7 and row[7] else False,
                    "sort_order": int(row[8]) if len(row) > 8 and row[8] else 0,
                    "university_id": university_id,
                },
            })

        summary = {
            "new": sum(1 for it in items if it["status"] == "new"),
            "update": sum(1 for it in items if it["status"] == "update"),
            "error": len(errors),
        }

        return {
            "items": items,
            "errors": errors,
            "summary": summary,
            "unknown_universities": unknown_universities,
        }

    async def confirm(self, items: list[dict], image_data: dict[str, bytes]) -> dict:
        """执行导入。"""
        created = 0
        updated = 0

        for item in items:
            data = item["data"]

            avatar_id = None
            if data.get("avatar_filename") and data["avatar_filename"] in image_data:
                avatar_id = await self._upload_image(
                    data["avatar_filename"], image_data[data["avatar_filename"]]
                )

            offer_id = None
            if data.get("offer_filename") and data["offer_filename"] in image_data:
                offer_id = await self._upload_image(
                    data["offer_filename"], image_data[data["offer_filename"]]
                )

            if item["status"] == "new":
                case = SuccessCase(
                    student_name=data["student_name"],
                    university=data["university"],
                    program=data["program"],
                    year=data["year"],
                    testimonial=data.get("testimonial"),
                    is_featured=data.get("is_featured", False),
                    sort_order=data.get("sort_order", 0),
                    university_id=data.get("university_id"),
                    avatar_image_id=avatar_id,
                    offer_image_id=offer_id,
                )
                await case_repo.create_case(self.session, case)
                created += 1
            else:
                updates = {}
                for key in ["university", "program", "testimonial", "is_featured",
                            "sort_order", "university_id"]:
                    val = data.get(key)
                    if val is not None and val != "":
                        updates[key] = val
                if avatar_id:
                    updates["avatar_image_id"] = avatar_id
                if offer_id:
                    updates["offer_image_id"] = offer_id
                if updates:
                    await case_repo.update_case(self.session, item["existing_id"], updates)
                updated += 1

        return {"created": created, "updated": updated}

    def generate_template(self) -> bytes:
        """生成导入模板 ZIP。"""
        wb = Workbook()
        ws = wb.active
        ws.title = "成功案例"
        write_sheet_header(ws, HEADERS)
        ws.append([
            "张三", "哈佛大学", "计算机科学", 2026,
            "感谢慕大国际的帮助", "张三_avatar.jpg", "张三_offer.jpg", "是", 1,
        ])
        xlsx_bytes = workbook_to_bytes(wb)
        return create_zip({"cases.xlsx": xlsx_bytes})

    async def _upload_image(self, filename: str, data: bytes) -> str:
        """上传图片。"""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}.get(ext, "image/jpeg")
        image = await img_repo.create_image(
            self.session,
            Image(filename=filename, file_data=data, mime_type=mime, file_size=len(data)),
        )
        return image.id
```

注意：需要在 `case/repository.py` 中添加 `find_case(session, student_name, university, year)` 方法和 `get_university_by_name` 到 university repository（如果不存在）。

- [ ] **Step 2: 创建案例导出服务**

创建 `backend/api/api/admin/config/web_settings/cases/export_service.py`：

```python
"""成功案例导出服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.case import repository as case_repo
from app.db.image import repository as img_repo
from app.utils.excel_io import create_zip, workbook_to_bytes, write_sheet_header


HEADERS = [
    "学生姓名", "院校名称", "专业", "入学年份", "感言",
    "头像文件名", "Offer图文件名", "是否精选", "排序",
]


class CaseExportService:
    """成功案例导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def export_zip(self) -> bytes:
        """导出所有成功案例为 ZIP。"""
        cases = await case_repo.list_cases(self.session)
        images_to_pack: dict[str, bytes] = {}

        wb = Workbook()
        ws = wb.active
        ws.title = "成功案例"
        write_sheet_header(ws, HEADERS)

        for case in cases:
            avatar_fn = ""
            if case.avatar_image_id:
                img = await img_repo.get_by_id(self.session, case.avatar_image_id)
                if img:
                    avatar_fn = f"{case.student_name}_avatar.{self._ext(img.filename)}"
                    images_to_pack[f"images/{avatar_fn}"] = img.file_data

            offer_fn = ""
            if case.offer_image_id:
                img = await img_repo.get_by_id(self.session, case.offer_image_id)
                if img:
                    offer_fn = f"{case.student_name}_offer.{self._ext(img.filename)}"
                    images_to_pack[f"images/{offer_fn}"] = img.file_data

            ws.append([
                case.student_name, case.university, case.program, case.year,
                case.testimonial, avatar_fn, offer_fn,
                "是" if case.is_featured else "否", case.sort_order,
            ])

        files = {"cases.xlsx": workbook_to_bytes(wb)}
        files.update(images_to_pack)
        return create_zip(files)

    def _ext(self, filename: str) -> str:
        return filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
```

- [ ] **Step 3: 添加案例导入导出路由**

修改 `backend/api/api/admin/config/web_settings/cases/router.py`，添加 template/preview/confirm/export 端点（模式与学科分类一致，替换相应的 Service 类和文件名）。

- [ ] **Step 4: 添加 repository 辅助方法**

在 `backend/shared/app/db/case/repository.py` 添加：

```python
async def find_case(
    session: AsyncSession, student_name: str, university: str, year: int
) -> SuccessCase | None:
    """按唯一键查找案例。"""
    stmt = select(SuccessCase).where(
        SuccessCase.student_name == student_name,
        SuccessCase.university == university,
        SuccessCase.year == year,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
```

在 `backend/shared/app/db/university/repository.py` 添加（如不存在）：

```python
async def get_university_by_name(session: AsyncSession, name: str) -> University | None:
    """按名称查找院校。"""
    stmt = select(University).where(University.name == name)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 成功案例导入导出（merge + ZIP 图片）"
```

---

### Task 5: 文章导入导出

**Files:**
- Create: `backend/api/api/admin/config/web_settings/articles/import_service.py`
- Create: `backend/api/api/admin/config/web_settings/articles/export_service.py`
- Modify: `backend/api/api/admin/config/web_settings/articles/router.py`

- [ ] **Step 1: 创建文章导入服务**

创建 `backend/api/api/admin/config/web_settings/articles/import_service.py`：

```python
"""文章批量导入服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.content import repository as content_repo
from app.db.content.models import Article
from app.db.image import repository as img_repo
from app.db.image.models import Image
from app.utils.excel_io import (
    create_zip,
    extract_zip,
    load_workbook_from_bytes,
    read_sheet_rows,
    workbook_to_bytes,
    write_sheet_header,
)


HEADERS = [
    "标题", "Slug", "内容类型", "正文文件名", "摘要",
    "封面图文件名", "状态", "是否置顶",
]


class ArticleImportService:
    """文章导入服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def preview(
        self, content: bytes, category_id: str, is_zip: bool = False
    ) -> dict:
        """解析上传文件，返回预览。"""
        content_files: dict[str, bytes] = {}
        if is_zip:
            files = extract_zip(content)
            xlsx_files = {k: v for k, v in files.items() if k.endswith(".xlsx")}
            if not xlsx_files:
                return {"items": [], "errors": [{"error": "ZIP 中未找到 .xlsx 文件"}], "summary": {}}
            wb = load_workbook_from_bytes(next(iter(xlsx_files.values())))
            content_files = {k: v for k, v in files.items() if not k.endswith(".xlsx")}
        else:
            wb = load_workbook_from_bytes(content)

        rows = read_sheet_rows(wb.active)
        items = []
        errors = []

        for i, row in enumerate(rows, 2):
            if len(row) < 2 or not row[0] or not row[1]:
                errors.append({"row": i, "error": "标题和 Slug 不能为空"})
                continue

            title = str(row[0]).strip()
            slug = str(row[1]).strip()

            existing = await content_repo.get_article_by_slug(self.session, slug)
            status = "new" if not existing else "update"

            content_type = str(row[2] or "html").strip()
            content_filename = str(row[3] or "").strip() if len(row) > 3 else ""

            html_content = ""
            file_id = None
            if content_filename and content_filename in content_files:
                if content_type == "html":
                    html_content = content_files[content_filename].decode("utf-8", errors="replace")
                # file 类型在 confirm 阶段上传

            items.append({
                "row": i,
                "status": status,
                "existing_id": existing.id if existing else None,
                "data": {
                    "title": title,
                    "slug": slug,
                    "content_type": content_type,
                    "content_filename": content_filename,
                    "content": html_content,
                    "excerpt": str(row[4]).strip() if len(row) > 4 and row[4] else "",
                    "cover_filename": str(row[5]).strip() if len(row) > 5 and row[5] else None,
                    "status": str(row[6] or "draft").strip() if len(row) > 6 else "draft",
                    "is_pinned": str(row[7]).strip() == "是" if len(row) > 7 and row[7] else False,
                    "category_id": category_id,
                },
            })

        summary = {
            "new": sum(1 for it in items if it["status"] == "new"),
            "update": sum(1 for it in items if it["status"] == "update"),
            "error": len(errors),
        }

        return {"items": items, "errors": errors, "summary": summary}

    async def confirm(
        self, items: list[dict], author_id: str, content_files: dict[str, bytes]
    ) -> dict:
        """执行导入。"""
        created = 0
        updated = 0

        for item in items:
            data = item["data"]

            file_id = None
            if data["content_type"] == "file" and data.get("content_filename"):
                fn = data["content_filename"]
                if fn in content_files:
                    file_id = await self._upload_file(fn, content_files[fn])

            cover_image = None
            if data.get("cover_filename") and data["cover_filename"] in content_files:
                img_id = await self._upload_file(
                    data["cover_filename"], content_files[data["cover_filename"]]
                )
                cover_image = f"/api/public/images/detail?id={img_id}"

            if item["status"] == "new":
                article = Article(
                    title=data["title"],
                    slug=data["slug"],
                    content_type=data["content_type"],
                    content=data.get("content", ""),
                    file_id=file_id,
                    excerpt=data.get("excerpt", ""),
                    cover_image=cover_image,
                    category_id=data["category_id"],
                    author_id=author_id,
                    status=data.get("status", "draft"),
                    is_pinned=data.get("is_pinned", False),
                )
                await content_repo.create_article(self.session, article)
                created += 1
            else:
                updates = {}
                for key in ["title", "content", "excerpt", "status", "is_pinned"]:
                    val = data.get(key)
                    if val is not None and val != "":
                        updates[key] = val
                if file_id:
                    updates["file_id"] = file_id
                if cover_image:
                    updates["cover_image"] = cover_image
                if updates:
                    await content_repo.update_article(
                        self.session, item["existing_id"], updates
                    )
                updated += 1

        return {"created": created, "updated": updated}

    def generate_template(self, category_name: str = "") -> bytes:
        """生成导入模板 ZIP。"""
        wb = Workbook()
        ws = wb.active
        ws.title = f"文章 - {category_name}" if category_name else "文章"
        write_sheet_header(ws, HEADERS)
        ws.append([
            "留学德国全攻略", "study-in-germany", "html",
            "留学德国全攻略.html", "全面介绍德国留学...",
            "cover1.jpg", "published", "否",
        ])
        xlsx_bytes = workbook_to_bytes(wb)
        return create_zip({"articles.xlsx": xlsx_bytes})

    async def _upload_file(self, filename: str, data: bytes) -> str:
        """上传文件。"""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "pdf": "application/pdf", "html": "text/html",
        }.get(ext, "application/octet-stream")
        image = await img_repo.create_image(
            self.session,
            Image(filename=filename, file_data=data, mime_type=mime, file_size=len(data)),
        )
        return image.id
```

- [ ] **Step 2: 创建文章导出服务**

创建 `backend/api/api/admin/config/web_settings/articles/export_service.py`：

```python
"""文章导出服务。"""

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.content import repository as content_repo
from app.db.image import repository as img_repo
from app.utils.excel_io import create_zip, workbook_to_bytes, write_sheet_header


HEADERS = [
    "标题", "Slug", "内容类型", "正文文件名", "摘要",
    "封面图文件名", "状态", "是否置顶",
]


class ArticleExportService:
    """文章导出服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def export_zip(self, category_id: str) -> bytes:
        """导出指定分类的文章为 ZIP。"""
        articles = await content_repo.list_articles_by_category(
            self.session, category_id
        )
        content_files: dict[str, bytes] = {}

        wb = Workbook()
        ws = wb.active
        ws.title = "文章"
        write_sheet_header(ws, HEADERS)

        for article in articles:
            content_fn = ""
            cover_fn = ""

            if article.content_type == "html" and article.content:
                content_fn = f"{article.slug}.html"
                content_files[f"content/{content_fn}"] = article.content.encode("utf-8")
            elif article.content_type == "file" and article.file_id:
                img = await img_repo.get_by_id(self.session, article.file_id)
                if img:
                    content_fn = f"{article.slug}.{self._ext(img.filename)}"
                    content_files[f"content/{content_fn}"] = img.file_data

            if article.cover_image and "id=" in article.cover_image:
                cover_id = article.cover_image.split("id=")[-1]
                img = await img_repo.get_by_id(self.session, cover_id)
                if img:
                    cover_fn = f"{article.slug}_cover.{self._ext(img.filename)}"
                    content_files[f"content/{cover_fn}"] = img.file_data

            ws.append([
                article.title, article.slug, article.content_type, content_fn,
                article.excerpt, cover_fn,
                article.status, "是" if article.is_pinned else "否",
            ])

        files = {"articles.xlsx": workbook_to_bytes(wb)}
        files.update(content_files)
        return create_zip(files)

    def _ext(self, filename: str) -> str:
        return filename.rsplit(".", 1)[-1].lower() if "." in filename else "html"
```

- [ ] **Step 3: 添加文章导入导出路由**

修改 `backend/api/api/admin/config/web_settings/articles/router.py`，添加端点。注意文章路由需要 `category_id` query param 和 `author_id`（从请求头获取）：

```python
@router.get("/list/import/template", description="下载文章导入模板")
async def download_template(category_id: str = ""):
    """下载文章导入模板 ZIP。"""
    svc = ArticleImportService(None)
    content = svc.generate_template()
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=articles_template.zip"},
    )


@router.post("/list/import/preview", description="预览文章导入")
async def preview_import(
    file: UploadFile,
    category_id: str,
    session: AsyncSession = Depends(get_session),
):
    """预览文章导入。"""
    content = await file.read()
    is_zip = file.filename and file.filename.endswith(".zip")
    svc = ArticleImportService(session)
    return await svc.preview(content, category_id, is_zip=is_zip)


@router.post("/list/import/confirm", description="确认文章导入")
async def confirm_import(
    request: dict,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """确认文章导入。"""
    svc = ArticleImportService(session)
    result = await svc.confirm(
        items=request["items"],
        author_id=user_id,
        content_files=request.get("content_files", {}),
    )
    await session.commit()
    return result


@router.get("/list/export", description="导出文章 ZIP")
async def export_articles(
    category_id: str,
    session: AsyncSession = Depends(get_session),
):
    """导出指定分类的文章为 ZIP。"""
    svc = ArticleExportService(session)
    content = await svc.export_zip(category_id)
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=articles.zip"},
    )
```

- [ ] **Step 4: 添加 repository 辅助方法**

在 `backend/shared/app/db/content/repository.py` 添加：

```python
async def get_article_by_slug(session: AsyncSession, slug: str) -> Article | None:
    """按 slug 查找文章。"""
    stmt = select(Article).where(Article.slug == slug)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_articles_by_category(
    session: AsyncSession, category_id: str
) -> list[Article]:
    """列出分类下所有文章。"""
    stmt = (
        select(Article)
        .where(Article.category_id == category_id)
        .order_by(Article.is_pinned.desc(), Article.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 文章导入导出（merge + ZIP HTML/PDF + 分类隔离）"
```

---

### Task 6: 前端 UI — 工具栏 + 导入预览弹窗

**Files:**
- Create: `frontend/components/admin/ImportExportToolbar.tsx`
- Create: `frontend/components/admin/ImportPreviewDialog.tsx`
- Modify: `frontend/components/admin/web-settings/UniversitiesEditPreview.tsx`
- Modify: `frontend/components/admin/web-settings/CasesEditPreview.tsx`
- Modify: `frontend/components/admin/web-settings/ArticleListPreview.tsx`

- [ ] **Step 1: 创建 ImportExportToolbar 组件**

创建 `frontend/components/admin/ImportExportToolbar.tsx`：

```typescript
"use client"

/**
 * 导入导出工具栏。
 * 提供下载模板、导入、导出三个按钮。
 */

import { useRef, useState } from "react"
import { Download, Upload, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface ImportExportToolbarProps {
  templateUrl: string
  importUrl: string
  exportUrl: string
  onImportPreview: (data: unknown) => void
  templateFilename?: string
  exportFilename?: string
  acceptZip?: boolean
}

export function ImportExportToolbar({
  templateUrl,
  importUrl,
  exportUrl,
  onImportPreview,
  templateFilename = "template.zip",
  exportFilename = "export.zip",
  acceptZip = true,
}: ImportExportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleDownloadTemplate() {
    const res = await api.get(templateUrl, { responseType: "blob" })
    downloadBlob(res.data, templateFilename)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post(importUrl, formData)
      onImportPreview(res.data)
    } finally {
      setImporting(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await api.get(exportUrl, { responseType: "blob" })
      downloadBlob(res.data, exportFilename)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
        <FileDown className="mr-1 size-4" />
        下载模板
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
      >
        <Upload className="mr-1 size-4" />
        {importing ? "导入中..." : "导入"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
      >
        <Download className="mr-1 size-4" />
        {exporting ? "导出中..." : "导出"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptZip ? ".xlsx,.zip" : ".xlsx"}
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: 创建 ImportPreviewDialog 组件**

创建 `frontend/components/admin/ImportPreviewDialog.tsx`：

```typescript
"use client"

/**
 * 导入预览弹窗。
 * 展示解析结果、冲突处理、确认导入。
 */

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from "@/components/ui/dialog"

interface PreviewItem {
  row: number
  status: "new" | "update" | "unchanged" | "error"
  [key: string]: unknown
}

interface PreviewData {
  items: PreviewItem[]
  errors: Array<{ row?: number; error: string }>
  summary: Record<string, number>
  unknown_disciplines?: string[]
  unknown_universities?: string[]
}

interface ImportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PreviewData
  onConfirm: (items: PreviewItem[], actions: unknown) => Promise<void>
  columns: Array<{ key: string; label: string }>
  conflictType?: "disciplines" | "universities"
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "新增", color: "text-green-600" },
  update: { label: "更新", color: "text-blue-600" },
  unchanged: { label: "无变化", color: "text-gray-400" },
  error: { label: "错误", color: "text-red-600" },
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  columns,
}: ImportPreviewDialogProps) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    try {
      await onConfirm(data.items, {})
      toast.success("导入完成")
      onOpenChange(false)
    } catch {
      toast.error("导入失败")
    } finally {
      setConfirming(false)
    }
  }

  const { summary } = data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入预览</DialogTitle>
          <DialogDescription>
            新增 {summary.new || 0} 条 · 更新 {summary.update || 0} 条 · 无变化 {summary.unchanged || 0} 条 · 错误 {summary.error || 0} 条
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[50vh] overflow-y-auto">
          {data.errors.length > 0 && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">解析错误：</p>
              {data.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600">
                  {err.row ? `第 ${err.row} 行：` : ""}{err.error}
                </p>
              ))}
            </div>
          )}

          {data.unknown_disciplines && data.unknown_disciplines.length > 0 && (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">未知学科分类（将自动创建）：</p>
              {data.unknown_disciplines.map((d, i) => (
                <p key={i} className="text-sm text-amber-600">{d}</p>
              ))}
            </div>
          )}

          {data.unknown_universities && data.unknown_universities.length > 0 && (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">未匹配院校（将保留文本）：</p>
              {data.unknown_universities.map((u, i) => (
                <p key={i} className="text-sm text-amber-600">{u}</p>
              ))}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-1 text-left">状态</th>
                {columns.map((col) => (
                  <th key={col.key} className="px-2 py-1 text-left">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => {
                const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.error
                return (
                  <tr key={i} className="border-b">
                    <td className={`px-2 py-1 font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-2 py-1 truncate max-w-[150px]">
                        {String(
                          (item.data as Record<string, unknown>)?.[col.key] ?? item[col.key] ?? ""
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming || (summary.new || 0) + (summary.update || 0) === 0}
          >
            {confirming ? "导入中..." : `确认导入 (${(summary.new || 0) + (summary.update || 0)} 条)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: 在 UniversitiesEditPreview 中添加工具栏**

修改 `frontend/components/admin/web-settings/UniversitiesEditPreview.tsx`，在学科分类管理区域和院校管理区域各添加 ImportExportToolbar + ImportPreviewDialog。

在学科分类标题旁添加：

```typescript
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"

// 在学科分类管理标题旁：
<ImportExportToolbar
  templateUrl="/admin/web-settings/disciplines/import/template"
  importUrl="/admin/web-settings/disciplines/import/preview"
  exportUrl="/admin/web-settings/disciplines/export"
  onImportPreview={(data) => setDiscPreviewData(data)}
  templateFilename="disciplines_template.xlsx"
  exportFilename="disciplines.xlsx"
  acceptZip={false}
/>

// 在院校管理标题旁：
<ImportExportToolbar
  templateUrl="/admin/web-settings/universities/list/import/template"
  importUrl="/admin/web-settings/universities/list/import/preview"
  exportUrl="/admin/web-settings/universities/list/export"
  onImportPreview={(data) => setUniPreviewData(data)}
  templateFilename="universities_template.zip"
  exportFilename="universities.zip"
/>
```

添加对应的 ImportPreviewDialog 和 state，confirm 回调调用对应的 confirm API。

- [ ] **Step 4: 在 CasesEditPreview 中添加工具栏**

修改 `frontend/components/admin/web-settings/CasesEditPreview.tsx`，在标题旁添加：

```typescript
<ImportExportToolbar
  templateUrl="/admin/web-settings/cases/list/import/template"
  importUrl="/admin/web-settings/cases/list/import/preview"
  exportUrl="/admin/web-settings/cases/list/export"
  onImportPreview={(data) => setCasePreviewData(data)}
  templateFilename="cases_template.zip"
  exportFilename="cases.zip"
/>
```

- [ ] **Step 5: 在 ArticleListPreview 中添加工具栏**

修改 `frontend/components/admin/web-settings/ArticleListPreview.tsx`，在标题旁添加工具栏。注意 URL 需要带 `category_id` query param：

```typescript
<ImportExportToolbar
  templateUrl={`/admin/web-settings/articles/list/import/template?category_id=${categoryId}`}
  importUrl={`/admin/web-settings/articles/list/import/preview?category_id=${categoryId}`}
  exportUrl={`/admin/web-settings/articles/list/export?category_id=${categoryId}`}
  onImportPreview={(data) => setArticlePreviewData(data)}
  templateFilename="articles_template.zip"
  exportFilename="articles.zip"
/>
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 前端导入导出 UI（ImportExportToolbar + ImportPreviewDialog）"
```

---

### Task 7: Playwright MCP 端到端验证

**Files:** 无新增/修改

- [ ] **Step 1: 启动开发环境 + 重建数据库**

```bash
docker compose down -v
docker compose up -d
```

等待所有容器 healthy。

- [ ] **Step 2: 浏览器登录 + 导航到网页设置**

用 Playwright MCP 登录 superuser 账号，导航到 `/admin/web-settings`。

- [ ] **Step 3: 验证学科分类导入导出**

1. 切换到"院校选择" tab
2. 确认学科分类区域有"下载模板/导入/导出"按钮
3. 点击"下载模板"确认文件下载
4. 点击"导出"下载现有数据

- [ ] **Step 4: 验证院校导入导出**

1. 确认院校管理区域有"下载模板/导入/导出"按钮
2. 点击"下载模板"确认 ZIP 下载

- [ ] **Step 5: 验证成功案例导入导出**

1. 切换到"成功案例" tab
2. 确认有"下载模板/导入/导出"按钮

- [ ] **Step 6: 验证文章导入导出**

1. 切换到任意分类页面（如"出国留学"）
2. 确认有"下载模板/导入/导出"按钮

- [ ] **Step 7: 截图验证所有页面**

对每个页面截图确认 UI 正确渲染。
