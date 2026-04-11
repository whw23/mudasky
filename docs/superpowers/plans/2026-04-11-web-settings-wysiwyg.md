# 网页设置 WYSIWYG 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将网页设置做成真正的所见即所得编辑器，修复布局/层级/交互问题。

**Architecture:** 修改共用 SidebarShell 实现左右独立滚动，改造 Header 支持 editable 模式下的导航切换，重写 PagePreview 复用真实公开页面组件渲染预览。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-11-web-settings-wysiwyg-design.md`

---

### Task 1: SidebarShell 布局 — 左右独立滚动

**Files:**
- Modify: `frontend/components/layout/SidebarShell.tsx`

- [ ] **Step 1: 修改 SidebarShell 布局**

打开 `frontend/components/layout/SidebarShell.tsx`，修改三处：

1. 外层 div 第 29 行：`min-h-screen` → `h-screen overflow-hidden`
2. 桌面侧边栏 aside 第 31 行：加 `overflow-y-auto`
3. 主区域 main 第 59 行：加 `overflow-y-auto`

```tsx
// 第 29 行
<div className="flex h-screen overflow-hidden">

// 第 31 行
<aside className={`hidden md:block w-60 shrink-0 overflow-y-auto border-r ${sidebarClass}`}>

// 第 43 行（移动端抽屉 aside 也加 overflow-y-auto）
<aside
  className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 overflow-y-auto border-r transition-transform duration-200 ${sidebarClass} ${
    open ? "translate-x-0" : "-translate-x-full"
  }`}
>

// 第 59 行
<main className="flex-1 overflow-y-auto bg-gray-50">
```

- [ ] **Step 2: 验证管理后台和用户中心布局**

手动测试：
1. 打开 `http://localhost/admin/dashboard`，确认侧边栏固定、右侧内容独立滚动
2. 打开 `http://localhost/dashboard`（用户中心），确认同样效果
3. 缩窄浏览器窗口测试移动端，确认汉堡菜单抽屉仍正常

- [ ] **Step 3: 提交**

```bash
git add frontend/components/layout/SidebarShell.tsx
git commit -m "fix: SidebarShell 左右独立滚动 — h-screen + overflow-y-auto"
```

---

### Task 2: Header editable 模式 — 移除 sticky、导航行为替换

**Files:**
- Modify: `frontend/components/layout/Header.tsx`

- [ ] **Step 1: 修改 HeaderProps 接口**

移除 `hideNav`，新增 `onPageChange` 和 `activePage`：

```tsx
interface HeaderProps {
  editable?: boolean
  onEdit?: (section: string) => void
  onPageChange?: (key: string) => void
  activePage?: string
}
```

- [ ] **Step 2: 修改 header 标签的 className**

第 84-89 行，editable 模式下不加 `sticky top-0 z-50`：

```tsx
<header
  className={`overflow-x-hidden transition-all duration-300 ${
    editable
      ? ""
      : `sticky top-0 z-50 ${scrolled ? "bg-white/70 backdrop-blur-xl shadow-sm" : ""}`
  }`}
>
```

- [ ] **Step 3: 修改桌面导航栏 Row 2 渲染逻辑**

将第 173-196 行替换。editable 模式下用 `<button>` 代替 `<Link>`，点击调用 `onPageChange`：

```tsx
{/* === 桌面导航栏 Row 2 === */}
<nav className="hidden md:block border-t border-black/[0.04]">
  <div className="mx-auto flex max-w-7xl items-center px-4 py-2">
    <ul className="flex flex-1 items-center justify-evenly">
      {NAV_KEYS.map((item) => {
        const active = editable
          ? activePage === item.key
          : isActive(pathname, item.href)
        return (
          <li key={item.key}>
            {editable ? (
              <button
                onClick={() => onPageChange?.(item.key)}
                className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "text-primary border-b-2 border-primary"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {tNav(item.key)}
              </button>
            ) : (
              <Link
                href={item.href}
                className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "text-primary border-b-2 border-primary"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {tNav(item.key)}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  </div>
</nav>
```

- [ ] **Step 4: 验证**

1. 打开 `http://localhost`，确认公共网站 Header 正常（sticky、导航链接跳转）
2. 打开 `http://localhost/admin/web-settings`，确认：
   - Header 不是 sticky
   - 导航栏样式与公共网站一致
   - 点击导航项切换预览页面（需配合 Task 3）

- [ ] **Step 5: 提交**

```bash
git add frontend/components/layout/Header.tsx
git commit -m "feat: Header editable 模式 — 移除 sticky、导航行为替换为 onPageChange"
```

---

### Task 3: web-settings 页面 — 接入新 Header、修复弹窗字段、层级隔离

**Files:**
- Modify: `frontend/app/[locale]/(admin)/admin/web-settings/page.tsx`
- Delete: `frontend/components/admin/web-settings/PreviewNavBar.tsx`

- [ ] **Step 1: 移除 PreviewNavBar 导入和用法**

在 `page.tsx` 中：
1. 删除第 13 行 `import { PreviewNavBar }`
2. 删除第 16 行 `import type { PageKey }`
3. 将 `activePage` 的 state 类型改为 `string`：

```tsx
const [activePage, setActivePage] = useState('home')
```

- [ ] **Step 2: 修改 Header 调用**

将第 246 行从：
```tsx
<Header editable hideNav onEdit={handleHeaderEdit} />
```
改为：
```tsx
<Header
  editable
  onEdit={handleHeaderEdit}
  onPageChange={setActivePage}
  activePage={activePage}
/>
```

- [ ] **Step 3: 移除 PreviewNavBar 使用和简化预览容器**

将第 244-254 行的预览容器替换为：

```tsx
{/* 预览容器 — 禁用链接跳转，编辑按钮可点击 */}
<div className="isolate overflow-hidden rounded-lg border bg-white shadow-sm [&_a]:pointer-events-none [&_.group]:pointer-events-auto">
  <Header
    editable
    onEdit={handleHeaderEdit}
    onPageChange={setActivePage}
    activePage={activePage}
  />
  <div className="max-h-[60vh] overflow-y-auto">
    <PagePreview activePage={activePage} onEditConfig={handleEditConfig} />
  </div>
  <Footer editable onEdit={handleFooterEdit} />
</div>
```

关键变化：
- 加 `isolate` 创建独立 stacking context，防止 z-index 穿透
- 移除 `[&_button]:pointer-events-none` 和 `[&_.preview-nav]:pointer-events-auto`
- 移除 `PreviewNavBar` 和 `.preview-nav` div

- [ ] **Step 4: 修复 handleHeaderEdit — 按 section 区分字段**

当前 `handleHeaderEdit` 不区分 section，一律打开全部站点信息。改为接收 section 参数：

```tsx
/** 处理 Header 编辑区域点击 */
function handleHeaderEdit(section: string): void {
  switch (section) {
    case 'brand':
      setDialogState({
        open: true,
        title: '编辑品牌',
        fields: [
          { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
          { key: 'logo_url', label: 'Logo', type: 'image' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    case 'tagline':
      setDialogState({
        open: true,
        title: '编辑标语',
        fields: [
          { key: 'tagline', label: '品牌标语', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    case 'hotline':
      setDialogState({
        open: true,
        title: '编辑热线',
        fields: [
          { key: 'hotline', label: '服务热线', type: 'text' as const, localized: false },
          { key: 'hotline_contact', label: '热线联系人', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    default:
      break
  }
}
```

- [ ] **Step 5: 修复 handleFooterEdit — 按 section 区分字段**

```tsx
/** 处理 Footer 编辑区域点击 */
function handleFooterEdit(section: string): void {
  switch (section) {
    case 'contact':
      setDialogState({
        open: true,
        title: '编辑联系方式',
        fields: [
          { key: 'address', label: '地址', type: 'text' as const, localized: true },
          { key: 'phone', label: '电话', type: 'text' as const, localized: false },
          { key: 'email', label: '邮箱', type: 'text' as const, localized: false },
          { key: 'wechat', label: '微信号', type: 'text' as const, localized: false },
          { key: 'office_hours', label: '办公时间', type: 'text' as const, localized: true },
        ],
        configKey: 'contact_info',
        data: rawConfig.contactInfo,
      })
      break
    case 'wechat_qr':
      setDialogState({
        open: true,
        title: '编辑微信二维码',
        fields: [
          { key: 'wechat_qr_url', label: '微信二维码', type: 'image' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    case 'icp':
      setDialogState({
        open: true,
        title: '编辑 ICP 备案',
        fields: [
          { key: 'icp_filing', label: 'ICP备案号', type: 'text' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    default:
      break
  }
}
```

- [ ] **Step 6: 清理无用的顶层字段常量**

删除不再使用的 `SITE_INFO_FIELDS` 和 `CONTACT_FIELDS` 常量（第 20-37 行）。`STAT_FIELDS`、`HERO_FIELDS`、`SERVICES_FIELDS` 仍被 `handleEditConfig` 使用，保留。

- [ ] **Step 7: 删除 PreviewNavBar 文件**

```bash
rm frontend/components/admin/web-settings/PreviewNavBar.tsx
```

- [ ] **Step 8: 验证**

1. 打开 `http://localhost/admin/web-settings`
2. 确认导航栏样式与公共网站一致
3. 点击导航项，确认可以切换预览页面
4. 点击 Header 品牌名的编辑按钮，确认弹窗只显示品牌名称和 Logo（不显示热线等无关字段）
5. 点击 Footer 联系方式编辑，确认只显示联系相关字段
6. 确认预览内容没有穿透侧边栏

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "fix: web-settings 层级隔离、导航统一、弹窗字段精确对应"
```

---

### Task 4: 重写 PagePreview — 复用真实公开页面组件

**Files:**
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`
- Modify: `frontend/components/admin/web-settings/DataSectionOverlay.tsx`

- [ ] **Step 1: 修改 DataSectionOverlay — 支持链接跳转模式**

当前 `DataSectionOverlay` 在弹窗里嵌入管理表格，改为支持链接跳转到对应管理页面：

修改 `frontend/components/admin/web-settings/DataSectionOverlay.tsx`：

```tsx
"use client"

/**
 * 数据驱动区块的编辑浮层组件。
 * hover 显示管理按钮，点击跳转到对应管理页面。
 */

import { Link } from "@/i18n/navigation"

interface DataSectionOverlayProps {
  children: React.ReactNode
  label: string
  href: string
}

/**
 * 数据驱动区块的编辑浮层
 * hover 显示管理按钮，点击跳转到管理页面
 */
export function DataSectionOverlay({
  children,
  label,
  href,
}: DataSectionOverlayProps) {
  return (
    <div className="group relative">
      {children}
      <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-transparent transition-colors group-hover:border-blue-400 group-hover:bg-blue-50/30">
        <Link
          href={href}
          className="pointer-events-auto absolute right-2 top-2 rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          {label}
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 重写 PagePreview — 首页预览复用真实组件**

重写 `frontend/components/admin/web-settings/PagePreview.tsx` 中的 `HomePreview`，复用真实首页的所有 section：

```tsx
"use client"

/**
 * 页面预览容器组件。
 * 根据 activePage 渲染对应公开页面的真实组件，
 * 配合 EditableOverlay 和 DataSectionOverlay 实现可编辑浮层。
 */

import { useTranslations } from "next-intl"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { DataSectionOverlay } from "./DataSectionOverlay"

import { Banner } from "@/components/layout/Banner"
import { StatsSection } from "@/components/home/StatsSection"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { UniversityList } from "@/components/public/UniversityList"
import { CasesPreview } from "./CasesPreview"
import { NewsPreview } from "./NewsPreview"

interface PagePreviewProps {
  activePage: string
  onEditConfig: (section: string) => void
}

/** 页面预览路由 */
export function PagePreview({ activePage, onEditConfig }: PagePreviewProps) {
  switch (activePage) {
    case "home":
      return <HomePreview onEditConfig={onEditConfig} />
    case "universities":
      return <UniversitiesPreview />
    case "cases":
      return <CasesPagePreview />
    case "news":
      return <NewsPagePreview />
    case "about":
      return <AboutPreview onEditConfig={onEditConfig} />
    default:
      return <StaticPagePreview pageKey={activePage} />
  }
}
```

接着写 `HomePreview`（复用真实首页的所有 section）：

```tsx
/** 首页预览 — 复用真实首页组件 */
function HomePreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  const t = useTranslations("Home")

  const services = [
    { icon: "🎓", title: t("service.studyAbroad"), desc: t("service.studyAbroadDesc") },
    { icon: "🌍", title: t("service.universities"), desc: t("service.universitiesDesc") },
    { icon: "📋", title: t("service.visa"), desc: t("service.visaDesc") },
    { icon: "👥", title: t("service.cases"), desc: t("service.casesDesc") },
  ]

  const countries = [
    { key: "germany", name: t("germany") },
    { key: "japan", name: t("japan") },
    { key: "singapore", name: t("singapore") },
  ]

  return (
    <>
      <EditableOverlay onClick={() => onEditConfig("hero")} label="编辑 Hero">
        <Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} large />
      </EditableOverlay>

      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>

      <EditableOverlay onClick={() => onEditConfig("services")} label="编辑服务">
        <section className="bg-gray-50 py-10 md:py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                {t("servicesTag")}
              </h2>
              <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("servicesTitle")}</h3>
              <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <div key={s.title} className="rounded-lg border bg-white p-6 shadow-sm">
                  <span className="text-3xl">{s.icon}</span>
                  <h4 className="mt-4 text-lg font-bold">{s.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </EditableOverlay>

      {/* 热门留学国家 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("destinationsTag")}
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("destinationsTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-8 md:mt-12 grid gap-4 md:gap-6 md:grid-cols-3">
          {countries.map((c) => (
            <div key={c.key} className="group relative overflow-hidden rounded-lg" style={{ backgroundImage: "linear-gradient(135deg, #374151 0%, #1f2937 100%)" }}>
              <div className="flex h-48 items-center justify-center">
                <div className="text-center text-white">
                  <h4 className="text-2xl font-bold">{c.name}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 3: 写 UniversitiesPreview、CasesPagePreview、NewsPagePreview**

院校预览复用 `UniversityList`（已是 Client 组件）：

```tsx
/** 院校选择预览 */
function UniversitiesPreview() {
  const t = useTranslations("Pages")
  return (
    <DataSectionOverlay label="管理院校" href="/admin/universities">
      <Banner title={t("universities")} subtitle={t("universitiesSubtitle")} />
      <UniversityList />
    </DataSectionOverlay>
  )
}
```

案例预览需要新建 Client 包装组件 `CasesPreview.tsx`（因为真实 Cases 页面是 Server Component）。

创建 `frontend/components/admin/web-settings/CasesPreview.tsx`：

```tsx
"use client"

/**
 * 成功案例预览组件（Client 端）。
 * 从 API 获取案例数据，复用真实案例页面的卡片样式。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { GraduationCap, Quote } from "lucide-react"
import api from "@/lib/api"

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
}

/** 案例预览 */
export function CasesPreview() {
  const t = useTranslations("Cases")
  const [cases, setCases] = useState<CaseItem[]>([])

  useEffect(() => {
    api.get("/cases?page_size=6").then((res) => {
      setCases(res.data.items ?? [])
    }).catch(() => {})
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Success Stories
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("title")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      {cases.length > 0 ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
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
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-muted-foreground">暂无案例数据</p>
      )}
    </section>
  )
}
```

创建 `frontend/components/admin/web-settings/NewsPreview.tsx`：

```tsx
"use client"

/**
 * 新闻政策预览组件（Client 端）。
 * 从 API 获取文章数据，复用真实新闻页面的列表样式。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
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

/** 分类颜色 */
const CAT_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-rose-100 text-rose-700",
}

/** 新闻预览 */
export function NewsPreview() {
  const t = useTranslations("News")
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([
      api.get("/content/categories"),
      api.get("/content/articles?page_size=6"),
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
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Latest Updates
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("title")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>

      {/* 分类标签 */}
      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white">
            {t("all")}
          </span>
          {categories.map((cat) => (
            <span key={cat.id} className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600">
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {articles.length > 0 ? (
        <div className="mt-8 space-y-4">
          {articles.map((a) => (
            <div key={a.id} className="rounded-lg border bg-white p-6">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${getCatColor(a.category_id)}`}>
                  {getCatName(a.category_id)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(a.published_at ?? a.created_at).slice(0, 10)}
                </span>
              </div>
              <h4 className="mt-2 font-bold">{a.title}</h4>
              {a.excerpt && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-muted-foreground">暂无文章</p>
      )}
    </section>
  )
}
```

- [ ] **Step 4: 完成 PagePreview 剩余部分**

在 `PagePreview.tsx` 中补全数据页面和静态页面的预览：

```tsx
/** 案例页预览 */
function CasesPagePreview() {
  const t = useTranslations("Pages")
  return (
    <DataSectionOverlay label="管理案例" href="/admin/cases">
      <Banner title={t("cases")} subtitle={t("casesSubtitle")} />
      <CasesPreview />
    </DataSectionOverlay>
  )
}

/** 新闻页预览 */
function NewsPagePreview() {
  const t = useTranslations("Pages")
  return (
    <DataSectionOverlay label="管理文章" href="/admin/articles">
      <Banner title={t("news")} subtitle={t("newsSubtitle")} />
      <NewsPreview />
    </DataSectionOverlay>
  )
}

/** 关于我们预览 */
function AboutPreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  const t = useTranslations("Pages")
  return (
    <>
      <Banner title={t("about")} subtitle={t("aboutSubtitle")} />
      <EditableOverlay onClick={() => onEditConfig("about_history")} label="编辑历史">
        <HistorySection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("about_mission")} label="编辑使命愿景">
        <MissionVisionSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("about_partnership")} label="编辑合作">
        <PartnershipSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <AboutStatsSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("contact")} label="编辑联系方式">
        <ContactInfoSection />
      </EditableOverlay>
    </>
  )
}

/** 静态页面预览（i18n 管理） */
function StaticPagePreview({ pageKey }: { pageKey: string }) {
  const t = useTranslations("Nav")
  return (
    <div className="px-10 py-16 text-center">
      <h2 className="text-2xl font-bold">{t(pageKey)}</h2>
      <p className="mt-4 text-muted-foreground">
        此页面内容由翻译文件管理，暂不支持后台编辑
      </p>
    </div>
  )
}
```

- [ ] **Step 5: 移除无用导入**

在 `PagePreview.tsx` 中删除不再使用的导入：`ArticleTable`、`CaseTable`、`UniversityTable`、`CategoryTable`。确认没有对 `PreviewNavBar` 的 `PageKey` 类型引用。

- [ ] **Step 6: 验证**

1. 打开 `http://localhost/admin/web-settings`
2. 首页预览：确认 Hero Banner、统计、服务卡片、国家卡片都与真实首页一致
3. 点击"院校选择"导航 → 确认显示真实院校列表（搜索框、卡片、分页）
4. 点击"成功案例"导航 → 确认显示真实案例卡片
5. 点击"新闻政策"导航 → 确认显示真实文章列表（分类标签 + 文章条目）
6. 点击"关于我们"导航 → 确认显示真实关于页面各 section
7. 点击静态页面（签证/生活等）→ 显示"翻译文件管理"提示
8. 数据页面 hover 显示"管理XX"按钮，点击跳转到对应管理页面

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: PagePreview 重写 — 复用真实公开页面组件实现所见即所得"
```

---

### Task 5: 最终验证与清理

**Files:**
- 无新增，检查所有改动

- [ ] **Step 1: 完整流程测试**

在浏览器中完整测试：

1. **SidebarShell**：管理后台和用户中心左右独立滚动
2. **层级**：预览内容不穿透侧边栏
3. **导航栏**：样式与公共网站一致，点击切换预览页面
4. **编辑弹窗**：每个模块弹窗只显示对应字段
5. **数据预览**：院校/案例/新闻渲染真实数据
6. **公共网站**：`http://localhost` 首页、各页面导航正常工作

- [ ] **Step 2: 运行前端 lint 和测试**

```bash
cd frontend && npx eslint components/layout/SidebarShell.tsx components/layout/Header.tsx components/admin/web-settings/ app/\[locale\]/\(admin\)/admin/web-settings/page.tsx
cd frontend && npx vitest run
```

- [ ] **Step 3: 运行 Playwright E2E**

```bash
cd frontend && npx playwright test --config=e2e/playwright.config.ts
```

- [ ] **Step 4: 修复任何失败，最终提交**

```bash
git add -A
git commit -m "fix: 最终清理和修复"
```
