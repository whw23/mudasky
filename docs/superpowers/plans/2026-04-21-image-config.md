# 网站图片配置系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每个页面 Banner 支持多图轮播配置，首页全屏 Hero + 院校搜索，Logo/favicon 上传改用 image 表，所有配置在 web-settings 可视化管理。

**Architecture:** 后端在 system_config 表新增 `page_banners` key 存储各页面的 image_ids 数组，新增 Banner 管理 API 和通用图片上传接口。前端 Banner 组件支持多图轮播，ConfigContext 扩展 pageBanners，各页面从 context 读取 imageIds。

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, React, Tailwind CSS

**Design Spec:** `docs/superpowers/specs/2026-04-21-image-config-design.md`

---

## Task 1: 后端 — page_banners 种子数据 + 配置验证

**Files:**
- Modify: `backend/scripts/init/seed_config.py`
- Modify: `backend/api/api/admin/config/schemas.py`

- [ ] **Step 1: 添加 page_banners 种子数据**

在 `backend/scripts/init/seed_config.py` 的 `CONFIGS` 列表中添加（在 `nav_config` 之后）：

```python
(
    "page_banners",
    "页面 Banner 配置",
    lambda: {
        "home": {"image_ids": []},
        "universities": {"image_ids": []},
        "cases": {"image_ids": []},
        "study-abroad": {"image_ids": []},
        "requirements": {"image_ids": []},
        "visa": {"image_ids": []},
        "life": {"image_ids": []},
        "news": {"image_ids": []},
        "about": {"image_ids": []},
    },
),
```

- [ ] **Step 2: 添加 page_banners 验证 schema**

在 `backend/api/api/admin/config/schemas.py` 中添加：

```python
class PageBannerItem(BaseModel):
    """单个页面的 Banner 配置。"""

    image_ids: list[str] = Field(default_factory=list, description="图片 ID 列表")


class PageBannersValue(BaseModel):
    """页面 Banner 配置验证。"""

    model_config = {"extra": "allow"}

    home: PageBannerItem = Field(default_factory=PageBannerItem)
    universities: PageBannerItem = Field(default_factory=PageBannerItem)
    cases: PageBannerItem = Field(default_factory=PageBannerItem)
    about: PageBannerItem = Field(default_factory=PageBannerItem)
```

在 `CONFIG_VALIDATORS` 中添加：
```python
"page_banners": PageBannersValue,
```

- [ ] **Step 3: 提交**

```bash
git add backend/scripts/init/seed_config.py backend/api/api/admin/config/schemas.py
git commit -m "feat: 添加 page_banners 种子数据和配置验证"
```

---

## Task 2: 后端 — Banner 管理 API + 通用图片上传

**Files:**
- Create: `backend/api/api/admin/config/web_settings/banners/__init__.py`
- Create: `backend/api/api/admin/config/web_settings/banners/schemas.py`
- Create: `backend/api/api/admin/config/web_settings/banners/service.py`
- Create: `backend/api/api/admin/config/web_settings/banners/router.py`
- Create: `backend/api/api/admin/config/web_settings/images/__init__.py`
- Create: `backend/api/api/admin/config/web_settings/images/router.py`
- Modify: `backend/api/api/admin/config/router.py` — 注册新路由

- [ ] **Step 1: 创建 Banner 管理 schemas**

```python
# backend/api/api/admin/config/web_settings/banners/__init__.py
"""Banner 管理。"""

from .router import router

description = "Banner 管理"

__all__ = ["router", "description"]

# backend/api/api/admin/config/web_settings/banners/schemas.py
"""Banner 管理请求/响应模型。"""

from pydantic import BaseModel, Field


class BannerUploadRequest(BaseModel):
    """上传 Banner 图片请求（page_key 通过 query 传入）。"""


class BannerRemoveRequest(BaseModel):
    """移除 Banner 图片请求。"""

    page_key: str = Field(..., description="页面 key")
    image_id: str = Field(..., description="图片 ID")


class BannerReorderRequest(BaseModel):
    """重排 Banner 图片请求。"""

    page_key: str = Field(..., description="页面 key")
    image_ids: list[str] = Field(..., description="重排后的图片 ID 列表")


class BannerConfigResponse(BaseModel):
    """Banner 配置响应。"""

    page_key: str
    image_ids: list[str] = []
```

- [ ] **Step 2: 创建 Banner 管理 service**

```python
# backend/api/api/admin/config/web_settings/banners/service.py
"""Banner 管理服务。"""

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.db.config import repository as config_repo
from app.db.image import repository as image_repo
from app.db.image.repository import ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE


class BannerService:
    """Banner 管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def get_all_banners(self) -> dict:
        """获取所有页面的 Banner 配置。"""
        config = await config_repo.get_config_by_key(
            self.session, "page_banners"
        )
        if not config:
            return {}
        return config.value

    async def upload_banner(
        self, page_key: str, file: UploadFile
    ) -> str:
        """上传 Banner 图片，返回 image_id。"""
        config = await config_repo.get_config_by_key(
            self.session, "page_banners"
        )
        if not config:
            raise NotFoundException(
                message="Banner 配置不存在",
                code="BANNER_CONFIG_NOT_FOUND",
            )
        banners = config.value
        if page_key not in banners:
            raise BadRequestException(
                message=f"无效的页面 key: {page_key}",
                code="INVALID_PAGE_KEY",
            )
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise BadRequestException(
                message="不支持的图片格式",
                code="INVALID_IMAGE_TYPE",
            )
        file_data = await file.read()
        if len(file_data) > MAX_IMAGE_SIZE:
            raise BadRequestException(
                message="图片大小不能超过 5MB",
                code="IMAGE_TOO_LARGE",
            )
        image = await image_repo.create_image(
            self.session,
            file_data,
            file.filename or "banner",
            file.content_type,
        )
        banners[page_key]["image_ids"].append(image.id)
        await config_repo.update_config(
            self.session, config
        )
        return image.id

    async def remove_banner(
        self, page_key: str, image_id: str
    ) -> None:
        """从指定页面移除 Banner 图片。"""
        config = await config_repo.get_config_by_key(
            self.session, "page_banners"
        )
        if not config:
            raise NotFoundException(
                message="Banner 配置不存在",
                code="BANNER_CONFIG_NOT_FOUND",
            )
        banners = config.value
        if page_key not in banners:
            raise BadRequestException(
                message=f"无效的页面 key: {page_key}",
                code="INVALID_PAGE_KEY",
            )
        ids = banners[page_key]["image_ids"]
        if image_id not in ids:
            raise NotFoundException(
                message="图片不存在于该页面",
                code="BANNER_IMAGE_NOT_FOUND",
            )
        ids.remove(image_id)
        await config_repo.update_config(
            self.session, config
        )

    async def reorder_banners(
        self, page_key: str, image_ids: list[str]
    ) -> None:
        """重排指定页面的 Banner 图片顺序。"""
        config = await config_repo.get_config_by_key(
            self.session, "page_banners"
        )
        if not config:
            raise NotFoundException(
                message="Banner 配置不存在",
                code="BANNER_CONFIG_NOT_FOUND",
            )
        banners = config.value
        if page_key not in banners:
            raise BadRequestException(
                message=f"无效的页面 key: {page_key}",
                code="INVALID_PAGE_KEY",
            )
        banners[page_key]["image_ids"] = image_ids
        await config_repo.update_config(
            self.session, config
        )
```

注意：需要检查 `config_repo` 是否有 `get_config_by_key` 和 `update_config` 方法。如果没有，需要在 `shared/app/db/config/repository.py` 中添加。

- [ ] **Step 3: 创建 Banner 管理 router**

```python
# backend/api/api/admin/config/web_settings/banners/router.py
"""Banner 管理接口。"""

from fastapi import APIRouter, File, UploadFile, status

from api.core.dependencies import DbSession

from .schemas import (
    BannerConfigResponse,
    BannerRemoveRequest,
    BannerReorderRequest,
)
from .service import BannerService

router = APIRouter(prefix="/banners", tags=["admin-banners"])


@router.get(
    "/list",
    summary="获取所有 Banner 配置",
)
async def list_banners(session: DbSession) -> dict:
    """获取所有页面的 Banner 配置。"""
    svc = BannerService(session)
    return await svc.get_all_banners()


@router.post(
    "/upload",
    summary="上传 Banner 图片",
)
async def upload_banner(
    page_key: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传 Banner 图片到指定页面。"""
    svc = BannerService(session)
    image_id = await svc.upload_banner(page_key, file)
    return {"image_id": image_id}


@router.post(
    "/remove",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="移除 Banner 图片",
)
async def remove_banner(
    data: BannerRemoveRequest,
    session: DbSession,
) -> None:
    """从指定页面移除 Banner 图片。"""
    svc = BannerService(session)
    await svc.remove_banner(data.page_key, data.image_id)


@router.post(
    "/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="重排 Banner 图片",
)
async def reorder_banners(
    data: BannerReorderRequest,
    session: DbSession,
) -> None:
    """重排指定页面的 Banner 图片顺序。"""
    svc = BannerService(session)
    await svc.reorder_banners(data.page_key, data.image_ids)
```

- [ ] **Step 4: 创建通用图片上传接口**

```python
# backend/api/api/admin/config/web_settings/images/__init__.py
"""通用图片上传。"""

from .router import router

description = "图片上传"

__all__ = ["router", "description"]

# backend/api/api/admin/config/web_settings/images/router.py
"""通用图片上传接口。"""

from fastapi import APIRouter, File, UploadFile

from api.core.dependencies import DbSession
from app.core.exceptions import BadRequestException
from app.db.image import repository as image_repo
from app.db.image.repository import ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE

router = APIRouter(prefix="/images", tags=["admin-images"])


@router.post(
    "/upload",
    summary="上传图片",
)
async def upload_image(
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传图片到 image 表，返回 id 和公开 URL。"""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(
            message="不支持的图片格式",
            code="INVALID_IMAGE_TYPE",
        )
    file_data = await file.read()
    if len(file_data) > MAX_IMAGE_SIZE:
        raise BadRequestException(
            message="图片大小不能超过 5MB",
            code="IMAGE_TOO_LARGE",
        )
    image = await image_repo.create_image(
        session,
        file_data,
        file.filename or "image",
        file.content_type,
    )
    return {
        "id": image.id,
        "url": f"/api/public/images/detail?id={image.id}",
    }
```

- [ ] **Step 5: 注册新路由**

在 `backend/api/api/admin/config/router.py` 中添加：

```python
from .web_settings.banners import router as ws_banners_router
from .web_settings.images import router as ws_images_router

# 在 web_settings_router 挂载区域添加：
web_settings_router.include_router(ws_banners_router)
web_settings_router.include_router(ws_images_router)
```

- [ ] **Step 6: 检查并补全 config repository 方法**

检查 `backend/shared/app/db/config/repository.py` 是否有 `get_config_by_key` 和 `update_config` 方法。如果没有，添加：

```python
async def get_config_by_key(
    session: AsyncSession, key: str
) -> SystemConfig | None:
    """根据 key 获取配置。"""
    return await session.get(SystemConfig, key)


async def update_config(
    session: AsyncSession, config: SystemConfig
) -> SystemConfig:
    """更新配置。"""
    await session.commit()
    await session.refresh(config)
    return config
```

- [ ] **Step 7: 提交**

```bash
git add backend/api/api/admin/config/
git commit -m "feat: 添加 Banner 管理 API 和通用图片上传接口"
```

---

## Task 3: 后端 — 公开 Banner 配置接口

**Files:**
- Modify: `backend/api/api/public/config/router.py`
- Modify: `backend/api/api/public/config/service.py`

- [ ] **Step 1: 在 public config service 中添加 page_banners 到首页配置**

读取 `backend/api/api/public/config/service.py`，在 `get_all_homepage_config` 方法中添加 `page_banners` 的读取，和现有 config（site_info, contact_info 等）一起返回。

- [ ] **Step 2: 提交**

```bash
git add backend/api/api/public/config/
git commit -m "feat: 公开接口返回 page_banners 配置"
```

---

## Task 4: 前端 — ConfigContext 扩展 pageBanners

**Files:**
- Modify: `frontend/types/config.ts`
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 添加 PageBanners 类型**

在 `frontend/types/config.ts` 中添加：

```typescript
/** 单个页面的 Banner 配置 */
export interface PageBannerConfig {
  image_ids: string[]
}

/** 所有页面的 Banner 配置 */
export type PageBanners = Record<string, PageBannerConfig>
```

- [ ] **Step 2: ConfigContext 添加 pageBanners**

在 `frontend/contexts/ConfigContext.tsx` 中：

1. 添加 import：
```typescript
import type { PageBanners } from "@/types/config"
```

2. 添加 state 和 default：
```typescript
const [pageBanners, setPageBanners] = useState<PageBanners>({})
```

3. 在 API 响应处理中添加：
```typescript
if (data.page_banners) setPageBanners(data.page_banners)
```

4. 在 context value 中添加 `pageBanners`

- [ ] **Step 3: 提交**

```bash
git add frontend/types/config.ts frontend/contexts/ConfigContext.tsx
git commit -m "feat: ConfigContext 扩展 pageBanners"
```

---

## Task 5: 前端 — Banner 组件改造（多图轮播 + 全屏）

**Files:**
- Modify: `frontend/components/layout/Banner.tsx`

- [ ] **Step 1: 重写 Banner 组件**

修改 `Banner.tsx`：

1. Props 变更：`image?: string` → `imageIds?: string[]`，新增 `children?: React.ReactNode`
2. 多图轮播：`useState` 管理 activeIndex，`useEffect` 设置 5 秒定时器自动切换
3. 全屏首页：`large` 时高度改为 `h-screen`
4. children 渲染在标题下方（首页搜索框用）

```typescript
interface BannerProps {
  title: string
  subtitle?: string
  imageIds?: string[]
  large?: boolean
  children?: React.ReactNode
}
```

关键逻辑：
- 图片 URL：`/api/public/images/detail?id=${imageIds[activeIndex]}`
- 多图时：淡入淡出切换（CSS transition opacity）
- 空 imageIds 或未提供：保持默认渐变背景
- `large` 时：`min-h-screen` 替代 `min-h-[280px] md:min-h-[420px]`

需要加 `"use client"` 指令（因为有 useState/useEffect）。

- [ ] **Step 2: 提交**

```bash
git add frontend/components/layout/Banner.tsx
git commit -m "feat: Banner 组件支持多图轮播和全屏模式"
```

---

## Task 6: 前端 — HeroSearch 首页搜索组件

**Files:**
- Create: `frontend/components/home/HeroSearch.tsx`
- Modify: `frontend/components/public/UniversitySearch.tsx`

- [ ] **Step 1: 创建 HeroSearch 组件**

```typescript
// frontend/components/home/HeroSearch.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"

const ALL = "__all__"

interface DisciplineCategory {
  id: string
  name: string
}

/** 首页院校搜索框 */
export function HeroSearch() {
  const t = useTranslations("Universities")
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [countries, setCountries] = useState<string[]>([])
  const [categories, setCategories] = useState<DisciplineCategory[]>([])

  useEffect(() => {
    api.get<string[]>("/public/universities/countries")
      .then(({ data }) => setCountries(data))
      .catch(() => {})
    api.get<{ id: string; name: string }[]>("/public/disciplines/list")
      .then(({ data }) => setCategories(data))
      .catch(() => {})
  }, [])

  function handleSearch() {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (country) params.set("country", country)
    if (categoryId) params.set("discipline_category_id", categoryId)
    router.push(`/universities${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row gap-3 rounded-xl bg-white/10 backdrop-blur-sm p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-white/90 text-foreground"
        />
        <Select value={country || ALL} onValueChange={(v) => setCountry(v === ALL ? "" : v)}>
          <SelectTrigger className="w-full md:w-36 bg-white/90 text-foreground">
            <SelectValue placeholder={t("allCountries")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allCountries")}</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId || ALL} onValueChange={(v) => setCategoryId(v === ALL ? "" : v)}>
          <SelectTrigger className="w-full md:w-36 bg-white/90 text-foreground">
            <SelectValue placeholder={t("allDisciplineCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allDisciplineCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
          <Search className="size-4 mr-2" />
          {t("searchButton")}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: UniversitySearch 从 URL 参数初始化**

在 `frontend/components/public/UniversitySearch.tsx` 中：

1. 添加 `useSearchParams` 导入
2. 在组件初始化时从 URL 读取 search、country、discipline_category_id 参数
3. 设置为初始筛选状态

```typescript
import { useSearchParams } from "next/navigation"

// 在组件内：
const searchParams = useSearchParams()

useEffect(() => {
  const urlSearch = searchParams.get("search") || ""
  const urlCountry = searchParams.get("country") || ""
  const urlCategoryId = searchParams.get("discipline_category_id") || ""
  if (urlSearch) setSearch(urlSearch)
  if (urlCountry) setCountry(urlCountry)
  if (urlCategoryId) setDisciplineCategoryId(urlCategoryId)
}, [])
```

- [ ] **Step 3: 添加 i18n 翻译键**

在 `frontend/messages/zh.json` 和 `en.json` 的 Universities 命名空间添加：

```json
"searchButton": "搜索院校",
"searchPlaceholder": "搜索院校名称、城市..."
```

- [ ] **Step 4: 提交**

```bash
git add frontend/components/home/HeroSearch.tsx frontend/components/public/UniversitySearch.tsx frontend/messages/
git commit -m "feat: 首页院校搜索组件 + UniversitySearch URL 参数同步"
```

---

## Task 7: 前端 — 首页和所有页面传入 Banner imageIds

**Files:**
- Modify: `frontend/app/[locale]/(public)/page.tsx` — 首页
- Modify: 所有其他使用 `<Banner>` 的页面文件

- [ ] **Step 1: 修改首页**

在 `frontend/app/[locale]/(public)/page.tsx` 中：

由于 Banner 需要从 ConfigContext 读取 pageBanners（client-side），而首页是 Server Component，需要把 Banner+HeroSearch 部分提取到一个 client 组件。

创建 `frontend/components/home/HomeBanner.tsx`：

```typescript
"use client"

import { useConfig } from "@/contexts/ConfigContext"
import { useTranslations } from "next-intl"
import { Banner } from "@/components/layout/Banner"
import { HeroSearch } from "@/components/home/HeroSearch"

/** 首页 Banner（含搜索框） */
export function HomeBanner() {
  const t = useTranslations("Home")
  const { pageBanners } = useConfig()
  const imageIds = pageBanners?.home?.image_ids || []

  return (
    <Banner
      title={t("heroTitle")}
      subtitle={t("heroSubtitle")}
      imageIds={imageIds}
      large
    >
      <HeroSearch />
    </Banner>
  )
}
```

然后在首页 `page.tsx` 中替换：
```typescript
// 替换前
<Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} large />

// 替换后
import { HomeBanner } from "@/components/home/HomeBanner"
<HomeBanner />
```

- [ ] **Step 2: 修改其他页面**

对每个使用 `<Banner>` 的页面，创建一个 client wrapper 或直接在页面中用 client component 包裹 Banner。

简化方案：创建一个通用的 `PageBanner` client component：

```typescript
// frontend/components/layout/PageBanner.tsx
"use client"

import { useConfig } from "@/contexts/ConfigContext"
import { Banner } from "./Banner"

interface PageBannerProps {
  pageKey: string
  title: string
  subtitle?: string
}

/** 从配置读取 Banner 图片的页面横幅 */
export function PageBanner({ pageKey, title, subtitle }: PageBannerProps) {
  const { pageBanners } = useConfig()
  const imageIds = pageBanners?.[pageKey]?.image_ids || []

  return (
    <Banner title={title} subtitle={subtitle} imageIds={imageIds} />
  )
}
```

然后所有页面统一改为：
```typescript
// 替换前
<Banner title={p("universities")} subtitle={p("universitiesSubtitle")} />

// 替换后
<PageBanner pageKey="universities" title={p("universities")} subtitle={p("universitiesSubtitle")} />
```

注意：`getTranslations` 是 server-side，`PageBanner` 是 client-side。需要在 server page 中获取翻译后传给 `PageBanner` 的 title/subtitle props。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/home/HomeBanner.tsx frontend/components/layout/PageBanner.tsx frontend/app/
git commit -m "feat: 所有页面 Banner 从配置读取背景图"
```

---

## Task 8: 前端 — ConfigEditDialog 图片上传改用 image 表

**Files:**
- Modify: `frontend/components/admin/ConfigEditDialog.tsx`

- [ ] **Step 1: 修改上传函数**

将 `uploadImage` 函数改为调用通用图片上传接口：

```typescript
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post("/admin/web-settings/images/upload", formData)
  return data.url
}
```

其余代码不变——返回的 URL 格式自动变为 `/api/public/images/detail?id=xxx`。

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/ConfigEditDialog.tsx
git commit -m "feat: ConfigEditDialog 图片上传改用 image 表"
```

---

## Task 9: 前端 — BannerImageEditor 管理组件

**Files:**
- Create: `frontend/components/admin/web-settings/BannerImageEditor.tsx`
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

- [ ] **Step 1: 创建 BannerImageEditor**

```typescript
// frontend/components/admin/web-settings/BannerImageEditor.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface BannerImageEditorProps {
  pageKey: string
  imageIds: string[]
  onUpdate: () => void
}

/** Banner 图片管理组件 */
export function BannerImageEditor({
  pageKey,
  imageIds,
  onUpdate,
}: BannerImageEditorProps) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      await api.post(
        `/admin/web-settings/banners/upload?page_key=${pageKey}`,
        form
      )
      toast.success("Banner 图片上传成功")
      onUpdate()
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(imageId: string) {
    try {
      await api.post("/admin/web-settings/banners/remove", {
        page_key: pageKey,
        image_id: imageId,
      })
      toast.success("已移除")
      onUpdate()
    } catch {
      toast.error("移除失败")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Banner 背景图</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          id={`banner-upload-${pageKey}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() =>
            document.getElementById(`banner-upload-${pageKey}`)?.click()
          }
        >
          <Plus className="size-4 mr-1" />
          {uploading ? "上传中..." : "添加图片"}
        </Button>
      </div>
      {imageIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageIds.map((id) => (
            <div key={id} className="group relative h-20 w-32 overflow-hidden rounded border">
              <img
                src={`/api/public/images/detail?id=${id}`}
                alt="Banner"
                className="size-full object-cover"
              />
              <button
                onClick={() => handleRemove(id)}
                className="absolute right-1 top-1 rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      {imageIds.length === 0 && (
        <p className="text-xs text-muted-foreground">未设置背景图，使用默认渐变色</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 集成到 web-settings 页面**

在 `frontend/app/[locale]/[panel]/web-settings/page.tsx` 中：

1. 每个 tab 的预览区域 Banner 下方添加 BannerImageEditor
2. 从 API `/admin/web-settings/banners/list` 获取 Banner 配置数据
3. 传入对应 pageKey 和 imageIds

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/BannerImageEditor.tsx frontend/app/
git commit -m "feat: web-settings Banner 图片管理组件"
```

---

## Task 10: 删库重建 + 测试

- [ ] **Step 1: 删库重建**

```bash
docker compose down -v
docker compose build api
docker compose up -d
sleep 15
export $(grep -v '^#' env/backend.env | grep -v '^$' | xargs) && export DB_HOST=localhost && uv run --project backend/shared alembic -c backend/alembic.ini stamp head
```

- [ ] **Step 2: 运行后端测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e --tb=short -q
```

- [ ] **Step 3: 通过 Playwright 测试**

1. 访问管理后台 web-settings
2. 上传 Banner 背景图
3. 验证公开页面 Banner 显示图片
4. 测试首页搜索框跳转

- [ ] **Step 4: 修复发现的 bug**

- [ ] **Step 5: 提交修复**
