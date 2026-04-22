# 全页面可编辑配置 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有公开页面的文字内容改为后端配置驱动，支持通过 web-settings 预览的 EditableOverlay 直接编辑，翻译值作 fallback。

**Architecture:** 扩展现有 `site_info` JSON 字段，新增 26 个简单字段 + 12 个数组字段。前端新增 ArrayEditDialog（数组编辑弹窗）和 6 个通用渲染组件（PageIntroSection/StepListSection/DocListSection/CardGridSection/CountryRequirementsSection/OfficeGallery）。各页面组件从 config 读数据，翻译值作 fallback，预览用 EditableOverlay 包裹。

**Tech Stack:** Next.js + React + TypeScript + Tailwind CSS + shadcn/ui + next-intl + @hello-pangea/dnd

**Spec:** `docs/superpowers/specs/2026-04-22-full-page-editable-config-design.md`

---

## 文件结构概览

### 新建文件

| 文件 | 职责 |
|------|------|
| `components/admin/ArrayEditDialog.tsx` | 通用数组编辑弹窗（可增减/排序/编辑多语言字段） |
| `components/common/PageIntroSection.tsx` | 通用页面介绍（标题+描述，config 驱动 + 翻译 fallback） |
| `components/common/StepListSection.tsx` | 通用步骤列表渲染（签证流程、申请流程） |
| `components/common/DocListSection.tsx` | 通用文档/材料列表渲染 |
| `components/common/CardGridSection.tsx` | 通用卡片网格渲染（留学项目、生活板块、办理周期、城市指南） |
| `components/common/CountryRequirementsSection.tsx` | 各国条件/语言要求渲染 |
| `components/about/OfficeGallery.tsx` | 办公环境图片墙 |

### 修改文件

| 文件 | 改造内容 |
|------|----------|
| `types/config.ts` | SiteInfo 新增 26 个简单字段 + 12 个数组字段的类型 |
| `contexts/ConfigContext.tsx` | DEFAULT_SITE_INFO 新增默认值，useLocalizedConfig 扩展 |
| `app/[locale]/[panel]/web-settings/page.tsx` | handleEditConfig 新增 case，新增数组编辑回调 |
| `components/common/CtaSection.tsx` | 改为 pageKey + config 驱动 + 翻译 fallback |
| `components/admin/web-settings/PagePreview.tsx` | HomePreview/AboutPreview 用新组件 |
| `components/admin/web-settings/UniversitiesPreviewPage.tsx` | 加 PageIntroSection + CTA 编辑 |
| `components/admin/web-settings/CasesPreviewPage.tsx` | 加 PageIntroSection + CTA 编辑 |
| `components/admin/web-settings/ArticlePreviewPage.tsx` | 重写，用通用渲染组件 |
| 8 个 public page.tsx | 用新组件替代内联/翻译驱动内容 |
| `backend/scripts/init/seed_config.py` | 种子数据新增所有新字段默认值 |

### 删除文件

| 文件 | 原因 |
|------|------|
| `components/home/ServicesSection.tsx` | 首页去掉服务卡片 |
| `components/home/AboutIntroSection.tsx` | 改用 PageIntroSection |
| `components/about/TeamSection.tsx` | 关于页去掉团队 |
| `components/about/AboutContent.tsx` 中的 PartnershipSection | 关于页去掉合作 |
| `components/home/SectionTitle.tsx` | 不再需要 |
| `components/study-abroad/StudyAbroadIntro.tsx` | 改为 config 驱动 |
| `components/visa/VisaIntro.tsx` | 同上 |
| `components/requirements/RequirementsIntro.tsx` | 同上 |
| `components/life/LifeIntro.tsx` | 同上 |

---

## Phase 1: 基础设施

### Task 1: 扩展类型定义 + ConfigContext 默认值

**Files:**
- Modify: `frontend/types/config.ts`
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 扩展 SiteInfo 类型**

在 `types/config.ts` 的 `SiteInfo` interface 中，删除 `services_title` 字段，新增以下字段：

```typescript
interface SiteInfo {
  // ... 保留现有字段（brand_name, tagline, hotline 等）...
  // 删除: services_title

  // --- 首页 ---
  home_intro_title: LocalizedField
  home_intro_content: LocalizedField
  home_cta_title: LocalizedField
  home_cta_desc: LocalizedField

  // --- 关于页 ---
  about_cta_title: LocalizedField
  about_cta_desc: LocalizedField
  about_office_images: { image_id: string; caption: LocalizedField }[]

  // --- 院校页 ---
  universities_intro_title: LocalizedField
  universities_intro_desc: LocalizedField
  universities_cta_title: LocalizedField
  universities_cta_desc: LocalizedField

  // --- 案例页 ---
  cases_intro_title: LocalizedField
  cases_intro_desc: LocalizedField
  cases_cta_title: LocalizedField
  cases_cta_desc: LocalizedField

  // --- 出国留学 ---
  study_abroad_intro_title: LocalizedField
  study_abroad_intro_desc: LocalizedField
  study_abroad_cta_title: LocalizedField
  study_abroad_cta_desc: LocalizedField
  study_abroad_programs: { name: LocalizedField; country: LocalizedField; desc: LocalizedField; features: LocalizedField[] }[]

  // --- 签证 ---
  visa_cta_title: LocalizedField
  visa_cta_desc: LocalizedField
  visa_process_steps: { title: LocalizedField; desc: LocalizedField }[]
  visa_required_docs: { text: LocalizedField }[]
  visa_timeline: { title: LocalizedField; time: LocalizedField; desc: LocalizedField }[]
  visa_tips: { text: LocalizedField }[]

  // --- 申请条件 ---
  requirements_cta_title: LocalizedField
  requirements_cta_desc: LocalizedField
  requirements_countries: { country: LocalizedField; items: LocalizedField[] }[]
  requirements_languages: { language: LocalizedField; items: LocalizedField[] }[]
  requirements_docs: { text: LocalizedField }[]
  requirements_steps: { title: LocalizedField; desc: LocalizedField }[]

  // --- 留学生活 ---
  life_intro_title: LocalizedField
  life_intro_desc: LocalizedField
  life_cta_title: LocalizedField
  life_cta_desc: LocalizedField
  life_guide_cards: { icon: string; title: LocalizedField; desc: LocalizedField }[]
  life_city_cards: { city: LocalizedField; country: LocalizedField; desc: LocalizedField; image_id: string }[]
}
```

- [ ] **Step 2: 更新 ConfigContext 默认值**

在 `ConfigContext.tsx` 的 `DEFAULT_SITE_INFO` 中，删除 `services_title`，为每个新字段添加空字符串或空数组默认值：

```typescript
const DEFAULT_SITE_INFO: SiteInfo = {
  // ... 保留现有 ...
  // 删除: services_title: '',

  home_intro_title: '', home_intro_content: '',
  home_cta_title: '', home_cta_desc: '',
  about_cta_title: '', about_cta_desc: '',
  about_office_images: [],
  universities_intro_title: '', universities_intro_desc: '',
  universities_cta_title: '', universities_cta_desc: '',
  cases_intro_title: '', cases_intro_desc: '',
  cases_cta_title: '', cases_cta_desc: '',
  study_abroad_intro_title: '', study_abroad_intro_desc: '',
  study_abroad_cta_title: '', study_abroad_cta_desc: '',
  study_abroad_programs: [],
  visa_cta_title: '', visa_cta_desc: '',
  visa_process_steps: [], visa_required_docs: [],
  visa_timeline: [], visa_tips: [],
  requirements_cta_title: '', requirements_cta_desc: '',
  requirements_countries: [], requirements_languages: [],
  requirements_docs: [], requirements_steps: [],
  life_intro_title: '', life_intro_desc: '',
  life_cta_title: '', life_cta_desc: '',
  life_guide_cards: [], life_city_cards: [],
}
```

同步更新 `useLocalizedConfig` 中的 `LocalizedConfigType` interface 和解析逻辑。对于数组字段，需要递归解析内部的 LocalizedField。

- [ ] **Step 3: 更新 useLocalizedConfig 解析逻辑**

数组字段中的 LocalizedField 需要递归解析。添加一个 helper 函数：

```typescript
function resolveArrayItems<T>(items: T[], locale: string): T[] {
  return items.map(item => {
    const resolved: any = { ...item }
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'zh' in value) {
        resolved[key] = getLocalizedValue(value, locale)
      }
      if (Array.isArray(value)) {
        resolved[key] = value.map((v: any) =>
          typeof v === 'object' && v !== null && !Array.isArray(v) && 'zh' in v
            ? getLocalizedValue(v, locale)
            : v
        )
      }
    }
    return resolved
  })
}
```

在 `useLocalizedConfig` 中为每个数组字段调用 `resolveArrayItems`。

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
pnpm --prefix frontend tsc --noEmit
```

- [ ] **Step 5: 提交**

```bash
git commit -m "feat: 扩展 SiteInfo 类型 + ConfigContext 支持全页面可编辑字段"
```

---

### Task 2: ArrayEditDialog 通用数组编辑弹窗

**Files:**
- Create: `frontend/components/admin/ArrayEditDialog.tsx`

- [ ] **Step 1: 创建 ArrayEditDialog**

通用数组编辑弹窗。支持增/删/排序/编辑，使用 `@hello-pangea/dnd` 拖拽排序。

Props 接口：
```typescript
interface ArrayFieldDef {
  key: string
  label: string
  type: "text" | "textarea"
  localized: boolean
  rows?: number
}

interface ArrayEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: ArrayFieldDef[]
  data: any[]
  onSave: (data: any[]) => Promise<void>
}
```

组件结构：
- shadcn Dialog
- 内容区：拖拽列表（@hello-pangea/dnd 的 DragDropContext + Droppable + Draggable）
- 每条展开/折叠编辑（点击展开显示字段）
- 每个字段用 LocalizedInput（localized=true）或 Input/Textarea（localized=false）
- 底部"添加条目"按钮
- 每条有删除按钮（AlertDialog 确认）
- 拖拽手柄用 GripVertical 图标

参考现有代码：
- `NavEditor.tsx` 已使用 `@hello-pangea/dnd`，可参考拖拽实现
- `ConfigEditDialog.tsx` 的 LocalizedInput 使用方式

- [ ] **Step 2: 验证 TypeScript 编译**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat: ArrayEditDialog 通用数组编辑弹窗组件"
```

---

### Task 3: 后端种子数据 + 验证器检查

**Files:**
- Modify: `backend/scripts/init/seed_config.py`
- Check: `backend/api/api/admin/web_settings/schemas.py`（SiteInfoValue 验证器）

- [ ] **Step 1: 检查后端验证器**

查看 `SiteInfoValue` Pydantic model 是否使用 `model_config = ConfigDict(extra="allow")` 或 `extra="forbid"`。如果是 `forbid`，需要改为 `allow`（否则新字段会被拒绝）。

```bash
grep -n "extra\|class SiteInfoValue" backend/api/api/admin/web_settings/schemas.py
```

如果需要修改，改为 `extra="allow"`。

- [ ] **Step 2: 更新种子数据**

在 `seed_config.py` 的 `site_info` 初始值中，从翻译文件迁移内容作为默认值。

简单字段示例：
```python
"home_intro_title": {"zh": "关于我们", "en": "About Us"},
"home_intro_content": {"zh": "慕大国际从事小语种留学项目运营已15年...", "en": "MUTU International..."},
"home_cta_title": {"zh": "开启你的留学之旅", "en": "Start Your Study Abroad Journey"},
"home_cta_desc": {"zh": "15年专注国际教育...", "en": "15 years of dedication..."},
```

数组字段示例（visa_process_steps）：
```python
"visa_process_steps": [
    {"title": {"zh": "材料准备", "en": "Document Preparation"}, "desc": {"zh": "准备所需的签证申请材料", "en": "Prepare required visa documents"}},
    {"title": {"zh": "预约递签", "en": "Schedule Appointment"}, "desc": {"zh": "在线预约签证中心递签时间", "en": "Book appointment online"}},
    # ... 从翻译文件迁移所有步骤
],
```

所有数组字段从对应的翻译文件内容迁移。

- [ ] **Step 3: 提交**

```bash
git commit -m "feat: 种子数据新增全页面可编辑配置默认值"
```

---

## Phase 2: 通用渲染组件 + CTA 改造

### Task 4: PageIntroSection + CtaSection 改造

**Files:**
- Create: `frontend/components/common/PageIntroSection.tsx`
- Modify: `frontend/components/common/CtaSection.tsx`

- [ ] **Step 1: 创建 PageIntroSection**

通用页面介绍组件（标题+描述），从 config 读取，翻译 fallback。

```tsx
"use client"

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface PageIntroSectionProps {
  titleKey: string
  contentKey: string
  titleFallback: string
  contentFallback: string
  sectionTag?: string
  editable?: boolean
  onEditTitle?: () => void
  onEditContent?: () => void
}

export function PageIntroSection({
  titleKey, contentKey, titleFallback, contentFallback,
  sectionTag, editable, onEditTitle, onEditContent,
}: PageIntroSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const title = (siteInfo as any)[titleKey] || titleFallback
  const content = (siteInfo as any)[contentKey] || contentFallback

  const titleEl = <h3 className="mt-2 text-2xl md:text-3xl font-bold">{title}</h3>

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        {sectionTag && (
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {sectionTag}
          </h2>
        )}
        {editable && onEditTitle ? (
          <EditableOverlay onClick={onEditTitle} label="编辑标题" inline>
            {titleEl}
          </EditableOverlay>
        ) : titleEl}
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      {editable && onEditContent ? (
        <EditableOverlay onClick={onEditContent} label="编辑介绍内容">
          <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">{content}</p>
        </EditableOverlay>
      ) : (
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">{content}</p>
      )}
    </section>
  )
}
```

- [ ] **Step 2: 改造 CtaSection**

将 `CtaSection` 从 `translationNamespace` 驱动改为 `pageKey` + config 驱动。

```tsx
"use client"

import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { ConsultButton } from "@/components/common/ConsultButton"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

const PAGE_KEY_TO_NS: Record<string, string> = {
  home: "Home", about: "About", universities: "Universities",
  cases: "Cases", "study-abroad": "StudyAbroad", visa: "Visa",
  requirements: "Requirements", life: "Life",
}

interface CtaSectionProps {
  pageKey: string
  variant?: "border-t" | "bg-gray-50"
  editable?: boolean
  onEdit?: () => void
}

export function CtaSection({ pageKey, variant = "bg-gray-50", editable, onEdit }: CtaSectionProps) {
  const ns = PAGE_KEY_TO_NS[pageKey] ?? "Home"
  const t = useTranslations(ns)
  const { siteInfo } = useLocalizedConfig()

  const title = (siteInfo as any)[`${pageKey.replace("-", "_")}_cta_title`] || t("ctaTitle")
  const desc = (siteInfo as any)[`${pageKey.replace("-", "_")}_cta_desc`] || t("ctaDesc")

  const content = (
    <section className={`py-10 md:py-16 ${variant === "border-t" ? "border-t bg-white" : "bg-gray-50"}`}>
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h3 className="text-2xl md:text-3xl font-bold">{title}</h3>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{desc}</p>
        <ConsultButton className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">
          {t("ctaButton")} <ArrowRight className="h-4 w-4" />
        </ConsultButton>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return <EditableOverlay onClick={onEdit} label="编辑 CTA">{content}</EditableOverlay>
  }
  return content
}
```

- [ ] **Step 3: 更新所有 CtaSection 调用**

全局替换 `translationNamespace="..."` 为 `pageKey="..."`：
- `page.tsx`（首页）：`<CtaSection pageKey="home" variant="border-t" />`
- `about/page.tsx`：`<CtaSection pageKey="about" />`
- `cases/page.tsx`：`<CtaSection pageKey="cases" />`
- 其他页面类推

搜索所有 `translationNamespace` 引用并替换。

- [ ] **Step 4: 验证 + 提交**

```bash
pnpm --prefix frontend tsc --noEmit
git commit -m "feat: PageIntroSection + CtaSection config 驱动改造"
```

---

### Task 5: StepListSection + DocListSection

**Files:**
- Create: `frontend/components/common/StepListSection.tsx`
- Create: `frontend/components/common/DocListSection.tsx`

- [ ] **Step 1: 创建 StepListSection**

渲染编号步骤列表（签证流程、申请流程复用）。从 config 数组读取，翻译数据作 fallback。

```tsx
interface StepListSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackSteps: { title: string; desc: string }[]
  editable?: boolean
  onEdit?: () => void
}
```

渲染：每步一行，左侧编号圆圈（bg-primary text-white），右侧标题+描述。editable 时整个 section 用 EditableOverlay 包裹。

- [ ] **Step 2: 创建 DocListSection**

渲染文档/材料列表（签证材料、申请材料复用）。从 config 数组读取。

```tsx
interface DocListSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackDocs: string[]
  icon?: LucideIcon
  bgColor?: string
  editable?: boolean
  onEdit?: () => void
}
```

渲染：grid 布局（sm:grid-cols-2），每项左侧图标+文本。editable 时整个 section 用 EditableOverlay 包裹。

- [ ] **Step 3: 验证 + 提交**

```bash
git commit -m "feat: StepListSection + DocListSection 通用渲染组件"
```

---

### Task 6: CardGridSection + CountryRequirementsSection + OfficeGallery

**Files:**
- Create: `frontend/components/common/CardGridSection.tsx`
- Create: `frontend/components/common/CountryRequirementsSection.tsx`
- Create: `frontend/components/about/OfficeGallery.tsx`

- [ ] **Step 1: 创建 CardGridSection**

通用卡片网格渲染。支持自定义卡片渲染函数。

```tsx
interface CardGridSectionProps<T> {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackCards: T[]
  columns?: string          // 默认 "md:grid-cols-3"
  bgColor?: string          // 默认无背景
  renderCard: (card: T, index: number) => ReactNode
  editable?: boolean
  onEdit?: () => void
}
```

editable 时整个 section 用 EditableOverlay 包裹。

- [ ] **Step 2: 创建 CountryRequirementsSection**

渲染带子列表的条件卡片。从 config 数组读取。

```tsx
interface CountryRequirementsSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackData: { label: string; items: string[] }[]
  icon?: LucideIcon
  editable?: boolean
  onEdit?: () => void
}
```

渲染：grid 布局卡片，每张卡片标题 + CheckSquare 图标的条目列表。editable 时整个 section 用 EditableOverlay 包裹。

- [ ] **Step 3: 创建 OfficeGallery**

关于页办公环境图片墙。从 config 的 `about_office_images` 数组读取。

```tsx
interface OfficeGalleryProps {
  editable?: boolean
  onEdit?: () => void
}
```

渲染：section 标题"办公环境" + grid 图片网格（每张带 caption）。editable 时用 EditableOverlay 包裹。

图片展示使用 `/api/public/images/detail?id=` URL 前缀。

- [ ] **Step 4: 验证 + 提交**

```bash
git commit -m "feat: CardGridSection + CountryRequirementsSection + OfficeGallery"
```

---

## Phase 3: 页面改造

### Task 7: 首页改造 + HomePreview

**Files:**
- Modify: `frontend/app/[locale]/(public)/page.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`（HomePreview）
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`（handleEditConfig 新增 case）
- Delete: `frontend/components/home/ServicesSection.tsx`
- Delete: `frontend/components/home/AboutIntroSection.tsx`
- Delete: `frontend/components/home/SectionTitle.tsx`

- [ ] **Step 1: 更新首页**

首页结构变为：
1. `<HomeBanner />`
2. `<StatsSection />`
3. `<PageIntroSection titleKey="home_intro_title" contentKey="home_intro_content" titleFallback={t("aboutUsTitle")} contentFallback={t("aboutUsContent")} sectionTag="About Us" />`
4. `<FeaturedUniversities />`
5. `<FeaturedCases />`
6. `<NewsSection />`
7. `<CtaSection pageKey="home" variant="border-t" />`

删除 ServicesSection 和 AboutIntroSection 的导入和使用。

- [ ] **Step 2: 添加 handleEditConfig case**

在 `web-settings/page.tsx` 的 handleEditConfig 中新增：

```typescript
case 'home_intro_title':
  return setDialogState({
    open: true, title: '编辑公司简介标题',
    fields: [{ key: 'home_intro_title', label: '简介标题', type: 'text', localized: true }],
    configKey: 'site_info', dataPath: 'siteInfo',
  })
case 'home_intro_content':
  return setDialogState({
    open: true, title: '编辑公司简介内容',
    fields: [{ key: 'home_intro_content', label: '简介内容', type: 'textarea', localized: true, rows: 5 }],
    configKey: 'site_info', dataPath: 'siteInfo',
  })
case 'home_cta':
  return setDialogState({
    open: true, title: '编辑首页 CTA',
    fields: [
      { key: 'home_cta_title', label: 'CTA 标题', type: 'text', localized: true },
      { key: 'home_cta_desc', label: 'CTA 描述', type: 'text', localized: true },
    ],
    configKey: 'site_info', dataPath: 'siteInfo',
  })
```

同样模式为其他页面的 CTA 和 intro 添加 case（about_cta、universities_intro、universities_cta 等）。

- [ ] **Step 3: 更新 HomePreview**

```tsx
function HomePreview({ onEditConfig, onBannerEdit }) {
  const t = useTranslations("Home")
  return (
    <>
      <HomeBanner editable onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>
      <PageIntroSection
        titleKey="home_intro_title" contentKey="home_intro_content"
        titleFallback={t("aboutUsTitle")} contentFallback={t("aboutUsContent")}
        sectionTag="About Us" editable
        onEditTitle={() => onEditConfig("home_intro_title")}
        onEditContent={() => onEditConfig("home_intro_content")}
      />
      <FeaturedUniversities />
      <FeaturedCases />
      <NewsSection />
      <CtaSection pageKey="home" variant="border-t" editable onEdit={() => onEditConfig("home_cta")} />
    </>
  )
}
```

- [ ] **Step 4: 删除旧文件**

```bash
rm frontend/components/home/ServicesSection.tsx
rm frontend/components/home/AboutIntroSection.tsx
rm frontend/components/home/SectionTitle.tsx
```

- [ ] **Step 5: 验证 + 提交**

```bash
git commit -m "refactor: 首页改为 config 驱动 + 去掉服务卡片"
```

---

### Task 8: 关于页改造 + AboutPreview

**Files:**
- Modify: `frontend/app/[locale]/(public)/about/page.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`（AboutPreview）
- Delete: `frontend/components/about/TeamSection.tsx`
- Modify: `frontend/components/about/AboutContent.tsx`（删除 PartnershipSection、AboutStatsSection）

- [ ] **Step 1: 更新关于页**

结构变为：
1. `<PageBanner />`
2. `<ContactInfoSection />`
3. `<HistorySection />`（"Our Story" 标题保留）
4. `<MissionVisionSection />`
5. `<OfficeGallery />`
6. `<CtaSection pageKey="about" />`

删除：TeamSection、PartnershipSection（withWrapper）、AboutStatsSection。

- [ ] **Step 2: 更新 AboutPreview**

```tsx
function AboutPreview({ onEditConfig, onBannerEdit }) {
  // ... 保留 Banner、ContactInfoSection、HistorySection、MissionVisionSection（都已有 editable）
  // 替换 PartnershipSection/AboutStatsSection/TeamSection 为：
  <OfficeGallery editable onEdit={() => onEditConfig("about_office_images")} />
  <CtaSection pageKey="about" editable onEdit={() => onEditConfig("about_cta")} />
}
```

- [ ] **Step 3: 在 handleEditConfig 中添加 about_office_images 的数组编辑 case**

数组编辑不走 ConfigEditDialog，走 ArrayEditDialog。需要在 web-settings/page.tsx 中新增状态管理。

添加：
```typescript
const [arrayDialogState, setArrayDialogState] = useState<{
  open: boolean; title: string; configKey: string;
  siteInfoKey: string; fields: ArrayFieldDef[]; data: any[]
} | null>(null)
```

`about_office_images` case 打开 ArrayEditDialog。

- [ ] **Step 4: 删除旧组件 + 清理**

```bash
rm frontend/components/about/TeamSection.tsx
```

从 `AboutContent.tsx` 删除 `PartnershipSection` 和 `AboutStatsSection` 导出。

- [ ] **Step 5: 验证 + 提交**

```bash
git commit -m "refactor: 关于页改为联系+简介+使命愿景+办公环境+CTA"
```

---

### Task 9: 院校页 + 案例页改造

**Files:**
- Modify: `frontend/app/[locale]/(public)/universities/page.tsx`
- Modify: `frontend/app/[locale]/(public)/cases/page.tsx`
- Modify: `frontend/components/admin/web-settings/UniversitiesPreviewPage.tsx`
- Modify: `frontend/components/admin/web-settings/CasesPreviewPage.tsx`

- [ ] **Step 1: 院校页添加 PageIntroSection + CTA**

在 Banner 和 UniversityList 之间插入：
```tsx
<PageIntroSection
  titleKey="universities_intro_title" contentKey="universities_intro_desc"
  titleFallback={t("title")} contentFallback={t("intro")}
  sectionTag="Partner Universities"
/>
```

底部 CTA 改为：`<CtaSection pageKey="universities" />`

删除"选校建议"板块。

- [ ] **Step 2: 案例页添加 PageIntroSection + CTA**

删除统计条。添加 PageIntroSection 和 CtaSection。

- [ ] **Step 3: 更新 UniversitiesPreviewPage**

添加 PageIntroSection（editable）和 CtaSection（editable）。

- [ ] **Step 4: 更新 CasesPreviewPage**

添加 PageIntroSection（editable）和 CtaSection（editable）。

- [ ] **Step 5: handleEditConfig 新增 case**

为 universities_intro_title、universities_intro_desc、universities_cta、cases_intro_title、cases_intro_desc、cases_cta 添加 case。

- [ ] **Step 6: 验证 + 提交**

```bash
git commit -m "refactor: 院校页+案例页添加 config 驱动介绍和 CTA"
```

---

### Task 10: 出国留学页改造

**Files:**
- Modify: `frontend/app/[locale]/(public)/study-abroad/page.tsx`
- Modify: `frontend/components/admin/web-settings/ArticlePreviewPage.tsx`
- Delete: `frontend/components/study-abroad/StudyAbroadIntro.tsx`

- [ ] **Step 1: 改造出国留学页**

结构变为：
1. `<PageBanner />`
2. `<PageIntroSection titleKey="study_abroad_intro_title" ... />`
3. `<CardGridSection configKey="study_abroad_programs" ...>` —— 留学项目卡片
4. `<ArticleSection />`
5. `<CtaSection pageKey="study-abroad" />`

每个项目卡片渲染：国家标签 + 项目名称 + 描述 + features（CheckCircle2 列表）。

- [ ] **Step 2: 删除旧文件**

```bash
rm frontend/components/study-abroad/StudyAbroadIntro.tsx
```

- [ ] **Step 3: 更新 ArticlePreviewPage 的 IntroSection**

将 `study-abroad` case 的 IntroSection 替换为 PageIntroSection + CardGridSection（editable）。

- [ ] **Step 4: handleEditConfig 新增 case**

添加 study_abroad_intro_title、study_abroad_intro_desc、study_abroad_cta、study_abroad_programs（数组）。

- [ ] **Step 5: 验证 + 提交**

```bash
git commit -m "refactor: 出国留学页 config 驱动 + 项目卡片可编辑"
```

---

### Task 11: 签证页改造

**Files:**
- Modify: `frontend/app/[locale]/(public)/visa/page.tsx`
- Modify: `frontend/components/admin/web-settings/ArticlePreviewPage.tsx`
- Delete: `frontend/components/visa/VisaIntro.tsx`

- [ ] **Step 1: 改造签证页**

结构变为：
1. `<PageBanner />`
2. `<StepListSection configKey="visa_process_steps" sectionTag="Process" sectionTitle={t("processTitle")} fallbackSteps={...} />`
3. `<DocListSection configKey="visa_required_docs" sectionTag="Documents" sectionTitle={t("docsTitle")} fallbackDocs={...} icon={FileText} bgColor="bg-gray-50" />`
4. `<CardGridSection configKey="visa_timeline" sectionTag="Timeline" sectionTitle={t("timelineTitle")} ...>`
5. `<DocListSection configKey="visa_tips" sectionTag="Tips" sectionTitle={t("tipsTitle")} fallbackDocs={...} icon={AlertTriangle} bgColor="bg-gray-50" />`
6. `<ArticleSection />`
7. `<CtaSection pageKey="visa" variant="border-t" />`

fallback 数据从翻译文件读取。

- [ ] **Step 2: 删除旧文件 + 更新预览**

- [ ] **Step 3: handleEditConfig 新增数组编辑 case**

visa_process_steps、visa_required_docs、visa_timeline、visa_tips 都走 ArrayEditDialog。

- [ ] **Step 4: 验证 + 提交**

```bash
git commit -m "refactor: 签证页 config 驱动 + 流程/材料/周期/注意事项可编辑"
```

---

### Task 12: 申请条件页改造

**Files:**
- Modify: `frontend/app/[locale]/(public)/requirements/page.tsx`
- Modify: `frontend/components/admin/web-settings/ArticlePreviewPage.tsx`
- Delete: `frontend/components/requirements/RequirementsIntro.tsx`

- [ ] **Step 1: 改造申请条件页**

结构变为：
1. `<PageBanner />`
2. `<CountryRequirementsSection configKey="requirements_countries" sectionTag="Requirements" sectionTitle={t("countriesTitle")} ... />`
3. `<CountryRequirementsSection configKey="requirements_languages" sectionTag="Language" sectionTitle={t("languageTitle")} ... />`
4. `<DocListSection configKey="requirements_docs" ... />`
5. `<StepListSection configKey="requirements_steps" ... />`
6. `<ArticleSection />`
7. `<CtaSection pageKey="requirements" variant="border-t" />`

- [ ] **Step 2: 删除旧文件 + 更新预览**

- [ ] **Step 3: handleEditConfig 新增数组编辑 case**

- [ ] **Step 4: 验证 + 提交**

```bash
git commit -m "refactor: 申请条件页 config 驱动 + 各国条件/语言/材料/流程可编辑"
```

---

### Task 13: 留学生活页改造

**Files:**
- Modify: `frontend/app/[locale]/(public)/life/page.tsx`
- Modify: `frontend/components/admin/web-settings/ArticlePreviewPage.tsx`
- Delete: `frontend/components/life/LifeIntro.tsx`

- [ ] **Step 1: 改造留学生活页**

结构变为：
1. `<PageBanner />`
2. `<PageIntroSection titleKey="life_intro_title" contentKey="life_intro_desc" ... />`
3. `<CardGridSection configKey="life_guide_cards" ...>` —— 生活板块（icon + 标题 + 描述）
4. `<CardGridSection configKey="life_city_cards" ...>` —— 城市指南（城市名 + 国家 + 描述 + 图片）
5. `<ArticleSection />`
6. `<CtaSection pageKey="life" />`

- [ ] **Step 2: 删除旧文件 + 更新预览**

- [ ] **Step 3: handleEditConfig 新增 case**

- [ ] **Step 4: 验证 + 提交**

```bash
git commit -m "refactor: 留学生活页 config 驱动 + 板块卡片/城市指南可编辑"
```

---

## Phase 4: 清理 + 验证

### Task 14: ArticlePreviewPage 统一改造

**Files:**
- Modify: `frontend/components/admin/web-settings/ArticlePreviewPage.tsx`

- [ ] **Step 1: 重写 IntroSection 映射**

将现有的按 slug 硬编码 import IntroComponent 改为：根据 slug 渲染对应的通用组件组合。

```tsx
function IntroSection({ slug, editable, onEditConfig, onEditArray }) {
  switch (slug) {
    case "study-abroad":
      return (
        <>
          <PageIntroSection ... editable onEditTitle={...} onEditContent={...} />
          <CardGridSection configKey="study_abroad_programs" ... editable onEdit={...} />
        </>
      )
    case "visa":
      return (
        <>
          <StepListSection configKey="visa_process_steps" ... editable onEdit={...} />
          <DocListSection configKey="visa_required_docs" ... editable onEdit={...} />
          <CardGridSection configKey="visa_timeline" ... editable onEdit={...} />
          <DocListSection configKey="visa_tips" ... editable onEdit={...} />
        </>
      )
    case "requirements":
      return (
        <>
          <CountryRequirementsSection configKey="requirements_countries" ... editable onEdit={...} />
          <CountryRequirementsSection configKey="requirements_languages" ... editable onEdit={...} />
          <DocListSection configKey="requirements_docs" ... editable onEdit={...} />
          <StepListSection configKey="requirements_steps" ... editable onEdit={...} />
        </>
      )
    case "life":
      return (
        <>
          <PageIntroSection ... editable onEditTitle={...} onEditContent={...} />
          <CardGridSection configKey="life_guide_cards" ... editable onEdit={...} />
          <CardGridSection configKey="life_city_cards" ... editable onEdit={...} />
        </>
      )
    default:
      return null
  }
}
```

- [ ] **Step 2: 删除旧 Intro 组件 import**

删除 StudyAbroadIntro、VisaIntro、RequirementsIntro、LifeIntro 的 import。

- [ ] **Step 3: 添加 ArrayEditDialog 状态管理**

ArticlePreviewPage 需要管理 ArrayEditDialog 状态（每个数组字段的编辑弹窗）。

- [ ] **Step 4: 验证 + 提交**

```bash
git commit -m "refactor: ArticlePreviewPage 统一使用通用渲染组件"
```

---

### Task 15: 全局清理 + 最终验证

**Files:**
- Scan: 全局

- [ ] **Step 1: 删除不再引用的组件文件**

确认以下文件已删除（前面 Task 中应已删除）：
```bash
# 检查是否还存在
ls frontend/components/home/ServicesSection.tsx \
   frontend/components/home/AboutIntroSection.tsx \
   frontend/components/home/SectionTitle.tsx \
   frontend/components/about/TeamSection.tsx \
   frontend/components/study-abroad/StudyAbroadIntro.tsx \
   frontend/components/visa/VisaIntro.tsx \
   frontend/components/requirements/RequirementsIntro.tsx \
   frontend/components/life/LifeIntro.tsx 2>/dev/null
```

- [ ] **Step 2: 清理 AboutContent.tsx**

从 `AboutContent.tsx` 中删除 `PartnershipSection` 和 `AboutStatsSection` 的导出和代码。只保留 `HistorySection` 和 `MissionVisionSection`。

- [ ] **Step 3: 查找残留引用**

```bash
grep -r "ServicesSection\|AboutIntroSection\|SectionTitle\|TeamSection\|PartnershipSection\|AboutStatsSection\|StudyAbroadIntro\|VisaIntro\|RequirementsIntro\|LifeIntro\|translationNamespace\|services_title" frontend/ --include="*.tsx" --include="*.ts" -l
```

修复所有残留引用。

- [ ] **Step 4: TypeScript 构建检查**

```bash
pnpm --prefix frontend tsc --noEmit
```

- [ ] **Step 5: 用 Playwright MCP 验证**

逐页验证 web-settings 预览和实际公开页面。

- [ ] **Step 6: 运行 /simplify 代码审查**

- [ ] **Step 7: 提交**

```bash
git commit -m "chore: 清理已删组件引用 + 全局验证"
```
