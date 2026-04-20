# 院校与成功案例功能增强 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强院校和成功案例功能：新增图片管理、学科分类体系、批量导入、主页展示、详情页丰富化。

**Architecture:** 分三阶段实施。Phase 1 建设基础设施（image 表、discipline 表、公共图片 API、学科分类 API）。Phase 2 增强院校功能（表扩展、图片上传、学科关联、批量导入、前端重设计）。Phase 3 增强案例功能和主页改造。每个 Phase 可独立交付测试。

**Tech Stack:** FastAPI, SQLAlchemy (async), Pydantic, Alembic, Next.js, React, Tailwind CSS, Leaflet, openpyxl, DOMPurify

**Design Spec:** `docs/superpowers/specs/2026-04-20-university-case-enhancement-design.md`

**安全注意事项：** 富文本渲染（录取要求、奖学金信息）必须使用 DOMPurify 消毒后再通过 `dangerouslySetInnerHTML` 渲染，防止 XSS。需安装 `dompurify` 和 `@types/dompurify`。

---

## Phase 1: 基础设施层

### Task 1: Image 模型与 Repository

**Files:**
- Create: `backend/shared/app/db/image/__init__.py`
- Create: `backend/shared/app/db/image/models.py`
- Create: `backend/shared/app/db/image/repository.py`

- [ ] **Step 1: 创建 image 模型**

```python
# backend/shared/app/db/image/__init__.py
"""图片存储。"""

# backend/shared/app/db/image/models.py
"""图片 ORM 模型。存储图片二进制数据和元信息。"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Image(Base):
    """图片模型。"""

    __tablename__ = "image"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    file_data: Mapped[bytes] = mapped_column(
        LargeBinary, nullable=False, doc="图片二进制数据"
    )
    filename: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    mime_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    file_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
```

- [ ] **Step 2: 创建 image repository**

```python
# backend/shared/app/db/image/repository.py
"""图片数据访问层。"""

import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.image.models import Image

ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


async def create_image(
    session: AsyncSession,
    file_data: bytes,
    filename: str,
    mime_type: str,
) -> Image:
    """创建图片。自动计算哈希和大小，重复哈希返回已有记录。"""
    file_hash = hashlib.sha256(file_data).hexdigest()
    existing = await get_by_hash(session, file_hash)
    if existing:
        return existing

    image = Image(
        file_data=file_data,
        filename=filename,
        mime_type=mime_type,
        file_size=len(file_data),
        file_hash=file_hash,
    )
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return image


async def get_by_id(
    session: AsyncSession, image_id: str
) -> Image | None:
    """根据 ID 查询图片。"""
    return await session.get(Image, image_id)


async def get_by_hash(
    session: AsyncSession, file_hash: str
) -> Image | None:
    """根据哈希查询图片（去重用）。"""
    stmt = select(Image).where(Image.file_hash == file_hash)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def delete_image(
    session: AsyncSession, image: Image
) -> None:
    """删除图片。"""
    await session.delete(image)
    await session.commit()
```

- [ ] **Step 3: 在 alembic env.py 中注册 Image 模型**

在 `backend/alembic/env.py` 的模型导入区域添加：

```python
from app.db.image.models import Image  # noqa: F401
```

- [ ] **Step 4: 提交**

```bash
git add backend/shared/app/db/image/
git commit -m "feat: 添加 Image 模型和 Repository"
```

---

### Task 2: Discipline 模型与 Repository

**Files:**
- Create: `backend/shared/app/db/discipline/__init__.py`
- Create: `backend/shared/app/db/discipline/models.py`
- Create: `backend/shared/app/db/discipline/repository.py`

- [ ] **Step 1: 创建 discipline 模型**

```python
# backend/shared/app/db/discipline/__init__.py
"""学科分类。"""

# backend/shared/app/db/discipline/models.py
"""学科分类 ORM 模型。包含大分类、学科、院校-学科关联。"""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DisciplineCategory(Base):
    """学科大分类。"""

    __tablename__ = "discipline_category"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )


class Discipline(Base):
    """学科。"""

    __tablename__ = "discipline"
    __table_args__ = (
        UniqueConstraint(
            "category_id", "name", name="uq_discipline_category_name"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("discipline_category.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )


class UniversityDiscipline(Base):
    """院校-学科多对多关联。"""

    __tablename__ = "university_discipline"

    university_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("university.id", ondelete="CASCADE"),
        primary_key=True,
    )
    discipline_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("discipline.id", ondelete="CASCADE"),
        primary_key=True,
    )
```

- [ ] **Step 2: 创建 discipline repository**

```python
# backend/shared/app/db/discipline/repository.py
"""学科分类数据访问层。"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline.models import (
    Discipline,
    DisciplineCategory,
    UniversityDiscipline,
)


# === DisciplineCategory ===

async def create_category(
    session: AsyncSession, category: DisciplineCategory
) -> DisciplineCategory:
    """创建学科大分类。"""
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


async def get_category_by_id(
    session: AsyncSession, category_id: str
) -> DisciplineCategory | None:
    """根据 ID 查询大分类。"""
    return await session.get(DisciplineCategory, category_id)


async def get_category_by_name(
    session: AsyncSession, name: str
) -> DisciplineCategory | None:
    """根据名称查询大分类。"""
    stmt = select(DisciplineCategory).where(
        DisciplineCategory.name == name
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_categories(
    session: AsyncSession,
) -> list[DisciplineCategory]:
    """查询所有大分类，按 sort_order 排序。"""
    stmt = select(DisciplineCategory).order_by(
        DisciplineCategory.sort_order.asc(),
        DisciplineCategory.created_at.asc(),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_category(
    session: AsyncSession, category: DisciplineCategory
) -> DisciplineCategory:
    """更新大分类。"""
    await session.commit()
    await session.refresh(category)
    return category


async def delete_category(
    session: AsyncSession, category: DisciplineCategory
) -> None:
    """删除大分类。"""
    await session.delete(category)
    await session.commit()


async def category_has_disciplines(
    session: AsyncSession, category_id: str
) -> bool:
    """检查大分类下是否有学科。"""
    stmt = (
        select(func.count())
        .select_from(Discipline)
        .where(Discipline.category_id == category_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one() > 0


# === Discipline ===

async def create_discipline(
    session: AsyncSession, discipline: Discipline
) -> Discipline:
    """创建学科。"""
    session.add(discipline)
    await session.commit()
    await session.refresh(discipline)
    return discipline


async def get_discipline_by_id(
    session: AsyncSession, discipline_id: str
) -> Discipline | None:
    """根据 ID 查询学科。"""
    return await session.get(Discipline, discipline_id)


async def get_discipline_by_name(
    session: AsyncSession, category_id: str, name: str
) -> Discipline | None:
    """根据大分类和名称查询学科。"""
    stmt = select(Discipline).where(
        Discipline.category_id == category_id,
        Discipline.name == name,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_disciplines(
    session: AsyncSession,
    category_id: str | None = None,
) -> list[Discipline]:
    """查询学科列表，可按大分类筛选。"""
    stmt = select(Discipline)
    if category_id:
        stmt = stmt.where(Discipline.category_id == category_id)
    stmt = stmt.order_by(
        Discipline.sort_order.asc(),
        Discipline.created_at.asc(),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_discipline(
    session: AsyncSession, discipline: Discipline
) -> Discipline:
    """更新学科。"""
    await session.commit()
    await session.refresh(discipline)
    return discipline


async def delete_discipline(
    session: AsyncSession, discipline: Discipline
) -> None:
    """删除学科。"""
    await session.delete(discipline)
    await session.commit()


async def discipline_has_universities(
    session: AsyncSession, discipline_id: str
) -> bool:
    """检查学科是否有院校关联。"""
    stmt = (
        select(func.count())
        .select_from(UniversityDiscipline)
        .where(UniversityDiscipline.discipline_id == discipline_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one() > 0


# === UniversityDiscipline ===

async def set_university_disciplines(
    session: AsyncSession,
    university_id: str,
    discipline_ids: list[str],
) -> None:
    """设置院校的学科关联（全量覆盖）。"""
    await session.execute(
        delete(UniversityDiscipline).where(
            UniversityDiscipline.university_id == university_id
        )
    )
    for discipline_id in discipline_ids:
        session.add(
            UniversityDiscipline(
                university_id=university_id,
                discipline_id=discipline_id,
            )
        )
    await session.commit()


async def get_university_discipline_ids(
    session: AsyncSession, university_id: str
) -> list[str]:
    """获取院校关联的学科 ID 列表。"""
    stmt = select(UniversityDiscipline.discipline_id).where(
        UniversityDiscipline.university_id == university_id
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
```

- [ ] **Step 3: 在 alembic env.py 中注册 Discipline 模型**

在 `backend/alembic/env.py` 的模型导入区域添加：

```python
from app.db.discipline.models import (  # noqa: F401
    DisciplineCategory,
    Discipline,
    UniversityDiscipline,
)
```

- [ ] **Step 4: 提交**

```bash
git add backend/shared/app/db/discipline/ backend/alembic/env.py
git commit -m "feat: 添加 Discipline 模型和 Repository"
```

---

### Task 3: Alembic 迁移 — 新建表

**Files:**
- Create: `backend/alembic/versions/<auto>_add_image_and_discipline_tables.py`

- [ ] **Step 1: 生成迁移文件**

```bash
cd /home/whw23/code/mudasky
uv run --project backend/shared alembic -c backend/alembic.ini revision --autogenerate -m "add image and discipline tables"
```

- [ ] **Step 2: 检查生成的迁移文件**

确认 `upgrade()` 包含：
- `op.create_table("image", ...)` — id, file_data, filename, mime_type, file_size, file_hash, created_at
- `op.create_table("discipline_category", ...)` — id, name, sort_order, created_at, updated_at
- `op.create_table("discipline", ...)` — id, category_id, name, sort_order, created_at, updated_at + UniqueConstraint
- `op.create_table("university_discipline", ...)` — university_id, discipline_id 联合主键
- `op.create_index` on image.file_hash

确认 `downgrade()` 按反序 drop 表。

- [ ] **Step 3: 执行迁移**

```bash
uv run --project backend/shared alembic -c backend/alembic.ini upgrade head
```

- [ ] **Step 4: 提交**

```bash
git add backend/alembic/versions/
git commit -m "feat: 数据库迁移 — 添加 image 和 discipline 表"
```

---

### Task 4: 公共图片读取 API

**Files:**
- Create: `backend/api/api/public/image/__init__.py`
- Create: `backend/api/api/public/image/router.py`
- Create: `backend/api/api/public/image/service.py`
- Modify: `backend/api/api/public/__init__.py` — 注册 image router

- [ ] **Step 1: 创建 public image module**

```python
# backend/api/api/public/image/__init__.py
"""公开图片接口。"""

from .router import router

description = "图片"

__all__ = ["router", "description"]

# backend/api/api/public/image/service.py
"""公开图片服务。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.image import repository


class ImageService:
    """图片读取服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def get_image(self, image_id: str) -> tuple[bytes, str]:
        """获取图片数据和 MIME 类型。不存在则抛出异常。"""
        image = await repository.get_by_id(
            self.session, image_id
        )
        if not image:
            raise NotFoundException(
                message="图片不存在", code="IMAGE_NOT_FOUND"
            )
        return image.file_data, image.mime_type

# backend/api/api/public/image/router.py
"""公开图片读取接口。"""

from fastapi import APIRouter, Header, Response

from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession

from .service import ImageService

router = APIRouter(prefix="/images", tags=["images"])


@router.get(
    "/detail",
    summary="获取图片",
    responses={200: {"content": {"image/*": {}}}},
)
async def get_image(
    id: str,
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> Response:
    """根据 ID 获取图片二进制数据。"""
    svc = ImageService(session)
    file_data, mime_type = await svc.get_image(id)

    seed = f"img:{id}"
    if set_cache_headers(response, seed, 86400, if_none_match):
        return response

    return Response(
        content=file_data,
        media_type=mime_type,
        headers={
            "Cache-Control": "public, max-age=86400",
        },
    )
```

- [ ] **Step 2: 在 public __init__.py 中注册 image router**

在 `backend/api/api/public/__init__.py` 中添加：

```python
from .image import router as image_router
# ...
router.include_router(image_router)
```

- [ ] **Step 3: 提交**

```bash
git add backend/api/api/public/image/
git commit -m "feat: 添加公共图片读取 API"
```

---

### Task 5: 学科分类 Admin API

**Files:**
- Create: `backend/api/api/admin/config/web_settings/disciplines/__init__.py`
- Create: `backend/api/api/admin/config/web_settings/disciplines/schemas.py`
- Create: `backend/api/api/admin/config/web_settings/disciplines/service.py`
- Create: `backend/api/api/admin/config/web_settings/disciplines/router.py`
- Modify: `backend/api/api/admin/config/web_settings/__init__.py`

详细代码见设计文档。包含 DisciplineCategory 和 Discipline 的完整 CRUD（schemas + service + router），遵循现有代码模式。

Service 包含：
- 创建时校验名称唯一性
- 删除大分类前检查下属学科
- 删除学科前检查院校关联
- 更新时重新校验名称唯一性

- [ ] **Step 1: 创建 schemas**（CategoryCreate/Update/Delete/Response + DisciplineCreate/Update/Delete/Response）
- [ ] **Step 2: 创建 service**（DisciplineService 类，含 category 和 discipline CRUD）
- [ ] **Step 3: 创建 router**（8 个接口：categories CRUD + disciplines CRUD）
- [ ] **Step 4: 在 web_settings __init__.py 中注册**
- [ ] **Step 5: 提交**

```bash
git add backend/api/api/admin/config/web_settings/disciplines/
git commit -m "feat: 添加学科分类 Admin CRUD API"
```

---

### Task 6: 学科分类 Public API

**Files:**
- Create: `backend/api/api/public/discipline/__init__.py`
- Create: `backend/api/api/public/discipline/schemas.py`
- Create: `backend/api/api/public/discipline/service.py`
- Create: `backend/api/api/public/discipline/router.py`
- Modify: `backend/api/api/public/__init__.py`

树形结构响应：`[{id, name, disciplines: [{id, name}]}]`，带 ETag 缓存（3600s）。

- [ ] **Step 1: 创建 schemas**（DisciplineItem + DisciplineCategoryTree）
- [ ] **Step 2: 创建 service**（DisciplinePublicService.get_discipline_tree）
- [ ] **Step 3: 创建 router**（GET /public/disciplines/list）
- [ ] **Step 4: 在 public __init__.py 中注册**
- [ ] **Step 5: 提交**

```bash
git add backend/api/api/public/discipline/
git commit -m "feat: 添加学科分类公开 API（树形结构）"
```

---

### Task 7: Phase 1 单元测试

**Files:**
- Create: `backend/api/tests/public/image/test_service.py`
- Create: `backend/api/tests/public/image/test_router.py`
- Create: `backend/api/tests/admin/config/web_settings/disciplines/test_service.py`
- Create: `backend/api/tests/admin/config/web_settings/disciplines/test_router.py`

每个测试目标至少 2 正例 + 2 反例。

**Image 测试：**
- 正例：获取 PNG 图片成功、获取 JPEG 图片成功
- 反例：图片不存在 404、缺少 id 参数 422

**Discipline 测试：**
- 正例：创建大分类成功、列出大分类、创建学科成功、列出学科
- 反例：重复大分类名 409、大分类不存在 404、删除有下属学科的大分类 409、删除有院校关联的学科 409、缺少必填字段 422

- [ ] **Step 1: Image service 测试**
- [ ] **Step 2: Image router 测试**
- [ ] **Step 3: Discipline service 测试**
- [ ] **Step 4: Discipline router 测试**
- [ ] **Step 5: 运行测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/public/image/ backend/api/tests/admin/config/web_settings/disciplines/ -v
```

- [ ] **Step 6: 提交**

```bash
git add backend/api/tests/
git commit -m "test: 添加 Phase 1 单元测试（图片 API + 学科分类 API）"
```

---

## Phase 2: 院校功能增强

### Task 8: University 表扩展 + 院校图片表

**Files:**
- Create: `backend/shared/app/db/university/image_models.py`
- Modify: `backend/shared/app/db/university/models.py`
- Modify: `backend/shared/app/db/university/repository.py`
- Modify: `backend/alembic/env.py`

University 新增字段：logo_image_id, admission_requirements, scholarship_info, qs_rankings, latitude, longitude。

UniversityImage 新表：id, university_id, image_id, sort_order。

Repository 新增：list_university_images, count_university_images, add_university_image, delete_university_image, get_university_image_by_id。

- [ ] **Step 1: 创建 UniversityImage 模型**
- [ ] **Step 2: 修改 University 模型新增字段**
- [ ] **Step 3: Repository 新增图片集方法**
- [ ] **Step 4: 在 alembic env.py 注册新模型**
- [ ] **Step 5: 生成并执行迁移**

```bash
uv run --project backend/shared alembic -c backend/alembic.ini revision --autogenerate -m "extend university table and add university_image"
uv run --project backend/shared alembic -c backend/alembic.ini upgrade head
```

- [ ] **Step 6: 提交**

```bash
git add backend/shared/app/db/university/ backend/alembic/
git commit -m "feat: 扩展 University 模型，添加图片集表"
```

---

### Task 9: 院校 Admin API 增强

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/universities/schemas.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/service.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/router.py`

新增接口：
- POST upload-logo（上传校徽）
- POST upload-image（上传院校图片，≤5 张限制）
- POST delete-image（删除院校图片）
- POST disciplines（设置学科关联，全量覆盖）

Schemas 扩展 Create/Update/Response 新增字段。

Service 新增：upload_logo, upload_image（含 5 张限制校验）, delete_image, set_disciplines, _save_image（共享的图片校验逻辑）。

- [ ] **Step 1: 扩展 schemas**
- [ ] **Step 2: 扩展 service**
- [ ] **Step 3: 扩展 router**
- [ ] **Step 4: 提交**

```bash
git add backend/api/api/admin/config/web_settings/universities/
git commit -m "feat: 院校 Admin API 增强 — 图片上传和学科关联"
```

---

### Task 10: 院校 Public API 增强

**Files:**
- Modify: `backend/api/api/public/university/schemas.py`
- Modify: `backend/api/api/public/university/service.py`
- Modify: `backend/api/api/public/university/router.py`

列表接口新增 discipline_category_id 和 discipline_id 筛选参数。
详情接口返回：disciplines, image_ids, related_cases, 新增字段。

- [ ] **Step 1: 扩展 public schemas**（新增 DisciplineItem, CaseBrief 嵌套模型）
- [ ] **Step 2: 扩展 public service**（get_university_detail 填充学科/图片/案例）
- [ ] **Step 3: 扩展 public router**（list 新增筛选参数，detail 返回丰富数据）
- [ ] **Step 4: 提交**

```bash
git add backend/api/api/public/university/
git commit -m "feat: 院校 Public API 增强 — 学科筛选和详情丰富化"
```

---

### Task 11: 院校批量导入 API

**Files:**
- Create: `backend/api/api/admin/config/web_settings/universities/import_service.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/router.py`

- [ ] **Step 1: 添加 openpyxl 依赖**

```bash
cd /home/whw23/code/mudasky/backend/api && uv add openpyxl
```

- [ ] **Step 2: 创建 ImportService**

包含：preview（解析 xlsx/zip）、confirm（执行导入）、generate_template（生成模板）。
解析逻辑：Sheet1 基本信息（键值对）、Sheet2 学科分类（大分类+学科）、Sheet3 QS 排名（年份+排名）。
校验：必填字段（名称、国家、城市），未知学科分类列表。

- [ ] **Step 3: 在 router 中添加导入接口**

- POST /list/import/preview
- POST /list/import/confirm
- GET /list/import/template

- [ ] **Step 4: 提交**

```bash
git add backend/api/api/admin/config/web_settings/universities/
git commit -m "feat: 添加院校批量导入功能（Excel/zip + 两阶段校验）"
```

---

### Task 12: 前端 — 安装依赖

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装 Leaflet 和 DOMPurify**

```bash
pnpm --prefix frontend add leaflet react-leaflet dompurify
pnpm --prefix frontend add -D @types/leaflet @types/dompurify
```

- [ ] **Step 2: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat: 添加 leaflet、react-leaflet、dompurify 前端依赖"
```

---

### Task 13: 前端 — 公共组件（地图 + 图片画廊 + 安全富文本）

**Files:**
- Create: `frontend/components/public/UniversityMap.tsx`
- Create: `frontend/components/public/ImageGallery.tsx`
- Create: `frontend/components/common/SafeHtml.tsx`

UniversityMap：动态导入 react-leaflet 避免 SSR 问题，接收 latitude/longitude/name。
ImageGallery：主图 + 缩略图切换，通过 /api/public/images/detail?id=xxx 加载。
SafeHtml：用 DOMPurify 消毒后渲染，替代直接使用 dangerouslySetInnerHTML。

- [ ] **Step 1: 创建地图组件**
- [ ] **Step 2: 创建图片画廊组件**
- [ ] **Step 3: 创建安全富文本组件**

```typescript
// frontend/components/common/SafeHtml.tsx
"use client"

import DOMPurify from "dompurify"

interface SafeHtmlProps {
  html: string
  className?: string
}

/** 安全渲染富文本，使用 DOMPurify 消毒防止 XSS */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html)
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/components/public/UniversityMap.tsx frontend/components/public/ImageGallery.tsx frontend/components/common/SafeHtml.tsx
git commit -m "feat: 添加地图、图片画廊、安全富文本公共组件"
```

---

### Task 14: 前端 — 院校详情页重设计

**Files:**
- Create: `frontend/components/public/UniversityDetail.tsx`
- Modify: `frontend/app/[locale]/(public)/universities/[id]/page.tsx`

详情组件包含：顶部（校徽+名称+地址+QS排名+网站链接）、图片画廊、描述、学科标签、录取要求（SafeHtml）、奖学金（SafeHtml）、QS排名历史、Leaflet 地图、关联案例卡片。

- [ ] **Step 1: 创建 UniversityDetail 组件**
- [ ] **Step 2: 更新详情页引用新组件**
- [ ] **Step 3: 提交**

```bash
git add frontend/components/public/UniversityDetail.tsx frontend/app/
git commit -m "feat: 院校详情页重设计 — 图片、学科、地图、案例"
```

---

### Task 15: 前端 — 院校列表页筛选增强

**Files:**
- Modify: `frontend/components/public/UniversitySearch.tsx`
- Modify: `frontend/components/public/UniversityList.tsx`

搜索组件新增：学科大分类下拉（联动学科下拉）、QS 排名范围筛选。
列表卡片增加：校徽图片、QS 最新排名徽标、学科标签（前 3 个）。

- [ ] **Step 1: 增强搜索组件**
- [ ] **Step 2: 增强列表卡片**
- [ ] **Step 3: 提交**

```bash
git add frontend/components/public/
git commit -m "feat: 院校列表页筛选增强 — 学科和排名筛选"
```

---

## Phase 3: 案例增强 + 主页改造

### Task 16: SuccessCase 表扩展

**Files:**
- Modify: `backend/shared/app/db/case/models.py`
- Modify: `backend/shared/app/db/case/repository.py`

新增字段：university_id (FK nullable), avatar_image_id (FK nullable), offer_image_id (FK nullable)。
Repository 新增：list_cases_by_university。

- [ ] **Step 1: 修改模型新增字段**
- [ ] **Step 2: Repository 新增方法**
- [ ] **Step 3: 生成并执行迁移**
- [ ] **Step 4: 提交**

```bash
git add backend/shared/app/db/case/ backend/alembic/
git commit -m "feat: 扩展 SuccessCase 模型 — 可选院校关联和图片字段"
```

---

### Task 17: 案例 Admin + Public API 增强

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/cases/`（schemas, service, router）
- Modify: `backend/api/api/public/case/`（schemas, service）

Admin 新增接口：upload-avatar, upload-offer。编辑时新增 university_id 字段。
Public 详情响应新增：avatar_image_id, offer_image_id, related_university（院校摘要）。

- [ ] **Step 1: 扩展 admin schemas + service + router**
- [ ] **Step 2: 扩展 public schemas + service**
- [ ] **Step 3: 提交**

```bash
git add backend/api/api/admin/config/web_settings/cases/ backend/api/api/public/case/
git commit -m "feat: 案例 API 增强 — 图片上传和院校关联"
```

---

### Task 18: 前端 — 案例详情页增强 + Admin 增强

**Files:**
- Modify: `frontend/app/[locale]/(public)/cases/[id]/page.tsx`
- Modify: `frontend/components/admin/web-settings/CaseEditDialog.tsx`
- Modify: `frontend/components/admin/web-settings/CasesEditPreview.tsx`

详情页：学生照片、录取通知书（可放大）、院校名可跳转。
Admin 编辑弹窗：添加图片上传、院校下拉选择。

- [ ] **Step 1: 增强案例详情页**
- [ ] **Step 2: 增强 admin 编辑弹窗**
- [ ] **Step 3: 提交**

```bash
git add frontend/
git commit -m "feat: 案例详情页和管理后台增强"
```

---

### Task 19: 主页改造

**Files:**
- Create: `frontend/components/home/FeaturedUniversities.tsx`
- Create: `frontend/components/home/FeaturedCases.tsx`
- Modify: `frontend/app/[locale]/(public)/page.tsx`

FeaturedUniversities：从 API 获取 is_featured=true 的院校，网格卡片展示。
FeaturedCases：从 API 获取 is_featured=true 的案例，卡片展示。
主页：删除热门目的地板块，插入精选院校+案例板块。空数据时不渲染。

- [ ] **Step 1: 创建精选院校组件**
- [ ] **Step 2: 创建精选案例组件**
- [ ] **Step 3: 修改主页替换热门目的地**
- [ ] **Step 4: 提交**

```bash
git add frontend/components/home/ frontend/app/
git commit -m "feat: 主页改造 — 精选院校和成功案例替换热门目的地"
```

---

### Task 20: 前端 Admin — 院校管理增强

**Files:**
- Modify: `frontend/components/admin/web-settings/UniversityEditDialog.tsx`
- Modify: `frontend/components/admin/web-settings/UniversitiesEditPreview.tsx`

编辑弹窗增加：图片上传（校徽+图片集）、学科选择（checkbox 树）、QS 排名编辑（动态行）、录取要求/奖学金富文本、经纬度。
列表预览增加：校徽展示、QS 排名、批量导入按钮、学科分类管理入口。

- [ ] **Step 1: 增强编辑弹窗**
- [ ] **Step 2: 增强列表预览**
- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/
git commit -m "feat: 院校管理后台增强 — 图片、学科、批量导入"
```

---

### Task 21: i18n 翻译

**Files:**
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`

新增翻译键：Universities 命名空间（disciplines, admissionRequirements, scholarships, rankings, location, successCases, about, website）+ Home 命名空间（featuredUniversities, featuredCases, viewMore）。

- [ ] **Step 1: 添加中文翻译**
- [ ] **Step 2: 添加英文翻译**
- [ ] **Step 3: 提交**

```bash
git add frontend/messages/
git commit -m "feat: 添加院校和案例相关 i18n 翻译"
```

---

### Task 22: 清理遗留目录

- [ ] **Step 1: 删除 backend/shared/src/**

```bash
rm -rf backend/shared/src/
git add -A && git commit -m "chore: 删除遗留空目录 backend/shared/src"
```

---

### Task 23: 完整测试

**Files:**
- Create/Modify: 对应的 test_service.py 和 test_router.py

- [ ] **Step 1: 院校增强测试**（upload_logo, upload_image ≤5 限制, delete_image, set_disciplines）
- [ ] **Step 2: 批量导入测试**（preview 正常/异常, confirm, template 下载）
- [ ] **Step 3: 案例增强测试**（upload_avatar, upload_offer）
- [ ] **Step 4: 运行全部后端测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e
```

- [ ] **Step 5: 网关集成测试**（图片读取 + 学科分类完整链路）

```bash
uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
```

- [ ] **Step 6: 提交**

```bash
git add backend/api/tests/
git commit -m "test: 添加院校和案例增强功能的完整测试"
```
