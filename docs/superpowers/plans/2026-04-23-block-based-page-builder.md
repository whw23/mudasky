# 模组化页面构建器 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有公开页面统一为 Block（模组）驱动的动态渲染，管理员可增删排序 Block，数据自包含在 Block 内。

**Architecture:** 新增 `page_blocks` 配置键存储每页的 Block 数组。Block 自包含类型+显示配置+数据。前端 BlockRenderer 按 type 分发渲染，公开页面通过 Server Component 预取数据实现 SSR。现有 Section 组件迁移到 `components/blocks/` 并适配 Block 接口。

**Tech Stack:** Next.js + React + TypeScript + Tailwind CSS + shadcn/ui + next-intl + @hello-pangea/dnd

**Spec:** `docs/superpowers/specs/2026-04-23-block-based-page-builder-design.md`

---

## 文件结构概览

### 新建文件

| 文件 | 职责 |
|------|------|
| `frontend/types/block.ts` | Block、BlockType、PageBlocks 类型定义 |
| `frontend/lib/page-api.ts` | 服务端 page_blocks 数据预取函数 |
| `frontend/components/blocks/SectionHeader.tsx` | 通用标题区域（tag + title + 分隔线） |
| `frontend/components/blocks/BlockRenderer.tsx` | 核心：按 Block.type 分发渲染 |
| `frontend/components/blocks/PageBlocksRenderer.tsx` | 页面级：从 props/context 读 blocks 调用 BlockRenderer |
| `frontend/components/blocks/IntroBlock.tsx` | 介绍模组（从现有 PageIntroSection 适配） |
| `frontend/components/blocks/CardGridBlock.tsx` | 卡片网格模组（从现有 CardGridSection 适配） |
| `frontend/components/blocks/StepListBlock.tsx` | 步骤列表模组（从现有 StepListSection 适配） |
| `frontend/components/blocks/DocListBlock.tsx` | 文档清单模组（从现有 DocListSection 适配） |
| `frontend/components/blocks/GalleryBlock.tsx` | 图片墙模组（从现有 OfficeGallery 适配） |
| `frontend/components/blocks/CtaBlock.tsx` | CTA 模组（从现有 CtaSection 适配） |
| `frontend/components/blocks/FeaturedDataBlock.tsx` | 精选展示模组（合并 FeaturedUniversities + FeaturedCases） |
| `frontend/components/blocks/ArticleListBlock.tsx` | 文章列表模组（从现有 ArticleListClient 适配） |
| `frontend/components/blocks/UniversityListBlock.tsx` | 院校列表模组（从现有 UniversityList 适配） |
| `frontend/components/blocks/CaseGridBlock.tsx` | 案例网格模组（从现有 CaseGrid 适配） |
| `frontend/components/admin/web-settings/AddBlockDialog.tsx` | 添加模组选择弹窗 |
| `frontend/components/admin/web-settings/BlockEditorOverlay.tsx` | Block 编辑覆盖层（拖拽+删除+编辑配置） |
| `frontend/components/admin/web-settings/BlockEditDialog.tsx` | Block 显示配置编辑弹窗 |
| `frontend/components/admin/web-settings/PageBlocksPreview.tsx` | 预览中的 Block 列表管理 |
| `frontend/app/[locale]/(public)/[slug]/page.tsx` | 自定义页面动态路由 |

### 修改文件

| 文件 | 改造内容 |
|------|----------|
| `frontend/types/config.ts` | SiteInfo 删除页面级字段，只保留全局配置 |
| `frontend/contexts/ConfigContext.tsx` | 新增 pageBlocks 数据源，精简 DEFAULT_SITE_INFO |
| `frontend/app/[locale]/(public)/page.tsx` | 改用 PageBlocksRenderer |
| `frontend/app/[locale]/(public)/about/page.tsx` | 改用 PageBlocksRenderer |
| 其余 7 个 public page.tsx | 改用 PageBlocksRenderer |
| `frontend/app/[locale]/[panel]/web-settings/page.tsx` | 新增 page_blocks 编辑逻辑 |
| `frontend/components/admin/web-settings/PagePreview.tsx` | 统一用 PageBlocksPreview |
| `backend/scripts/init/seed_config.py` | 新增 page_blocks 种子数据，精简 site_info |
| `backend/api/api/public/config/service.py` | get_all_homepage_config 返回 page_blocks |
| `backend/api/api/public/config/router.py` | 可选：新增 page-blocks 端点 |

### 删除文件

| 文件 | 原因 |
|------|------|
| `frontend/components/common/PageIntroSection.tsx` | 迁移到 blocks/IntroBlock.tsx |
| `frontend/components/common/CardGridSection.tsx` | 迁移到 blocks/CardGridBlock.tsx |
| `frontend/components/common/StepListSection.tsx` | 迁移到 blocks/StepListBlock.tsx |
| `frontend/components/common/DocListSection.tsx` | 迁移到 blocks/DocListBlock.tsx |
| `frontend/components/common/CtaSection.tsx` | 迁移到 blocks/CtaBlock.tsx |
| `frontend/components/common/CountryRequirementsSection.tsx` | 合并到 CardGridBlock(checklist) |
| `frontend/components/common/FeaturedProgramSection.tsx` | 合并到 CardGridBlock(program) |
| `frontend/components/about/OfficeGallery.tsx` | 迁移到 blocks/GalleryBlock.tsx |
| `frontend/components/home/FeaturedUniversities.tsx` | 合并到 FeaturedDataBlock |
| `frontend/components/home/FeaturedCases.tsx` | 合并到 FeaturedDataBlock |
| `frontend/components/home/UniversityGallery.tsx` | 合并到 FeaturedDataBlock |
| `frontend/components/admin/web-settings/ArticlePreviewPage.tsx` | 统一到 PageBlocksPreview |
| `frontend/components/admin/web-settings/CasesPreviewPage.tsx` | 统一到 PageBlocksPreview |
| `frontend/components/admin/web-settings/UniversitiesPreviewPage.tsx` | 统一到 PageBlocksPreview |

---

## Phase 1: 数据基础设施

### Task 1: Block 类型定义 + ConfigContext 扩展

**Files:**
- Create: `frontend/types/block.ts`
- Modify: `frontend/types/config.ts`
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 创建 Block 类型定义**

```typescript
// frontend/types/block.ts
import type { LocalizedField } from "@/lib/i18n-config"

export type BlockType =
  | "intro"
  | "card_grid"
  | "step_list"
  | "doc_list"
  | "gallery"
  | "article_list"
  | "university_list"
  | "case_grid"
  | "featured_data"
  | "cta"

export interface Block {
  id: string
  type: BlockType
  showTitle: boolean
  sectionTag: string
  sectionTitle: LocalizedField
  bgColor: "white" | "gray"
  options: Record<string, any>
  data: any
}

export type PageBlocks = Record<string, Block[]>

export type CardType = "guide" | "timeline" | "city" | "program" | "checklist"
```

- [ ] **Step 2: 精简 SiteInfo 类型**

在 `frontend/types/config.ts` 中删除所有页面级字段（`home_intro_*`、`about_cards`、`visa_*`、`study_abroad_*`、`requirements_*`、`life_*`、`cases_*`、`universities_*`、`about_cta_*`、`about_office_images`），只保留全局品牌/联系方式字段：

```typescript
export interface SiteInfo {
  brand_name: LocalizedField
  tagline: LocalizedField
  hotline: string
  hotline_contact: LocalizedField
  logo_url: string
  favicon_url: string
  wechat_service_qr_url: string
  wechat_official_qr_url: string
  company_name: string
  icp_filing: string
}
```

同时删除 `AboutInfo` 中的 `mission`、`vision`、`partnership` 字段（迁移到 Block.data）。保留 `history_title` 和 `history`（HistorySection 仍直接使用，后续迁移到 intro Block）。

- [ ] **Step 3: ConfigContext 新增 pageBlocks + 精简默认值**

在 `ConfigContext.tsx` 中：
1. 导入 `PageBlocks` 类型
2. `ConfigContextType` 新增 `pageBlocks: PageBlocks`
3. `DEFAULT_SITE_INFO` 删除所有页面级字段
4. `useLocalizedConfig` 的 `LocalizedConfigType` 同步精简
5. 新增 `DEFAULT_PAGE_BLOCKS: PageBlocks = {}`
6. 数据获取时解析 `page_blocks` 配置

- [ ] **Step 4: 验证 TypeScript 编译**

先处理编译错误——很多现有组件引用了被删除的 SiteInfo 字段。这些组件将在后续 Task 中迁移到 Block 接口，此步骤先用 `// @ts-ignore` 或 `as any` 临时处理，确保编译通过。

- [ ] **Step 5: 提交**

```bash
git commit -m "feat: Block 类型定义 + SiteInfo 精简 + ConfigContext pageBlocks"
```

---

### Task 2: 后端 API + 种子数据迁移

**Files:**
- Modify: `backend/scripts/init/seed_config.py`
- Modify: `backend/api/api/public/config/service.py`
- Create: `frontend/lib/page-api.ts`

- [ ] **Step 1: 种子数据新增 page_blocks**

在 `seed_config.py` 的 CONFIGS 列表中新增 `page_blocks` 配置键。将现有 site_info 中的页面级数据搬到对应页面的 Block.data 中。

每个页面生成完整的 Block 数组。示例（首页）：

```python
("page_blocks", "页面模组配置", lambda: {
    "home": [
        {
            "id": str(uuid4()),
            "type": "featured_data",
            "showTitle": True,
            "sectionTag": "Partner Universities",
            "sectionTitle": {"zh": "合作院校", "en": "Partner Universities"},
            "bgColor": "white",
            "options": {"dataType": "universities", "maxItems": 6},
            "data": None,
        },
        {
            "id": str(uuid4()),
            "type": "featured_data",
            "showTitle": True,
            "sectionTag": "Success Stories",
            "sectionTitle": {"zh": "成功案例", "en": "Success Stories"},
            "bgColor": "white",
            "options": {"dataType": "cases", "maxItems": 4},
            "data": None,
        },
        {
            "id": str(uuid4()),
            "type": "cta",
            "showTitle": False,
            "sectionTag": "",
            "sectionTitle": "",
            "bgColor": "white",
            "options": {"variant": "border-t"},
            "data": {
                "title": {"zh": "开启你的留学之旅", "en": "Start Your Study Abroad Journey"},
                "desc": {"zh": "15年专注国际教育...", "en": "15 years of dedication..."},
            },
        },
    ],
    # about, universities, cases, study-abroad, visa, requirements, life, news
    # 每个页面完整的 Block 列表...
})
```

**关键：** 将现有 site_info 种子数据中的页面级字段（如 `visa_process_steps` 数组）剪切到对应 Block 的 data 中。site_info 种子数据中删除这些字段。

所有 9 个预设页面（home、about、universities、cases、study-abroad、visa、requirements、life、news）都要生成完整的 Block 列表。

- [ ] **Step 2: 精简 site_info 种子数据**

从 site_info 种子数据中删除所有已迁移到 page_blocks 的字段。只保留全局字段（brand_name、tagline、hotline 等）。

- [ ] **Step 3: 后端 API 返回 page_blocks**

在 `backend/api/api/public/config/service.py` 的 `get_all_homepage_config` 方法中，将 `page_blocks` 加入返回值：

```python
async def get_all_homepage_config(self) -> tuple[dict, datetime]:
    keys = ["contact_info", "site_info", "homepage_stats", "about_info", "page_banners", "nav_config", "page_blocks"]
    # ...
```

- [ ] **Step 4: 创建服务端预取函数**

```typescript
// frontend/lib/page-api.ts
import type { Block } from "@/types/block"

const INTERNAL_API = process.env.INTERNAL_API_URL || "http://api:8000"

export async function fetchPageBlocks(slug: string): Promise<Block[]> {
  try {
    const res = await fetch(`${INTERNAL_API}/api/public/config/page_blocks`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.value?.[slug] ?? []
  } catch {
    return []
  }
}
```

- [ ] **Step 5: 提交**

```bash
git commit -m "feat: page_blocks 种子数据 + 后端 API + 服务端预取函数"
```

---

## Phase 2: Block 渲染组件

### Task 3: SectionHeader + BlockRenderer + PageBlocksRenderer

**Files:**
- Create: `frontend/components/blocks/SectionHeader.tsx`
- Create: `frontend/components/blocks/BlockRenderer.tsx`
- Create: `frontend/components/blocks/PageBlocksRenderer.tsx`

- [ ] **Step 1: 创建 SectionHeader**

通用标题区域，从现有各 Section 的重复标题代码提取：

```tsx
"use client"

import { getLocalizedValue } from "@/lib/i18n-config"
import { useLocale } from "next-intl"
import type { LocalizedField } from "@/lib/i18n-config"

interface SectionHeaderProps {
  tag: string
  title: LocalizedField
}

export function SectionHeader({ tag, title }: SectionHeaderProps) {
  const locale = useLocale()
  const resolvedTitle = typeof title === "string" ? title : getLocalizedValue(title, locale)

  return (
    <div className="text-center">
      {tag && (
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {tag}
        </h2>
      )}
      <h3 className="mt-2 text-2xl md:text-3xl font-bold">{resolvedTitle}</h3>
      <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
    </div>
  )
}
```

- [ ] **Step 2: 创建 BlockRenderer**

核心分发渲染器：

```tsx
"use client"

import { Fragment, type ReactNode } from "react"
import type { Block } from "@/types/block"
import { SectionHeader } from "./SectionHeader"
// ... 导入所有 Block 组件

interface BlockRendererProps {
  blocks: Block[]
  editable?: boolean
  onEditBlock?: (block: Block) => void
  onEditData?: (block: Block) => void
}

export function BlockRenderer({ blocks, editable, onEditBlock, onEditData }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <Fragment key={block.id}>
          {renderBlock(block, editable, onEditData)}
        </Fragment>
      ))}
    </>
  )
}

function renderBlock(block: Block, editable?: boolean, onEditData?: (b: Block) => void): ReactNode {
  const header = block.showTitle
    ? <SectionHeader tag={block.sectionTag} title={block.sectionTitle} />
    : null
  const bg = block.bgColor === "gray" ? "bg-gray-50" : ""

  switch (block.type) {
    case "intro":
      return <IntroBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "card_grid":
      return <CardGridBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "step_list":
      return <StepListBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "doc_list":
      return <DocListBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "gallery":
      return <GalleryBlock block={block} header={header} bg={bg} editable={editable} />
    case "article_list":
      return <ArticleListBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "university_list":
      return <UniversityListBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "case_grid":
      return <CaseGridBlock block={block} header={header} bg={bg} editable={editable} onEdit={onEditData} />
    case "featured_data":
      return <FeaturedDataBlock block={block} header={header} bg={bg} />
    case "cta":
      return <CtaBlock block={block} editable={editable} onEdit={onEditData} />
    default:
      return null
  }
}
```

- [ ] **Step 3: 创建 PageBlocksRenderer**

页面级组件，支持 SSR 预取的 initialBlocks 和客户端 ConfigContext 实时数据：

```tsx
"use client"

import { useConfig } from "@/contexts/ConfigContext"
import { BlockRenderer } from "./BlockRenderer"
import type { Block } from "@/types/block"

interface PageBlocksRendererProps {
  pageSlug: string
  initialBlocks?: Block[]
  editable?: boolean
  onEditBlock?: (block: Block) => void
  onEditData?: (block: Block) => void
}

export function PageBlocksRenderer({
  pageSlug, initialBlocks, editable, onEditBlock, onEditData,
}: PageBlocksRendererProps) {
  const { pageBlocks } = useConfig()
  const blocks = pageBlocks[pageSlug]?.length > 0
    ? pageBlocks[pageSlug]
    : initialBlocks ?? []

  if (blocks.length === 0) return null

  return (
    <BlockRenderer
      blocks={blocks}
      editable={editable}
      onEditBlock={onEditBlock}
      onEditData={onEditData}
    />
  )
}
```

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: SectionHeader + BlockRenderer + PageBlocksRenderer 核心渲染系统"
```

---

### Task 4: 迁移 Block 组件（配置驱动型）

**Files:**
- Create: `frontend/components/blocks/IntroBlock.tsx`
- Create: `frontend/components/blocks/CardGridBlock.tsx`
- Create: `frontend/components/blocks/StepListBlock.tsx`
- Create: `frontend/components/blocks/DocListBlock.tsx`
- Create: `frontend/components/blocks/GalleryBlock.tsx`
- Create: `frontend/components/blocks/CtaBlock.tsx`

- [ ] **Step 1: 创建 IntroBlock**

从 PageIntroSection 适配。关键变化：数据从 `block.data.title` / `block.data.content` 读取（而非 siteInfo[configKey]）。

```tsx
interface IntroBlockProps {
  block: Block
  header: ReactNode | null
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}
```

Block.data 结构：`{ title: LocalizedField, content: LocalizedField }`

渲染：section 包装 + header + 居中段落文本。editable 时用 EditableOverlay 包裹。

- [ ] **Step 2-5: 创建其他配置驱动型 Block**

每个 Block 组件遵循同一模式：
1. 从 `block.data` 读取内容（而非 siteInfo[configKey]）
2. 从 `block.options` 读取显示配置（cardType、maxColumns、iconName 等）
3. header 和 bg 由 BlockRenderer 传入
4. editable 时包裹 EditableOverlay

**CardGridBlock**：合并现有 CardGridSection + CountryRequirementsSection。新增 `checklist` cardType。data 是卡片数组。options 含 `cardType` 和 `maxColumns`。

**StepListBlock**：从 StepListSection 适配。data 是 `[{ title, desc }]` 数组。

**DocListBlock**：从 DocListSection 适配。data 是 `[{ text }]` 数组。options 含 `iconName`。

**GalleryBlock**：从 OfficeGallery 适配。data 是 `[{ image_id, caption }]` 数组。需保留图片上传/删除功能。

**CtaBlock**：从 CtaSection 适配。data 含 `{ title, desc }`。options 含 `variant`。

- [ ] **Step 6: 提交**

```bash
git commit -m "feat: 配置驱动型 Block 组件（Intro/CardGrid/StepList/DocList/Gallery/Cta）"
```

---

### Task 5: API 驱动型 Block 组件

**Files:**
- Create: `frontend/components/blocks/FeaturedDataBlock.tsx`
- Create: `frontend/components/blocks/ArticleListBlock.tsx`
- Create: `frontend/components/blocks/UniversityListBlock.tsx`
- Create: `frontend/components/blocks/CaseGridBlock.tsx`

- [ ] **Step 1: 创建 FeaturedDataBlock**

合并 FeaturedUniversities + FeaturedCases + UniversityGallery。

Props 中 `block.options.dataType` 决定数据源（"universities" 或 "cases"），`block.options.maxItems` 限制数量。

内部根据 dataType 调用不同 API：
- universities → `/public/universities/list?is_featured=true&page_size={maxItems}`
- cases → `/public/cases/list?is_featured=true&page_size={maxItems}`

渲染和现有 FeaturedUniversities/FeaturedCases 一致。

- [ ] **Step 2: 创建 ArticleListBlock**

薄包装层，将 block.options.categorySlug 传递给现有的 ArticleListClient 组件。

```tsx
export function ArticleListBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <ArticleListClient
          categorySlug={block.options.categorySlug}
          editable={editable}
          onEdit={onEdit ? (article) => onEdit(block) : undefined}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 创建 UniversityListBlock + CaseGridBlock**

同样是薄包装层，将 editable/onEdit 传递给现有组件。

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: API 驱动型 Block 组件（FeaturedData/ArticleList/UniversityList/CaseGrid）"
```

---

## Phase 3: 页面路由转换

### Task 6: 预设页面改用 PageBlocksRenderer

**Files:**
- Modify: 9 个 `frontend/app/[locale]/(public)/*/page.tsx`

- [ ] **Step 1: 改造首页**

```tsx
import { HomeBanner } from "@/components/home/HomeBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"

export default async function HomePage() {
  const blocks = await fetchPageBlocks("home")
  return (
    <>
      <HomeBanner />
      <PageBlocksRenderer pageSlug="home" initialBlocks={blocks} />
    </>
  )
}
```

- [ ] **Step 2: 改造其他 8 个预设页面**

每个页面统一为：
```tsx
export default async function XxxPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("xxx")
  return (
    <>
      <PageBanner pageKey="xxx" title={p("xxx")} subtitle={p("xxxSubtitle")} />
      <PageBlocksRenderer pageSlug="xxx" initialBlocks={blocks} />
    </>
  )
}
```

关于页特殊：保留 ContactInfoSection 和 HistorySection 在 Banner 之后（这两个组件有独立的编辑机制，暂不作为 Block）。

- [ ] **Step 3: 验证 + 提交**

```bash
git commit -m "refactor: 所有预设页面改用 PageBlocksRenderer + SSR 预取"
```

---

### Task 7: 自定义页面动态路由

**Files:**
- Create: `frontend/app/[locale]/(public)/[slug]/page.tsx`

- [ ] **Step 1: 创建动态路由**

```tsx
import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  const blocks = await fetchPageBlocks(slug)

  // 如果 slug 匹配预设路由则 404（避免冲突）
  const PRESET = ["universities", "study-abroad", "requirements", "cases", "visa", "life", "news", "about"]
  if (PRESET.includes(slug)) return notFound()

  return (
    <>
      <PageBanner pageKey={slug} title={slug} />
      <PageBlocksRenderer pageSlug={slug} initialBlocks={blocks} />
    </>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git commit -m "feat: 自定义页面动态路由 [slug]/page.tsx"
```

---

## Phase 4: 预览编辑 UI

### Task 8: Block 编辑交互组件

**Files:**
- Create: `frontend/components/admin/web-settings/BlockEditorOverlay.tsx`
- Create: `frontend/components/admin/web-settings/AddBlockDialog.tsx`
- Create: `frontend/components/admin/web-settings/BlockEditDialog.tsx`

- [ ] **Step 1: 创建 BlockEditorOverlay**

每个 Block 的编辑覆盖层，显示拖拽手柄 + 类型标签 + 删除按钮。

```tsx
interface BlockEditorOverlayProps {
  block: Block
  children: ReactNode
  onDelete: (blockId: string) => void
  dragHandleProps?: any  // @hello-pangea/dnd 的 dragHandle
}
```

渲染：顶部悬浮条（半透明蓝色背景），左侧拖拽手柄 + Block 类型名称，右侧删除按钮（AlertDialog 确认）。

- [ ] **Step 2: 创建 AddBlockDialog**

模组类型选择弹窗，显示所有可用 Block 类型卡片。

```tsx
interface AddBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: BlockType) => void
}
```

每种 Block 类型显示：图标 + 名称 + 描述。点击选择后回调 onSelect。

Block 类型注册表：
```tsx
const BLOCK_TYPES = [
  { type: "intro", name: "介绍", desc: "标题 + 描述段落", icon: "FileText" },
  { type: "card_grid", name: "卡片网格", desc: "图标卡片 / 时间线 / 城市指南等", icon: "LayoutGrid" },
  { type: "step_list", name: "步骤列表", desc: "编号步骤纵向列表", icon: "ListOrdered" },
  { type: "doc_list", name: "文档清单", desc: "图标 + 文本列表", icon: "FileCheck" },
  { type: "gallery", name: "图片墙", desc: "水平滚动图片画廊", icon: "Images" },
  { type: "article_list", name: "文章列表", desc: "按分类的文章列表", icon: "Newspaper" },
  { type: "university_list", name: "院校列表", desc: "搜索筛选院校", icon: "GraduationCap" },
  { type: "case_grid", name: "案例网格", desc: "成功案例卡片", icon: "Trophy" },
  { type: "featured_data", name: "精选展示", desc: "精选院校或案例", icon: "Star" },
  { type: "cta", name: "行动号召", desc: "标题 + 描述 + 咨询按钮", icon: "Megaphone" },
]
```

- [ ] **Step 3: 创建 BlockEditDialog**

编辑 Block 的显示配置（标题、背景色、类型特有选项）。

```tsx
interface BlockEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  block: Block
  onSave: (updated: Block) => void
}
```

表单字段：showTitle 开关、sectionTag 文本、sectionTitle 多语言输入、bgColor 选择、type-specific options（如 cardType 下拉、maxColumns 选择等）。

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: BlockEditorOverlay + AddBlockDialog + BlockEditDialog"
```

---

### Task 9: PageBlocksPreview（预览中的 Block 管理）

**Files:**
- Create: `frontend/components/admin/web-settings/PageBlocksPreview.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

- [ ] **Step 1: 创建 PageBlocksPreview**

预览中的 Block 列表管理组件，集成拖拽排序 + 增删 + 编辑。

```tsx
interface PageBlocksPreviewProps {
  pageSlug: string
  onBannerEdit: (pageKey: string) => void
}
```

功能：
1. 从 ConfigContext 读取当前页面的 blocks
2. @hello-pangea/dnd 拖拽排序
3. Block 之间显示"+ 添加模组"插入按钮
4. 每个 Block 用 BlockEditorOverlay 包裹
5. Block 内容用 BlockRenderer 渲染（editable=true）
6. 保存变更时调用 API 更新 page_blocks
7. 内容编辑复用现有 ArrayEditDialog / ConfigEditDialog

- [ ] **Step 2: 统一 PagePreview**

`PagePreview.tsx` 简化为所有页面统一使用 PageBlocksPreview：

```tsx
export function PagePreview({ activePage, onEditConfig, onBannerEdit }: PagePreviewProps) {
  return <PageBlocksPreview pageSlug={activePage} onBannerEdit={onBannerEdit} />
}
```

删除 HomePreview、AboutPreview 等独立函数。

- [ ] **Step 3: web-settings/page.tsx 适配**

handleEditConfig 精简——大部分编辑逻辑移入 PageBlocksPreview 内部。保留全局配置的编辑（品牌名、热线等 Header/Footer 编辑）。

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: PageBlocksPreview 统一预览编辑 + PagePreview 简化"
```

---

## Phase 5: 清理 + 验证

### Task 10: 删除旧组件 + 最终验证

**Files:**
- Delete: 15+ 旧组件文件
- Modify: 全局引用清理

- [ ] **Step 1: 删除旧 Section 组件**

```bash
rm frontend/components/common/PageIntroSection.tsx
rm frontend/components/common/CardGridSection.tsx
rm frontend/components/common/StepListSection.tsx
rm frontend/components/common/DocListSection.tsx
rm frontend/components/common/CtaSection.tsx
rm frontend/components/common/CountryRequirementsSection.tsx
rm frontend/components/common/FeaturedProgramSection.tsx
rm frontend/components/about/OfficeGallery.tsx
rm frontend/components/home/FeaturedUniversities.tsx
rm frontend/components/home/FeaturedCases.tsx
rm frontend/components/home/UniversityGallery.tsx
```

- [ ] **Step 2: 删除旧预览组件**

```bash
rm frontend/components/admin/web-settings/ArticlePreviewPage.tsx
rm frontend/components/admin/web-settings/CasesPreviewPage.tsx
rm frontend/components/admin/web-settings/UniversitiesPreviewPage.tsx
```

- [ ] **Step 3: 查找残留引用**

```bash
grep -r "PageIntroSection\|CardGridSection\|StepListSection\|DocListSection\|CtaSection\|CountryRequirementsSection\|FeaturedProgramSection\|OfficeGallery\|FeaturedUniversities\|FeaturedCases\|UniversityGallery\|ArticlePreviewPage\|CasesPreviewPage\|UniversitiesPreviewPage" frontend/ --include="*.tsx" --include="*.ts" -l
```

修复所有残留引用。

- [ ] **Step 4: TypeScript 构建检查**

```bash
pnpm --prefix frontend tsc --noEmit
```

- [ ] **Step 5: 删库重建验证**

```bash
./scripts/dev.sh --clean
```

等待容器就绪后用 Playwright MCP 逐页验证。

- [ ] **Step 6: 容器日志检查**

```bash
docker compose logs frontend --tail 30 | grep -i "error\|MISSING"
```

- [ ] **Step 7: 运行 /simplify**

- [ ] **Step 8: 提交**

```bash
git commit -m "chore: 删除旧组件 + 全局清理 + 最终验证"
```
