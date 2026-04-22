# Web-Settings 预览同步 + 搜索统一 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 web-settings 页面预览与实际公开页面视觉一致，共享组件避免维护两份代码；统一首页和院校页搜索体验。

**Architecture:** 提取实际页面的内联板块为共享 Client Component，通过 `editable` prop 控制是否显示 EditableOverlay。院校/案例/文章预览从 CRUD 管理界面改为视觉预览 + 管理工具栏浮动条。搜索栏统一为胶囊样式，院校页改为左侧栏筛选布局。

**Tech Stack:** Next.js + React + TypeScript + Tailwind CSS + shadcn/ui + next-intl + lucide-react

**Spec:** `docs/superpowers/specs/2026-04-22-web-settings-preview-sync-design.md`

---

## 文件结构概览

### 新建文件

| 文件 | 职责 |
|------|------|
| `components/common/CtaSection.tsx` | 通用 CTA 板块（接收 translationNamespace） |
| `components/common/SearchBar.tsx` | 胶囊搜索栏（首页 + 院校页共用） |
| `components/home/ServicesSection.tsx` | 首页精选服务板块 |
| `components/home/AboutIntroSection.tsx` | 首页"关于我们"简介 |
| `components/home/NewsSection.tsx` | 首页最新资讯（从 API 拉真实文章） |
| `components/about/TeamSection.tsx` | 关于页团队介绍 |
| `components/public/CaseGrid.tsx` | 案例卡片网格（支持 editable） |
| `components/public/ArticleListClient.tsx` | 文章列表 Client 版（支持 editable）。命名为 ArticleListClient 避免与 `components/content/ArticleList.tsx` 冲突 |
| `components/study-abroad/StudyAbroadIntro.tsx` | 出国留学介绍板块 |
| `components/visa/VisaIntro.tsx` | 签证办理介绍板块 |
| `components/requirements/RequirementsIntro.tsx` | 申请条件介绍板块 |
| `components/life/LifeIntro.tsx` | 留学生活介绍板块 |
| `components/admin/web-settings/ManageToolbar.tsx` | 管理工具浮动条 |
| `components/admin/web-settings/DisciplineManageDialog.tsx` | 学科分类管理弹窗 |

### 修改文件

| 文件 | 改造内容 |
|------|----------|
| `components/about/AboutContent.tsx` | PartnershipSection 增加 `withWrapper` prop |
| `components/public/UniversitySearch.tsx` | 改为垂直侧栏布局 + editable 模式 |
| `components/public/UniversityList.tsx` | 改为左侧栏 + 右侧卡片的双栏布局 + editable 模式 |
| `components/home/HomeBanner.tsx` | 用 SearchBar 替代 HeroSearch |
| `components/admin/web-settings/PagePreview.tsx` | 重写路由和所有预览页面 |
| `app/[locale]/(public)/page.tsx` | 用共享组件替代内联代码 |
| `app/[locale]/(public)/about/page.tsx` | 用共享组件替代内联代码 |
| `app/[locale]/(public)/universities/page.tsx` | 适配新搜索布局 |
| `app/[locale]/(public)/cases/page.tsx` | 用 CaseGrid 替代内联代码 |
| `app/[locale]/(public)/news/page.tsx` | 用 ArticleListClient 替代内联代码 |
| `app/[locale]/(public)/study-abroad/page.tsx` | 用 StudyAbroadIntro 替代内联代码 |
| `app/[locale]/(public)/visa/page.tsx` | 用 VisaIntro 替代内联代码 |
| `app/[locale]/(public)/requirements/page.tsx` | 用 RequirementsIntro 替代内联代码 |
| `app/[locale]/(public)/life/page.tsx` | 用 LifeIntro 替代内联代码 |

### 删除文件

| 文件 | 原因 |
|------|------|
| `components/home/HeroSearch.tsx` | 被 SearchBar 替代 |
| `components/admin/web-settings/NewsPreview.tsx` | 被 NewsSection 替代 |
| `components/admin/web-settings/CasesPreview.tsx` | 被 CaseGrid editable 替代 |
| `components/admin/web-settings/CasesEditPreview.tsx` | 被视觉预览替代 |
| `components/admin/web-settings/UniversitiesEditPreview.tsx` | 被视觉预览替代 |
| `components/admin/web-settings/ArticleListPreview.tsx` | 被视觉预览替代 |

---

## Phase 1: 通用基础组件

### Task 1: CtaSection 通用 CTA 板块

**Files:**
- Create: `frontend/components/common/CtaSection.tsx`
- Modify: `frontend/app/[locale]/(public)/page.tsx`

- [ ] **Step 1: 创建 CtaSection 组件**

从首页 CTA 板块提取。接收 `translationNamespace` prop，自动读取该命名空间下的 `ctaTitle`、`ctaDesc`（或 `ctaDescription`）、`ctaButton`。

```tsx
"use client"

import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { ConsultButton } from "@/components/common/ConsultButton"

interface CtaSectionProps {
  translationNamespace: string
  variant?: "border-t" | "bg-gray-50"
}

export function CtaSection({ translationNamespace, variant = "bg-gray-50" }: CtaSectionProps) {
  const t = useTranslations(translationNamespace)

  const desc = (() => {
    try { return t("ctaDesc") } catch { return t("ctaDescription") }
  })()

  return (
    <section className={`py-10 md:py-16 ${variant === "border-t" ? "border-t bg-white" : "bg-gray-50"}`}>
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h3 className="text-2xl md:text-3xl font-bold">{t("ctaTitle")}</h3>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{desc}</p>
        <ConsultButton
          className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {t("ctaButton")} <ArrowRight className="h-4 w-4" />
        </ConsultButton>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 替换首页 CTA**

在 `app/[locale]/(public)/page.tsx` 中，将 CTA section（约第146-158行）替换为：

```tsx
import { CtaSection } from "@/components/common/CtaSection"
// ...
<CtaSection translationNamespace="Home" variant="border-t" />
```

删除首页不再需要的 `ConsultButton` 导入（如果只有 CTA 用到）。

- [ ] **Step 3: 验证首页 CTA 渲染**

用 Playwright MCP 导航到 `http://localhost/` 截图，确认 CTA 板块视觉无变化。

- [ ] **Step 4: 逐步替换其他页面 CTA**

替换以下页面的内联 CTA：
- `about/page.tsx`：`<CtaSection translationNamespace="About" />`
- `universities/page.tsx`：删除 CTA section（院校页的 CTA 包含特定文案，需确认翻译 key 格式一致）
- `cases/page.tsx`：`<CtaSection translationNamespace="Cases" />`
- `study-abroad/page.tsx`：`<CtaSection translationNamespace="StudyAbroad" />`
- `visa/page.tsx`：`<CtaSection translationNamespace="Visa" variant="border-t" />`
- `requirements/page.tsx`：`<CtaSection translationNamespace="Requirements" variant="border-t" />`
- `life/page.tsx`：`<CtaSection translationNamespace="Life" />`

每个页面删除对应的内联 CTA section 和不再需要的 `ConsultButton`/`ArrowRight` 导入。

- [ ] **Step 5: 验证所有页面 CTA**

用 Playwright MCP 逐页截图验证（`/about`、`/universities`、`/cases` 等），确认所有 CTA 视觉无变化。

- [ ] **Step 6: 提交**

```bash
git add frontend/components/common/CtaSection.tsx frontend/app/
git commit -m "refactor: 提取 CtaSection 通用 CTA 组件，替换所有页面内联 CTA"
```

---

### Task 2: SearchBar 统一搜索栏

**Files:**
- Create: `frontend/components/common/SearchBar.tsx`
- Modify: `frontend/components/home/HomeBanner.tsx`
- Delete: `frontend/components/home/HeroSearch.tsx`

- [ ] **Step 1: 创建 SearchBar 组件**

胶囊圆角样式搜索框，输入关键词 + 搜索按钮，跳转 `/universities?search=xxx`。

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

export function SearchBar() {
  const t = useTranslations("Universities")
  const router = useRouter()
  const [search, setSearch] = useState("")

  function handleSearch() {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    router.push(`/universities${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="mt-6 md:mt-8 w-full max-w-xl mx-auto px-4">
      <div className="flex bg-white/90 rounded-full overflow-hidden shadow-lg">
        <div className="flex items-center pl-5">
          <Search className="size-5 text-muted-foreground" />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSearch}
          className="m-1 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {t("searchButton")}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 更新 HomeBanner 使用 SearchBar**

在 `components/home/HomeBanner.tsx` 中：
- 将 `import { HeroSearch } from "./HeroSearch"` 改为 `import { SearchBar } from "@/components/common/SearchBar"`
- 将 `{!editable && <HeroSearch />}` 改为 `{!editable && <SearchBar />}`

- [ ] **Step 3: 删除 HeroSearch**

```bash
rm frontend/components/home/HeroSearch.tsx
```

- [ ] **Step 4: 验证首页搜索**

用 Playwright MCP 导航到 `http://localhost/`，确认搜索框显示为胶囊圆角样式。输入关键词点击搜索，确认跳转到 `/universities?search=xxx`。

- [ ] **Step 5: 提交**

```bash
git add frontend/components/common/SearchBar.tsx frontend/components/home/HomeBanner.tsx
git rm frontend/components/home/HeroSearch.tsx
git commit -m "refactor: 统一搜索栏为胶囊样式 SearchBar，替代 HeroSearch"
```

---

### Task 3: ManageToolbar 管理工具浮动条

**Files:**
- Create: `frontend/components/admin/web-settings/ManageToolbar.tsx`

- [ ] **Step 1: 创建 ManageToolbar 组件**

预览模式下浮动在数据列表上方的管理工具条。

```tsx
"use client"

import { ReactNode } from "react"

interface ManageToolbarProps {
  children: ReactNode
}

export function ManageToolbar({ children }: ManageToolbarProps) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <span className="text-sm font-medium text-blue-600">管理工具</span>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/web-settings/ManageToolbar.tsx
git commit -m "feat: ManageToolbar 管理工具浮动条组件"
```

---

## Phase 2: 首页共享组件

### Task 4: ServicesSection + AboutIntroSection

**Files:**
- Create: `frontend/components/home/ServicesSection.tsx`
- Create: `frontend/components/home/AboutIntroSection.tsx`

- [ ] **Step 1: 创建 AboutIntroSection**

从 `app/[locale]/(public)/page.tsx` 第57-68行提取"关于我们"简介板块。

```tsx
"use client"

import { useTranslations } from "next-intl"

export function AboutIntroSection() {
  const t = useTranslations("Home")

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t("aboutUsTag")}
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("aboutUsTitle")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
        {t("aboutUsContent")}
      </p>
    </section>
  )
}
```

- [ ] **Step 2: 创建 ServicesSection**

从 `app/[locale]/(public)/page.tsx` 第70-101行提取精选服务板块。含 Lucide 图标、Link 跳转、hover 效果。

```tsx
"use client"

import { useTranslations } from "next-intl"
import { GraduationCap, Globe, FileCheck, Users, ArrowRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { SectionTitle } from "./SectionTitle"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface ServicesSectionProps {
  editable?: boolean
  onEditTitle?: () => void
}

export function ServicesSection({ editable, onEditTitle }: ServicesSectionProps) {
  const t = useTranslations("Home")

  const services = [
    { icon: GraduationCap, title: t("service.studyAbroad"), desc: t("service.studyAbroadDesc"), href: "/study-abroad" as const },
    { icon: Globe, title: t("service.universities"), desc: t("service.universitiesDesc"), href: "/universities" as const },
    { icon: FileCheck, title: t("service.visa"), desc: t("service.visaDesc"), href: "/visa" as const },
    { icon: Users, title: t("service.cases"), desc: t("service.casesDesc"), href: "/cases" as const },
  ]

  const titleEl = (
    <SectionTitle configKey="services_title" fallback={t("servicesTitle")} className="mt-2 text-2xl md:text-3xl font-bold" />
  )

  return (
    <section className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("servicesTag")}
          </h2>
          {editable ? (
            <EditableOverlay onClick={() => onEditTitle?.()} label="编辑服务标题" inline>
              {titleEl}
            </EditableOverlay>
          ) : titleEl}
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group rounded-lg border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <service.icon className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />
              <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
                {service.title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {service.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                {t("learnMore")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 替换首页内联代码**

在 `app/[locale]/(public)/page.tsx` 中：
- 导入 `AboutIntroSection` 和 `ServicesSection`
- 将"关于我们"板块（第57-68行）替换为 `<AboutIntroSection />`
- 将精选服务板块（第70-101行）替换为 `<ServicesSection />`
- 清理不再需要的导入（`GraduationCap`、`Globe`、`FileCheck`、`Users`、`ArrowRight`、`Link`、`SectionTitle`）

- [ ] **Step 4: 验证首页渲染**

用 Playwright MCP 截图 `http://localhost/`，确认"关于我们"和"精选服务"板块视觉无变化。

- [ ] **Step 5: 提交**

```bash
git add frontend/components/home/AboutIntroSection.tsx frontend/components/home/ServicesSection.tsx frontend/app/
git commit -m "refactor: 提取 AboutIntroSection + ServicesSection 首页共享组件"
```

---

### Task 5: NewsSection（合并 NewsPreview）

**Files:**
- Create: `frontend/components/home/NewsSection.tsx`
- Modify: `frontend/app/[locale]/(public)/page.tsx`
- Delete: `frontend/components/admin/web-settings/NewsPreview.tsx`

- [ ] **Step 1: 创建 NewsSection**

从 API 拉真实文章数据，替代首页硬编码占位文章和 NewsPreview。复用 NewsPreview 的 API 调用和分类颜色逻辑。

```tsx
"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"

interface Article {
  id: string
  title: string
  excerpt: string | null
  category_id: string
  published_at: string | null
  created_at: string
}

interface Category {
  id: string
  name: string
}

const CAT_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-rose-100 text-rose-700",
}

export function NewsSection() {
  const t = useTranslations("Home")
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([
      api.get("/public/content/categories"),
      api.get("/public/content/articles?page_size=3"),
    ]).then(([catRes, artRes]) => {
      setCategories(catRes.data ?? [])
      setArticles(artRes.data.items ?? [])
    }).catch(() => {})
  }, [])

  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name ?? ""
  const getCatColor = (id: string) => {
    const idx = categories.findIndex((c) => c.id === id)
    return CAT_COLORS[idx % 5] ?? "bg-gray-100 text-gray-700"
  }

  return (
    <section className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {t("newsTag")}
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("newsTitle")}</h3>
          </div>
          <Link
            href="/news"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            {t("viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {articles.length > 0 ? articles.map((a) => (
            <Link
              key={a.id}
              href={`/news/${a.id}`}
              className="group rounded-lg border bg-white p-6 transition-all duration-200 hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${getCatColor(a.category_id)}`}>
                  {getCatName(a.category_id)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(a.published_at ?? a.created_at).slice(0, 10)}
                </span>
              </div>
              <h4 className="mt-2 font-bold transition-colors group-hover:text-primary">
                {a.title}
              </h4>
              {a.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
              )}
            </Link>
          )) : [1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-white p-6">
              <div className="text-xs text-muted-foreground">{new Date().toISOString().slice(0, 10)}</div>
              <h4 className="mt-2 font-bold">{t("articlePlaceholderTitle", { index: i })}</h4>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t("articlePlaceholderSummary")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 替换首页新闻板块**

在 `app/[locale]/(public)/page.tsx` 中，将最新资讯 section（约第109-143行）替换为 `<NewsSection />`。

- [ ] **Step 3: 删除 NewsPreview**

```bash
rm frontend/components/admin/web-settings/NewsPreview.tsx
```

- [ ] **Step 4: 验证**

用 Playwright MCP 截图 `http://localhost/`，确认最新资讯板块正常显示。

- [ ] **Step 5: 提交**

```bash
git add frontend/components/home/NewsSection.tsx frontend/app/
git rm frontend/components/admin/web-settings/NewsPreview.tsx
git commit -m "refactor: NewsSection 合并首页资讯和 NewsPreview，从 API 拉真实文章"
```

---

### Task 6: 更新 HomePreview

**Files:**
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`（HomePreview 部分）

- [ ] **Step 1: 重写 HomePreview**

在 `PagePreview.tsx` 中更新 `HomePreview` 函数，使用所有共享组件，补齐缺失板块，删除"热门留学国家"。

```tsx
function HomePreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  return (
    <>
      <HomeBanner editable onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>
      <AboutIntroSection />
      <ServicesSection editable onEditTitle={() => onEditConfig("services_title")} />
      <FeaturedUniversities />
      <FeaturedCases />
      <NewsSection />
      <CtaSection translationNamespace="Home" variant="border-t" />
    </>
  )
}
```

添加必要的 import：
```tsx
import { AboutIntroSection } from "@/components/home/AboutIntroSection"
import { ServicesSection } from "@/components/home/ServicesSection"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { NewsSection } from "@/components/home/NewsSection"
import { CtaSection } from "@/components/common/CtaSection"
```

删除不再需要的 `useTranslations("Home")` 和 `useLocalizedConfig()` 调用（HomePreview 中的）。

- [ ] **Step 2: 验证预览**

用 Playwright MCP 导航到 `http://localhost/admin/web-settings`，选择"首页"预览，截图确认所有板块与实际首页一致。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/PagePreview.tsx
git commit -m "refactor: HomePreview 使用共享组件，补齐缺失板块"
```

---

## Phase 3: 关于页共享组件

### Task 7: TeamSection + PartnershipSection 增强

**Files:**
- Create: `frontend/components/about/TeamSection.tsx`
- Modify: `frontend/components/about/AboutContent.tsx`

- [ ] **Step 1: 创建 TeamSection**

从 `app/[locale]/(public)/about/page.tsx` 第102-130行提取团队介绍。

```tsx
"use client"

import { useTranslations } from "next-intl"
import { GraduationCap, Globe, Handshake } from "lucide-react"

export function TeamSection() {
  const t = useTranslations("About")

  const team = [
    { icon: GraduationCap, name: t("team.leader"), role: t("team.leaderRole"), desc: t("team.leaderDesc") },
    { icon: Globe, name: t("team.consultant"), role: t("team.consultantRole"), desc: t("team.consultantDesc") },
    { icon: Handshake, name: t("team.visa"), role: t("team.visaRole"), desc: t("team.visaDesc") },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Our Team</h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("teamTitle")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {team.map((member) => (
          <div key={member.name} className="group rounded-lg border p-6 text-center transition-all hover:shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-primary/10">
              <member.icon className="h-8 w-8 text-gray-400 transition-colors group-hover:text-primary" />
            </div>
            <h4 className="mt-4 text-lg font-bold">{member.name}</h4>
            <p className="text-sm text-primary">{member.role}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 增强 PartnershipSection**

在 `components/about/AboutContent.tsx` 中修改 `PartnershipSection`，添加 `withWrapper` prop。当 `withWrapper=true` 时，组件自带标题和卡片容器。

将 PartnershipSection 的 interface 从 `EditableProps` 扩展为：

```tsx
interface PartnershipProps {
  editable?: boolean
  onEdit?: () => void
  withWrapper?: boolean
}

export function PartnershipSection({ editable, onEdit, withWrapper }: PartnershipProps) {
  const t = useTranslations('About')
  const { aboutInfo } = useLocalizedConfig()

  const innerContent = (
    <p className="leading-relaxed text-muted-foreground">
      {aboutInfo.partnership || t('partnershipContent')}
    </p>
  )

  const editableContent = editable ? (
    <EditableOverlay onClick={() => onEdit?.()} label="编辑合作介绍">
      {innerContent}
    </EditableOverlay>
  ) : innerContent

  if (!withWrapper) return editableContent

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Partnership</h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t('partnershipTitle')}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mx-auto mt-8 max-w-4xl rounded-lg border bg-gray-50 p-8 md:p-12">
        {editableContent}
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{t('partnerBadge1')}</span>
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{t('partnerBadge2')}</span>
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{t('partnerBadge3')}</span>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 更新关于页面使用 withWrapper**

在 `app/[locale]/(public)/about/page.tsx` 中，将 Partnership section 的包装代码（标题、卡片容器、badges，约第72-96行）替换为 `<PartnershipSection withWrapper />`。删除 `Handshake` 导入（如 TeamSection 已从此页面移除）。

- [ ] **Step 4: 更新关于页面使用 TeamSection**

在 `about/page.tsx` 中，将团队介绍板块（约第102-130行）替换为 `<TeamSection />`。删除 `GraduationCap`、`Globe`、`Handshake` 等不再需要的导入。

- [ ] **Step 5: 验证关于页面**

用 Playwright MCP 截图 `http://localhost/about`，确认所有板块视觉无变化。

- [ ] **Step 6: 提交**

```bash
git add frontend/components/about/TeamSection.tsx frontend/components/about/AboutContent.tsx frontend/app/
git commit -m "refactor: 提取 TeamSection + PartnershipSection withWrapper 模式"
```

---

### Task 8: 更新 AboutPreview

**Files:**
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`（AboutPreview 部分）

- [ ] **Step 1: 重写 AboutPreview**

在 `PagePreview.tsx` 中更新 `AboutPreview`，修正板块顺序（ContactInfoSection 移到 #2），补齐 TeamSection 和 CtaSection，HistorySection 补"Our Story"标题，PartnershipSection 用 `withWrapper`。

```tsx
function AboutPreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  const t = useTranslations("About")
  const p = useTranslations("Pages")
  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("about")} label="编辑 Banner">
        <PageBanner pageKey="about" title={p("about")} subtitle={p("aboutSubtitle")} />
      </EditableOverlay>
      <ContactInfoSection editable onEditField={(field) => onEditConfig(`contact_${field}`)} />
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Our Story</h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("historyTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <HistorySection editable onEdit={() => onEditConfig("about_history")} />
      </section>
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <MissionVisionSection
            editable
            onEditMission={() => onEditConfig("about_mission")}
            onEditVision={() => onEditConfig("about_vision")}
          />
        </div>
      </section>
      <PartnershipSection withWrapper editable onEdit={() => onEditConfig("about_partnership")} />
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <AboutStatsSection />
      </EditableOverlay>
      <TeamSection />
      <CtaSection translationNamespace="About" />
    </>
  )
}
```

添加导入：
```tsx
import { PageBanner } from "@/components/layout/PageBanner"
import { TeamSection } from "@/components/about/TeamSection"
```

注意：将 `Banner` 的导入改为 `PageBanner`（AboutPreview 之前用的是 Banner 而非 PageBanner）。

- [ ] **Step 2: 验证预览**

用 Playwright MCP 导航到 web-settings，选择"关于我们"预览，与 `/about` 实际页面对比。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/PagePreview.tsx
git commit -m "refactor: AboutPreview 使用共享组件，修正板块顺序"
```

---

## Phase 4: 院校搜索改造

### Task 9: UniversitySearch 侧栏布局

**Files:**
- Modify: `frontend/components/public/UniversitySearch.tsx`

- [ ] **Step 1: 改造 UniversitySearch 为垂直布局**

将现有的水平 flex-wrap 布局改为垂直排列。增加 `editable` prop 和 `onManageDisciplines` 回调。当 `editable=true` 时，学科筛选区域包裹 EditableOverlay。

关键变更：
- 外层 div 从 `flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap` 改为 `space-y-4`
- 每个 Select 占满宽度
- 搜索框保持在顶部
- 添加 `editable` / `onManageDisciplines` prop
- 学科大类的 SelectTrigger 用 EditableOverlay 包裹（当 editable 时）

具体实现：读取现有 `UniversitySearch.tsx` 的完整代码，只修改布局 className 和添加 editable 逻辑。保持所有现有的筛选联动逻辑不变。

- [ ] **Step 2: 验证院校页筛选**

用 Playwright MCP 导航到 `http://localhost/universities`，确认筛选功能正常（选国家→出省份/城市，选学科大类→出学科）。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/public/UniversitySearch.tsx
git commit -m "refactor: UniversitySearch 改为垂直侧栏布局 + editable 模式"
```

---

### Task 10: UniversityList 双栏布局 + editable 模式

**Files:**
- Modify: `frontend/components/public/UniversityList.tsx`
- Modify: `frontend/app/[locale]/(public)/universities/page.tsx`

- [ ] **Step 1: 改造 UniversityList 为双栏布局**

将 UniversityList 改为左侧栏筛选 + 右侧卡片网格。增加 `editable`、`onEdit`、`onDelete`、`onCreate` props。

关键变更：
- 外层改为 `flex gap-6`
- 左侧 `<aside className="hidden md:block w-60 shrink-0">` 放 UniversitySearch
- 右侧 `<div className="flex-1">` 放卡片网格 + 分页
- 当 `editable=true` 时，每张卡片用 `EditableOverlay` 包裹，点击触发 `onEdit(university)`
- editable 模式下卡片不是 Link（避免导航），改为 div

- [ ] **Step 2: 更新院校页面**

在 `app/[locale]/(public)/universities/page.tsx` 中，移除独立的 `UniversitySearch` 导入和渲染（因为现在内嵌在 UniversityList 中）。

- [ ] **Step 3: 验证院校页面**

用 Playwright MCP 导航到 `http://localhost/universities`，确认双栏布局正常，筛选和分页功能正常。

- [ ] **Step 4: 提交**

```bash
git add frontend/components/public/UniversityList.tsx frontend/components/public/UniversitySearch.tsx frontend/app/
git commit -m "refactor: UniversityList 双栏布局 + editable 模式"
```

---

### Task 11: DisciplineManageDialog + 院校预览

**Files:**
- Create: `frontend/components/admin/web-settings/DisciplineManageDialog.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`
- Delete: `frontend/components/admin/web-settings/UniversitiesEditPreview.tsx`

- [ ] **Step 1: 创建 DisciplineManageDialog**

从 `UniversitiesEditPreview.tsx` 中提取学科分类管理的所有状态和 UI（第63-489行的学科部分），包装为独立的 Dialog 组件。

使用 shadcn Dialog，内容复用现有的学科分类树形编辑界面（大分类增删改、学科增删改）。保留 ImportExportToolbar 支持。

- [ ] **Step 2: 重写院校预览**

在 `PagePreview.tsx` 中，将 `case "universities"` 的渲染改为视觉预览模式：

```tsx
case "universities":
  return <UniversitiesPreview onBannerEdit={onBannerEdit} />
```

新增 `UniversitiesPreview` 函数组件（可以在 PagePreview.tsx 内定义，或如果太长则提取到独立文件）：

结构：
1. PageBanner（editable）
2. 概述板块（只读，复用实际页面的 "Partner Universities" 标题和介绍文字）
3. ManageToolbar（添加院校 / 导入 / 导出）
4. UniversityList（editable，onEdit → 打开 UniversityEditDialog）
5. 学科筛选区 editable → 打开 DisciplineManageDialog
6. CtaSection（只读）

- [ ] **Step 3: 删除旧文件**

```bash
rm frontend/components/admin/web-settings/UniversitiesEditPreview.tsx
```

- [ ] **Step 4: 验证院校预览**

用 Playwright MCP 导航到 web-settings，选择"院校选择"预览：
- 确认视觉与实际 `/universities` 页面一致
- 确认卡片 hover 显示虚线框 + 铅笔
- 确认管理工具栏浮动条正常
- 点击学科筛选区的编辑 overlay → 弹窗打开

- [ ] **Step 5: 提交**

```bash
git add frontend/components/admin/web-settings/
git commit -m "feat: 院校预览改为视觉预览模式 + DisciplineManageDialog"
```

---

## Phase 5: 案例预览改造

### Task 12: CaseGrid + 案例预览

**Files:**
- Create: `frontend/components/public/CaseGrid.tsx`
- Modify: `frontend/app/[locale]/(public)/cases/page.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`
- Delete: `frontend/components/admin/web-settings/CasesEditPreview.tsx`
- Delete: `frontend/components/admin/web-settings/CasesPreview.tsx`

- [ ] **Step 1: 创建 CaseGrid**

从 `cases/page.tsx` 第79-129行提取案例卡片网格。支持 `editable` 模式（每张卡片 EditableOverlay）。

```tsx
"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { GraduationCap, Quote } from "lucide-react"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  avatar_image_id: string | null
}

interface CaseGridProps {
  editable?: boolean
  onEdit?: (item: CaseItem) => void
}

export function CaseGrid({ editable, onEdit }: CaseGridProps) {
  const t = useTranslations("Cases")
  const [cases, setCases] = useState<CaseItem[]>([])

  useEffect(() => {
    const url = editable ? "/admin/web-settings/cases/list" : "/public/cases/list"
    api.get(url, { params: { page: 1, page_size: 100 } })
      .then((res) => setCases(res.data.items ?? []))
      .catch(() => setCases([]))
  }, [editable])

  const renderCard = (c: CaseItem) => {
    const content = (
      <>
        <div className="flex items-center gap-3">
          {c.avatar_image_id ? (
            <img src={`/api/public/images/detail?id=${c.avatar_image_id}`} alt={c.student_name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h4 className="font-bold">{c.student_name}</h4>
            <p className="text-xs text-muted-foreground">{c.year}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-sm font-medium text-primary">{c.university}</p>
          <p className="text-xs text-muted-foreground">{c.program}</p>
        </div>
        {c.testimonial && (
          <div className="mt-4 flex gap-2">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/40" />
            <p className="text-sm italic leading-relaxed text-muted-foreground">{c.testimonial}</p>
          </div>
        )}
      </>
    )

    const cls = "group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"

    if (editable) {
      return (
        <EditableOverlay key={c.id} onClick={() => onEdit?.(c)} label={`编辑案例 ${c.student_name}`}>
          <div className={cls}>{content}</div>
        </EditableOverlay>
      )
    }

    return (
      <Link key={c.id} href={`/cases/${c.id}`} className={cls}>
        {content}
      </Link>
    )
  }

  if (cases.length === 0) {
    return <p className="text-center text-muted-foreground py-12">{t("noContent")}</p>
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cases.map(renderCard)}
    </div>
  )
}
```

- [ ] **Step 2: 更新案例页面使用 CaseGrid**

在 `cases/page.tsx` 中，将案例卡片网格（约第79-129行）替换为 `<CaseGrid />`。保留页面的 Banner、统计条、标题、CTA。

- [ ] **Step 3: 重写案例预览**

在 `PagePreview.tsx` 中，将 `case "cases"` 的渲染改为视觉预览。新增 `CasesPreviewPage` 函数：

结构：PageBanner + 统计条 + 标题 + ManageToolbar + CaseGrid(editable) + CtaSection

CaseGrid 的 `onEdit` 回调打开现有的 `CaseEditDialog`。ManageToolbar 包含添加按钮（打开 CaseEditDialog）、ImportExportToolbar。

- [ ] **Step 4: 删除旧文件**

```bash
rm frontend/components/admin/web-settings/CasesEditPreview.tsx
rm frontend/components/admin/web-settings/CasesPreview.tsx
```

- [ ] **Step 5: 验证**

用 Playwright MCP 对比 web-settings 案例预览与 `/cases` 实际页面。确认卡片 hover 编辑正常。

- [ ] **Step 6: 提交**

```bash
git add frontend/components/public/CaseGrid.tsx frontend/components/admin/web-settings/PagePreview.tsx frontend/app/
git rm frontend/components/admin/web-settings/CasesEditPreview.tsx frontend/components/admin/web-settings/CasesPreview.tsx
git commit -m "refactor: CaseGrid 共享组件 + 案例预览视觉化"
```

---

## Phase 6: 文章页面介绍组件提取

### Task 13: 提取文章页面介绍组件

**Files:**
- Create: `frontend/components/study-abroad/StudyAbroadIntro.tsx`
- Create: `frontend/components/visa/VisaIntro.tsx`
- Create: `frontend/components/requirements/RequirementsIntro.tsx`
- Create: `frontend/components/life/LifeIntro.tsx`
- Modify: 4 个对应的 page.tsx

对每个页面，将从 PageBanner 之后到 ArticleSection 之前的所有介绍板块提取为一个 `"use client"` 组件，使用 `useTranslations` 代替 `getTranslations`。

- [ ] **Step 1: 创建 StudyAbroadIntro**

从 `study-abroad/page.tsx` 提取第57-155行（概述 + 德语项目 + 项目对比卡片），转为 Client Component。所有 `t()` 调用改用 `useTranslations("StudyAbroad")`。

- [ ] **Step 2: 创建 VisaIntro**

从 `visa/page.tsx` 提取第42-145行（签证流程 + 所需材料 + 办理时间 + 注意事项），转为 Client Component。`useTranslations("Visa")`。

- [ ] **Step 3: 创建 RequirementsIntro**

从 `requirements/page.tsx` 提取第34-186行（条件总览 + 语言要求 + 材料清单 + 申请流程），转为 Client Component。`useTranslations("Requirements")`。

- [ ] **Step 4: 创建 LifeIntro**

从 `life/page.tsx` 提取第68-146行（生活指南介绍 + 四大板块 + 城市指南），转为 Client Component。`useTranslations("Life")`。

- [ ] **Step 5: 更新 4 个 page.tsx**

每个 page.tsx 导入对应的 Intro 组件替代内联代码：
- `study-abroad/page.tsx`：`<StudyAbroadIntro />`
- `visa/page.tsx`：`<VisaIntro />`
- `requirements/page.tsx`：`<RequirementsIntro />`
- `life/page.tsx`：`<LifeIntro />`

清理不再需要的 Lucide 图标导入。

- [ ] **Step 6: 验证所有文章页面**

用 Playwright MCP 逐页截图验证 `/study-abroad`、`/visa`、`/requirements`、`/life`，确认视觉无变化。

- [ ] **Step 7: 提交**

```bash
git add frontend/components/study-abroad/ frontend/components/visa/ frontend/components/requirements/ frontend/components/life/ frontend/app/
git commit -m "refactor: 提取文章页面介绍组件为 Client Component"
```

---

## Phase 7: 文章预览改造

### Task 14: ArticleListClient + 文章预览

**Files:**
- Create: `frontend/components/public/ArticleListClient.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`
- Modify: `frontend/app/[locale]/(public)/news/page.tsx`
- Delete: `frontend/components/admin/web-settings/ArticleListPreview.tsx`

- [ ] **Step 1: 创建 ArticleListClient**

Client 端文章列表组件，从 API 拉取文章数据。支持 `editable` 模式（每篇文章 EditableOverlay）。带分类筛选和分页。

参考 `news/page.tsx` 的列表样式（Link 卡片 + 分类标签 + 日期 + 标题 + 摘要）和 `ArticleListPreview.tsx` 的 API 调用逻辑。

Props：
```tsx
interface ArticleListClientProps {
  categorySlug?: string
  editable?: boolean
  onEdit?: (article: Article) => void
}
```

当 `categorySlug` 存在时（文章类页面），先通过 `/admin/web-settings/categories/list` 或 `/public/content/categories` 查找对应的 category_id，再按 category_id 筛选文章。

当 `categorySlug` 不存在时（新闻页），显示全部文章 + 分类筛选标签。

- [ ] **Step 2: 更新新闻页面使用 ArticleListClient**

在 `news/page.tsx` 中，将文章列表 + 分类筛选 + 分页部分替换为 `<ArticleListClient />`。保留 PageBanner 和标题。

注意：新闻页原来是 Server Component，改用 Client 组件后，`searchParams` 相关逻辑移入 ArticleListClient（通过 `useSearchParams`）。

- [ ] **Step 3: 重写文章预览**

在 `PagePreview.tsx` 中，将 `default` case（ArticleListPreview）改为视觉预览。

结构：
1. PageBanner（editable）
2. 对应页面的 Intro 组件（只读）—— 根据 activePage 动态渲染：
   - `study-abroad` → `<StudyAbroadIntro />`
   - `visa` → `<VisaIntro />`
   - `requirements` → `<RequirementsIntro />`
   - `life` → `<LifeIntro />`
   - `news` → 无 Intro
3. ManageToolbar（写文章 / 导入 / 导出）
4. ArticleListClient（editable，categorySlug）
5. CtaSection

实现 `getIntroComponent(slug)` 函数动态选择 Intro 组件。

- [ ] **Step 4: 删除旧文件**

```bash
rm frontend/components/admin/web-settings/ArticleListPreview.tsx
```

- [ ] **Step 5: 验证**

用 Playwright MCP 验证：
- web-settings 中各文章页预览（出国留学、签证、新闻等）与实际页面视觉一致
- 文章列表显示从 API 拉取的真实数据
- 文章卡片 hover 显示编辑 overlay

- [ ] **Step 6: 提交**

```bash
git add frontend/components/public/ArticleListClient.tsx frontend/components/admin/web-settings/PagePreview.tsx frontend/app/
git rm frontend/components/admin/web-settings/ArticleListPreview.tsx
git commit -m "refactor: 文章预览视觉化 + ArticleListClient 共享组件"
```

---

## Phase 8: 清理 + 最终验证

### Task 15: 前后端清理 + 最终验证

**Files:**
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`
- Scan: `frontend/` 全局未使用导入和组件
- Scan: `backend/api/tests/` 涉及旧组件的测试引用
- Scan: `frontend/e2e/` E2E 测试中的选择器和断言

- [ ] **Step 1: 清理 PagePreview 导入**

确保 PagePreview.tsx 中：
- 删除所有已删文件的导入（UniversitiesEditPreview、CasesEditPreview、ArticleListPreview、NewsPreview）
- 删除 Banner 导入（改用 PageBanner）
- 清理未使用的 `useTranslations`、`useLocalizedConfig` 调用
- 确认文件行数 ≤ 300 行（如超过则拆分各预览为独立文件）

- [ ] **Step 2: 前端全局清理**

扫描并修复：
- `web-settings/page.tsx` 主页面中对已删组件的引用（如 import 路径、dialog 状态管理中引用旧 Preview 组件的逻辑）
- 已删除组件的 `*.test.tsx` 测试文件（如存在则删除或更新）
- `frontend/components/admin/web-settings/` 目录下不再被引用的编辑弹窗（UniversityEditDialog、CaseEditDialog、ArticleEditDialog 仍需保留，确认引用路径正确）
- `frontend/components/home/SectionTitle.tsx` 的 `configKey` 类型：如果 `destinations_title` 不再被使用（首页"热门留学国家"板块已删），从类型联合中移除

```bash
# 查找引用已删文件的地方
grep -r "UniversitiesEditPreview\|CasesEditPreview\|ArticleListPreview\|NewsPreview\|HeroSearch\|CasesPreview" frontend/src frontend/components frontend/app --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 3: 后端清理**

扫描并修复：
- 后端测试中如果有直接引用前端路由或组件名称的断言（E2E 测试 fixture 中的 component 清单等）
- `frontend/e2e/helpers/components.json`：如果包含旧的组件名（如 "UniversitiesEditPreview"），更新为新的组件名
- `frontend/e2e/fns/` 和 `frontend/e2e/w*/tasks.ts`：检查是否有引用旧管理界面 DOM 选择器的 E2E 函数需要更新（如院校管理的"学科分类管理"折叠面板选择器、案例管理的网格选择器等）
- 后端 API 端点不变，但确认前端新组件使用的 admin API 路径与后端 router 一致

```bash
# 检查 E2E 测试中对旧 UI 的引用
grep -r "学科分类管理\|院校管理\|案例管理\|文章管理" frontend/e2e/ --include="*.ts" -l
# 检查组件清单
cat frontend/e2e/helpers/components.json 2>/dev/null | head -20
```

- [ ] **Step 4: TypeScript 构建检查**

```bash
pnpm --prefix frontend tsc --noEmit
```

修复所有类型错误。

- [ ] **Step 5: 端到端验证**

用 Playwright MCP 逐页验证 web-settings 预览：
1. 首页 → 8 个板块完整
2. 关于 → 板块顺序正确，ContactInfoSection 在 #2
3. 院校 → 左侧栏筛选 + 卡片网格 + 管理工具栏
4. 案例 → 统计 + 卡片网格 + 管理工具栏
5. 出国留学 → 介绍板块 + 文章列表 + 管理工具栏
6. 签证 → 介绍板块 + 文章列表
7. 新闻 → 文章列表 + 分类筛选

同时验证实际公开页面未被破坏（`/`、`/about`、`/universities`、`/cases`、`/news`）。

- [ ] **Step 6: 提交清理**

```bash
git add frontend/
git commit -m "chore: 清理前端已删组件引用 + PagePreview 导入整理"
```

- [ ] **Step 7: 运行测试**

```bash
./scripts/test.sh unit
./scripts/test.sh vitest
```

修复所有失败的测试：
- **后端单元测试**：检查是否有 mock 路径引用了被改名/删除的前端路由
- **前端 Vitest**：修复因组件移动/删除导致的导入错误和快照不匹配
- **确认不降低覆盖率**

- [ ] **Step 8: 提交测试修复**

```bash
git add frontend/ backend/
git commit -m "test: 修复组件提取后的前后端测试引用"
```

- [ ] **Step 9: 运行 /simplify 代码审查**

使用 `/simplify` skill 审查所有变更的代码，检查复用性、质量和效率问题并修复。
