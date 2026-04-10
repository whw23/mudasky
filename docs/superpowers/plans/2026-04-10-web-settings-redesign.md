# 网页设置重构 + Header 改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改版 Header 样式、合并联系我们页面到关于我们、将后台多个管理页面整合为统一的"网页设置"入口

**Architecture:** 前端改动为主。Header 组件拆分为顶栏+导航栏两行结构，断点从 lg 改为 md。联系我们页面删除，ContactInfoPanel 移入关于我们。后台管理侧边栏精简，新建"网页设置"页面以网站预览形式承载所有内容管理。

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui

**Branch:** `feat/web-settings-redesign`（从 `dev` 创建）

---

## File Map

### 新建文件

| 文件 | 职责 |
|------|------|
| `frontend/app/[locale]/(admin)/admin/web-settings/page.tsx` | 网页设置主页面，包含导航切换和页面预览 |
| `frontend/components/admin/web-settings/PagePreview.tsx` | 页面预览容器，渲染选中页面的内容区块 |
| `frontend/components/admin/web-settings/PreviewNavBar.tsx` | 预览用导航栏，点击切换页面 |
| `frontend/components/admin/web-settings/DataSectionOverlay.tsx` | 数据驱动区块的编辑浮层，点击打开管理表格弹窗 |
| `frontend/components/about/ContactInfoSection.tsx` | 关于我们页面的联系方式区块 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `frontend/components/layout/Header.tsx` | 重构为顶栏+导航栏两行结构，断点改 md，导航顺序调整 |
| `frontend/components/layout/Footer.tsx` | QUICK_LINKS 中 contact 改为 about |
| `frontend/components/layout/AdminSidebar.tsx` | 菜单精简为 4 项 |
| `frontend/app/[locale]/(public)/about/page.tsx` | 底部新增联系方式区块 |
| `frontend/messages/zh.json` | 新增 Admin.webSettings 翻译，删除 contact 导航 |
| `frontend/messages/en.json` | 同上 |
| `frontend/messages/ja.json` | 同上 |
| `frontend/messages/de.json` | 同上 |

### 删除文件

| 文件 | 原因 |
|------|------|
| `frontend/app/[locale]/(public)/contact/page.tsx` | 联系我们页面取消 |
| `frontend/app/[locale]/(admin)/admin/articles/page.tsx` | 整合进网页设置 |
| `frontend/app/[locale]/(admin)/admin/cases/page.tsx` | 整合进网页设置 |
| `frontend/app/[locale]/(admin)/admin/categories/page.tsx` | 整合进网页设置 |
| `frontend/app/[locale]/(admin)/admin/universities/page.tsx` | 整合进网页设置 |
| `frontend/app/[locale]/(admin)/admin/settings/page.tsx` | 整合进网页设置 |

---

## Task 1: 创建分支

- [ ] **Step 1: 从 dev 创建新分支**

```bash
cd d:/Code/mudasky
git checkout dev
git checkout -b feat/web-settings-redesign
```

- [ ] **Step 2: 确认分支**

Run: `git branch --show-current`
Expected: `feat/web-settings-redesign`

---

## Task 2: Header 改版 — 导航顺序 + 断点

**Files:**

- Modify: `frontend/components/layout/Header.tsx`
- Modify: `frontend/components/layout/Footer.tsx`

- [ ] **Step 1: 更新 NAV_KEYS 顺序并移除 contact**

打开 `frontend/components/layout/Header.tsx`，将 NAV_KEYS (lines 20-31) 替换为：

```typescript
const NAV_KEYS = [
  { key: "home", href: "/" },
  { key: "universities", href: "/universities" },
  { key: "studyAbroad", href: "/study-abroad" },
  { key: "requirements", href: "/requirements" },
  { key: "cases", href: "/cases" },
  { key: "visa", href: "/visa" },
  { key: "life", href: "/life" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
] as const
```

- [ ] **Step 2: 断点从 lg 改为 md**

在 `Header.tsx` 中全局替换以下 CSS 类：

| 原始 | 替换为 |
|------|--------|
| `lg:hidden` | `md:hidden` |
| `lg:flex` | `md:flex` |
| `lg:inline` | `md:inline` |
| `hidden lg:flex` | `hidden md:flex` |
| `hidden lg:inline` | `hidden md:inline` |

注意：只替换 Header.tsx 中的 `lg:` 断点，不影响其他文件。`md:inline` 保持不变（已经是 md）。

- [ ] **Step 3: Footer QUICK_LINKS 中 contact 改为 about**

打开 `frontend/components/layout/Footer.tsx`，将 QUICK_LINKS (lines 17-23) 中的 contact 项替换：

```typescript
const QUICK_LINKS = [
  { key: "universities", href: "/universities" },
  { key: "studyAbroad", href: "/study-abroad" },
  { key: "cases", href: "/cases" },
  { key: "about", href: "/about" },
] as const
```

- [ ] **Step 4: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功，无错误

- [ ] **Step 5: Commit**

```bash
cd d:/Code/mudasky
git add frontend/components/layout/Header.tsx frontend/components/layout/Footer.tsx
git commit -m "refactor: 调整导航顺序、移除联系我们、断点改为 md"
```

---

## Task 3: Header 改版 — 顶栏 + 导航栏两行结构

**Files:**

- Modify: `frontend/components/layout/Header.tsx`

- [ ] **Step 1: 重构顶栏结构**

将 Header.tsx 中原有的顶部信息栏（大约 lines 86-153）替换为新的两行结构。

顶栏新设计（替换原有 top info bar 部分）：

```tsx
{/* 顶栏：Logo + 品牌名 + 标语 | 热线/用户信息 */}
<div className="hidden md:flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
  <div className="flex items-center gap-3">
    {siteInfo.logo_url ? (
      <Image
        src={siteInfo.logo_url}
        alt={brandName}
        width={44}
        height={44}
        className="rounded-lg"
      />
    ) : (
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white font-extrabold text-xl">
        {brandName.charAt(0)}
      </div>
    )}
    <div>
      <div className="text-[22px] font-extrabold tracking-wide text-foreground">
        {brandName}
      </div>
      <div className="text-xs text-muted-foreground">
        {tagline}
      </div>
    </div>
  </div>
  <div className="flex items-center gap-4 text-sm text-muted-foreground">
    {hotline && (
      <span className="flex items-center gap-1.5">
        <Phone className="size-4 text-primary" />
        <span className="font-semibold text-primary">{hotline}</span>
      </span>
    )}
    {/* 用户信息、语言切换、管理后台入口保持原有逻辑 */}
  </div>
</div>
```

- [ ] **Step 2: 重构移动端顶栏**

移动端一行结构（替换原有移动端 header 部分）：

```tsx
{/* 移动端：Logo + 品牌名 | 电话图标 + 汉堡菜单 */}
<div className="flex md:hidden items-center justify-between px-4 py-3">
  <div className="flex items-center gap-2.5">
    {siteInfo.logo_url ? (
      <Image
        src={siteInfo.logo_url}
        alt={brandName}
        width={36}
        height={36}
        className="rounded-lg"
      />
    ) : (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-extrabold text-base">
        {brandName.charAt(0)}
      </div>
    )}
    <div>
      <div className="text-[17px] font-extrabold text-foreground">{brandName}</div>
      <div className="text-[10px] text-muted-foreground">{tagline}</div>
    </div>
  </div>
  <div className="flex items-center gap-3">
    {hotline && (
      <a
        href={`tel:${hotline.replace(/[^+\d]/g, "")}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5"
      >
        <Phone className="size-4 text-primary" />
      </a>
    )}
    <button
      className="md:hidden p-2 text-foreground/70 hover:text-foreground rounded-full hover:bg-foreground/5 transition-colors"
      onClick={() => setMenuOpen(!menuOpen)}
    >
      {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
  </div>
</div>
```

- [ ] **Step 3: 导航栏独立为纯导航行**

桌面端导航栏（原有导航区域）改为独立区域，不包含品牌名：

```tsx
{/* 桌面端导航栏 - 纯导航链接 */}
<nav className="hidden md:block border-t border-black/[0.04]">
  <div className="flex items-center gap-0.5 px-4 max-w-7xl mx-auto">
    {NAV_KEYS.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive(pathname, item.href)
            ? "text-primary border-b-2 border-primary"
            : "text-foreground/60 hover:text-foreground"
        }`}
      >
        {tNav(item.key)}
      </Link>
    ))}
  </div>
</nav>
```

- [ ] **Step 4: 移动端展开菜单底部加热线**

在移动端菜单列表底部添加热线栏：

```tsx
{/* 移动端菜单底部 - 服务热线 */}
{hotline && (
  <div className="mx-3 mt-2 mb-1 rounded-lg bg-primary/5 px-4 py-2.5 text-sm text-primary flex items-center gap-2">
    <Phone className="size-4" />
    服务热线：{hotline}
  </div>
)}
```

- [ ] **Step 5: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
cd d:/Code/mudasky
git add frontend/components/layout/Header.tsx
git commit -m "feat: Header 改版为顶栏+导航栏两行结构"
```

---

## Task 4: 联系我们合并到关于我们

**Files:**

- Create: `frontend/components/about/ContactInfoSection.tsx`
- Modify: `frontend/app/[locale]/(public)/about/page.tsx`
- Delete: `frontend/app/[locale]/(public)/contact/page.tsx`

- [ ] **Step 1: 创建 ContactInfoSection 组件**

创建 `frontend/components/about/ContactInfoSection.tsx`：

```tsx
"use client"

import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"

/**
 * 关于我们页面的联系方式区块
 * 从 ConfigContext 读取联系信息
 */
export function ContactInfoSection() {
  const t = useTranslations("Contact")
  const { contactInfo } = useLocalizedConfig()

  const items = [
    {
      icon: MapPin,
      label: t("addressLabel"),
      value: contactInfo.address || t("address"),
    },
    {
      icon: Phone,
      label: t("phoneLabel"),
      value: contactInfo.phone || t("phone"),
    },
    {
      icon: Mail,
      label: t("emailLabel"),
      value: contactInfo.email || t("email"),
    },
    {
      icon: MessageCircle,
      label: t("wechatLabel"),
      value: contactInfo.wechat || t("wechat"),
    },
    {
      icon: Clock,
      label: t("hoursLabel"),
      value: contactInfo.office_hours || t("hours"),
    },
  ]

  return (
    <section className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("infoTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg bg-white p-5"
            >
              <item.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-sm text-foreground">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 在关于我们页面底部添加联系方式**

打开 `frontend/app/[locale]/(public)/about/page.tsx`，在 CTA Section 之前添加：

```tsx
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
```

然后在 CTA section（约 line 129）之前插入：

```tsx
{/* 联系方式 */}
<ContactInfoSection />
```

- [ ] **Step 3: 删除联系我们页面**

```bash
rm d:/Code/mudasky/frontend/app/\[locale\]/\(public\)/contact/page.tsx
rmdir d:/Code/mudasky/frontend/app/\[locale\]/\(public\)/contact
```

- [ ] **Step 4: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功，contact 路由不再生成

- [ ] **Step 5: Commit**

```bash
cd d:/Code/mudasky
git add -A
git commit -m "feat: 联系我们页面合并到关于我们，删除 contact 路由"
```

---

## Task 5: i18n 翻译更新

**Files:**

- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: 所有语言文件中 Admin 区域添加 webSettings key**

在每个语言文件的 `"Admin"` 对象中添加：

zh.json:
```json
"webSettings": "网页设置"
```

en.json:
```json
"webSettings": "Web Settings"
```

ja.json:
```json
"webSettings": "ウェブ設定"
```

de.json:
```json
"webSettings": "Web-Einstellungen"
```

- [ ] **Step 2: 删除 Nav.contact 翻译**

在每个语言文件的 `"Nav"` 对象中删除 `"contact"` key。

注意：保留 `"Contact"` 顶级 namespace（ContactInfoSection 仍在使用）。

- [ ] **Step 3: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
cd d:/Code/mudasky
git add frontend/messages/
git commit -m "chore: 更新 i18n 翻译，添加网页设置、移除联系我们导航"
```

---

## Task 6: Admin 侧边栏精简

**Files:**

- Modify: `frontend/components/layout/AdminSidebar.tsx`

- [ ] **Step 1: 更新 MENU_KEYS**

将 `AdminSidebar.tsx` 中 MENU_KEYS (lines 33-42) 替换为：

```typescript
const MENU_KEYS: MenuItem[] = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "userManagement", href: "/admin/users", icon: Users, permissions: ["admin.user.*"] },
  { key: "roleManagement", href: "/admin/roles", icon: Shield, permissions: ["admin.role.*"] },
  { key: "webSettings", href: "/admin/web-settings", icon: Settings, permissions: ["admin.settings.*"] },
]
```

- [ ] **Step 2: 清理无用 icon import**

移除不再使用的 icon imports：`BookOpen`, `Trophy`, `Tag`, `GraduationCap`

保留：`LayoutDashboard`, `Users`, `Shield`, `Settings`

- [ ] **Step 3: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
cd d:/Code/mudasky
git add frontend/components/layout/AdminSidebar.tsx
git commit -m "refactor: Admin 侧边栏精简为 4 项，整合进网页设置"
```

---

## Task 7: 网页设置 — PreviewNavBar 组件

**Files:**

- Create: `frontend/components/admin/web-settings/PreviewNavBar.tsx`

- [ ] **Step 1: 创建预览导航栏组件**

```tsx
"use client"

import { useTranslations } from "next-intl"

/** 页面标识 */
export type PageKey =
  | "home"
  | "universities"
  | "studyAbroad"
  | "requirements"
  | "cases"
  | "visa"
  | "life"
  | "news"
  | "about"

/** 导航项定义 */
const PAGE_KEYS: PageKey[] = [
  "home",
  "universities",
  "studyAbroad",
  "requirements",
  "cases",
  "visa",
  "life",
  "news",
  "about",
]

interface PreviewNavBarProps {
  activePage: PageKey
  onPageChange: (page: PageKey) => void
}

/**
 * 网页设置页面的导航栏
 * 复用公共网站导航样式，点击切换页面预览
 */
export function PreviewNavBar({ activePage, onPageChange }: PreviewNavBarProps) {
  const t = useTranslations("Nav")

  return (
    <nav className="border-t border-b border-black/[0.04] bg-white">
      <div className="flex items-center gap-0.5 overflow-x-auto px-4">
        {PAGE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onPageChange(key)}
            className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors ${
              activePage === key
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/Code/mudasky
git add frontend/components/admin/web-settings/PreviewNavBar.tsx
git commit -m "feat: 创建网页设置预览导航栏组件"
```

---

## Task 8: 网页设置 — DataSectionOverlay 组件

**Files:**

- Create: `frontend/components/admin/web-settings/DataSectionOverlay.tsx`

- [ ] **Step 1: 创建数据区块编辑浮层**

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DataSectionOverlayProps {
  children: React.ReactNode
  label: string
  renderManager: () => React.ReactNode
}

/**
 * 数据驱动区块的编辑浮层
 * hover 显示编辑按钮，点击打开管理表格弹窗
 */
export function DataSectionOverlay({
  children,
  label,
  renderManager,
}: DataSectionOverlayProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="group relative">
        {children}
        <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-transparent transition-colors group-hover:border-blue-400 group-hover:bg-blue-50/30">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto absolute right-2 top-2 rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          >
            ✏️ {label}
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          {renderManager()}
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/Code/mudasky
git add frontend/components/admin/web-settings/DataSectionOverlay.tsx
git commit -m "feat: 创建数据区块编辑浮层组件"
```

---

## Task 9: 网页设置 — PagePreview 组件

**Files:**

- Create: `frontend/components/admin/web-settings/PagePreview.tsx`

- [ ] **Step 1: 创建页面预览容器**

这个组件根据 activePage 渲染对应页面的内容区块。每个区块使用 EditableOverlay 或 DataSectionOverlay 包裹。

```tsx
"use client"

import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { DataSectionOverlay } from "./DataSectionOverlay"
import type { PageKey } from "./PreviewNavBar"

/* 懒加载各管理表格组件 */
import { ArticleTable } from "@/components/admin/ArticleTable"
import { CaseTable } from "@/components/admin/CaseTable"
import { UniversityTable } from "@/components/admin/UniversityTable"
import { CategoryTable } from "@/components/admin/CategoryTable"

/* 懒加载公共页面 Section 组件 */
import { StatsSection } from "@/components/home/StatsSection"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"

interface PagePreviewProps {
  activePage: PageKey
  onEditConfig: (section: string) => void
}

/**
 * 页面预览容器
 * 根据 activePage 渲染对应页面的各区块预览
 */
export function PagePreview({ activePage, onEditConfig }: PagePreviewProps) {
  switch (activePage) {
    case "home":
      return <HomePreview onEditConfig={onEditConfig} />
    case "universities":
      return <UniversitiesPreview />
    case "cases":
      return <CasesPreview />
    case "news":
      return <NewsPreview />
    case "about":
      return <AboutPreview onEditConfig={onEditConfig} />
    default:
      return <StaticPagePreview pageKey={activePage} />
  }
}

/** 首页预览 */
function HomePreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  const t = useTranslations("Home")

  return (
    <div className="pointer-events-none [&_.group]:pointer-events-auto">
      {/* Hero */}
      <EditableOverlay onClick={() => onEditConfig("hero")} label="编辑 Hero">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-10 py-16 text-center text-white">
          <h1 className="text-3xl font-bold">{t("heroTitle")}</h1>
          <p className="mt-3 text-lg opacity-80">{t("heroSubtitle")}</p>
        </div>
      </EditableOverlay>

      {/* 统计数据 */}
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>

      {/* 服务介绍 */}
      <EditableOverlay onClick={() => onEditConfig("services")} label="编辑服务">
        <div className="px-10 py-10 text-center text-muted-foreground">
          {t("servicesTitle")}
        </div>
      </EditableOverlay>
    </div>
  )
}

/** 院校选择预览 */
function UniversitiesPreview() {
  return (
    <DataSectionOverlay label="管理院校" renderManager={() => <UniversityTable />}>
      <div className="px-10 py-16 text-center">
        <h2 className="text-2xl font-bold">合作院校</h2>
        <p className="mt-2 text-muted-foreground">点击编辑按钮管理院校数据</p>
      </div>
    </DataSectionOverlay>
  )
}

/** 成功案例预览 */
function CasesPreview() {
  return (
    <DataSectionOverlay label="管理案例" renderManager={() => <CaseTable />}>
      <div className="px-10 py-16 text-center">
        <h2 className="text-2xl font-bold">成功案例</h2>
        <p className="mt-2 text-muted-foreground">点击编辑按钮管理案例数据</p>
      </div>
    </DataSectionOverlay>
  )
}

/** 新闻政策预览 */
function NewsPreview() {
  return (
    <div>
      <DataSectionOverlay label="管理分类" renderManager={() => <CategoryTable />}>
        <div className="border-b px-10 py-8 text-center">
          <h3 className="text-lg font-semibold">文章分类</h3>
        </div>
      </DataSectionOverlay>
      <DataSectionOverlay label="管理文章" renderManager={() => <ArticleTable />}>
        <div className="px-10 py-16 text-center">
          <h2 className="text-2xl font-bold">新闻政策</h2>
          <p className="mt-2 text-muted-foreground">点击编辑按钮管理文章</p>
        </div>
      </DataSectionOverlay>
    </div>
  )
}

/** 关于我们预览 */
function AboutPreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  return (
    <div className="pointer-events-none [&_.group]:pointer-events-auto">
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
    </div>
  )
}

/** 静态页面预览（留学/签证/生活/申请条件等） */
function StaticPagePreview({ pageKey }: { pageKey: string }) {
  const t = useTranslations("Nav")
  const pageName = t(pageKey)

  return (
    <div className="px-10 py-16 text-center">
      <h2 className="text-2xl font-bold">{pageName}</h2>
      <p className="mt-4 text-muted-foreground">
        此页面内容由 i18n 翻译文件管理，暂不支持后台编辑
      </p>
    </div>
  )
}
```

注意：这是初始版本，各 Preview 组件后续可根据实际公共页面组件逐步丰富。核心骨架先搭好。

- [ ] **Step 2: Commit**

```bash
cd d:/Code/mudasky
git add frontend/components/admin/web-settings/PagePreview.tsx
git commit -m "feat: 创建网页设置页面预览容器组件"
```

---

## Task 10: 网页设置 — 主页面

**Files:**

- Create: `frontend/app/[locale]/(admin)/admin/web-settings/page.tsx`

- [ ] **Step 1: 创建网页设置主页面**

```tsx
"use client"

import { useState, useCallback } from "react"
import { useLocalizedConfig, useConfig } from "@/contexts/ConfigContext"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { PreviewNavBar } from "@/components/admin/web-settings/PreviewNavBar"
import { PagePreview } from "@/components/admin/web-settings/PagePreview"
import { ConfigEditDialog } from "@/components/admin/ConfigEditDialog"
import { CountryCodeEditor } from "@/components/admin/CountryCodeEditor"
import { api } from "@/lib/api"
import type { PageKey } from "@/components/admin/web-settings/PreviewNavBar"

/** 站点信息字段定义 */
const SITE_INFO_FIELDS = [
  { key: "brand_name", label: "品牌名称", type: "text" as const, localized: true },
  { key: "tagline", label: "品牌标语", type: "text" as const, localized: true },
  { key: "hotline", label: "服务热线", type: "text" as const, localized: false },
  { key: "hotline_contact", label: "热线联系人", type: "text" as const, localized: true },
  { key: "logo_url", label: "Logo", type: "image" as const, localized: false },
  { key: "favicon_url", label: "Favicon", type: "image" as const, localized: false },
]

/** 联系方式字段定义 */
const CONTACT_FIELDS = [
  { key: "address", label: "地址", type: "text" as const, localized: true },
  { key: "phone", label: "电话", type: "text" as const, localized: false },
  { key: "email", label: "邮箱", type: "text" as const, localized: false },
  { key: "wechat", label: "微信号", type: "text" as const, localized: false },
  { key: "office_hours", label: "办公时间", type: "text" as const, localized: true },
  { key: "wechat_qr_url", label: "微信二维码", type: "image" as const, localized: false },
  { key: "icp_filing", label: "ICP备案号", type: "text" as const, localized: false },
]

/** 统计数据字段定义 */
const STAT_FIELDS = [
  { key: "value", label: "数值", type: "text" as const, localized: false },
  { key: "label", label: "标签", type: "text" as const, localized: true },
]

interface DialogState {
  open: boolean
  title: string
  fields: Array<{ key: string; label: string; type: "text" | "textarea" | "image"; localized: boolean; rows?: number }>
  configKey: string
  data: Record<string, any>
  customSave?: (data: Record<string, any>) => Promise<void>
}

const INITIAL_DIALOG: DialogState = {
  open: false,
  title: "",
  fields: [],
  configKey: "",
  data: {},
}

/**
 * 网页设置主页面
 * 以网站预览形式呈现，支持所见即所得编辑
 */
export default function WebSettingsPage() {
  const [activePage, setActivePage] = useState<PageKey>("home")
  const [dialog, setDialog] = useState<DialogState>(INITIAL_DIALOG)
  const { siteInfo, contactInfo, homepageStats, aboutInfo } = useConfig()

  /** 打开配置编辑弹窗 */
  const handleEditConfig = useCallback(
    (section: string) => {
      switch (section) {
        case "site_info":
          setDialog({
            open: true,
            title: "编辑站点信息",
            fields: SITE_INFO_FIELDS,
            configKey: "site_info",
            data: siteInfo,
          })
          break
        case "contact":
          setDialog({
            open: true,
            title: "编辑联系方式",
            fields: CONTACT_FIELDS,
            configKey: "contact_info",
            data: contactInfo,
          })
          break
        case "stats":
          setDialog({
            open: true,
            title: "编辑统计数据",
            fields: STAT_FIELDS,
            configKey: "homepage_stats",
            data: homepageStats[0] || {},
          })
          break
        case "about_history":
          setDialog({
            open: true,
            title: "编辑公司历史",
            fields: [{ key: "history", label: "公司历史", type: "textarea", localized: true, rows: 6 }],
            configKey: "about_info",
            data: aboutInfo,
          })
          break
        case "about_mission":
          setDialog({
            open: true,
            title: "编辑使命与愿景",
            fields: [
              { key: "mission", label: "使命", type: "textarea", localized: true, rows: 4 },
              { key: "vision", label: "愿景", type: "textarea", localized: true, rows: 4 },
            ],
            configKey: "about_info",
            data: aboutInfo,
          })
          break
        case "about_partnership":
          setDialog({
            open: true,
            title: "编辑合作机构",
            fields: [{ key: "partnership", label: "合作信息", type: "textarea", localized: true, rows: 6 }],
            configKey: "about_info",
            data: aboutInfo,
          })
          break
        case "wechat_qr":
          setDialog({
            open: true,
            title: "编辑微信二维码",
            fields: [{ key: "wechat_qr_url", label: "二维码图片", type: "image", localized: false }],
            configKey: "site_info",
            data: siteInfo,
          })
          break
        case "icp":
          setDialog({
            open: true,
            title: "编辑ICP备案",
            fields: [{ key: "icp_filing", label: "ICP备案号", type: "text", localized: false }],
            configKey: "site_info",
            data: siteInfo,
          })
          break
      }
    },
    [siteInfo, contactInfo, homepageStats, aboutInfo],
  )

  /** Header 编辑处理 */
  const handleHeaderEdit = useCallback(
    (section: string) => {
      if (section === "site_info") {
        handleEditConfig("site_info")
      }
    },
    [handleEditConfig],
  )

  /** Footer 编辑处理 */
  const handleFooterEdit = useCallback(
    (section: string) => {
      handleEditConfig(section)
    },
    [handleEditConfig],
  )

  /** 保存配置 */
  const handleSave = useCallback(
    async (data: Record<string, any>) => {
      if (dialog.customSave) {
        await dialog.customSave(data)
      } else {
        await api.put(`/admin/config/${dialog.configKey}`, { value: data })
      }
      setDialog(INITIAL_DIALOG)
      // ConfigContext 会自动重新获取
      window.location.reload()
    },
    [dialog],
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">网页设置</h1>

      {/* 网站预览容器 */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {/* Header 预览 */}
        <Header editable onEdit={handleHeaderEdit} />

        {/* 导航栏 */}
        <PreviewNavBar activePage={activePage} onPageChange={setActivePage} />

        {/* 页面内容预览 */}
        <div className="max-h-[60vh] overflow-y-auto">
          <PagePreview activePage={activePage} onEditConfig={handleEditConfig} />
        </div>

        {/* Footer 预览 */}
        <Footer editable onEdit={handleFooterEdit} />
      </div>

      {/* 通用配置 - 国家代码 */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">通用配置</h2>
        <CountryCodeEditor />
      </div>

      {/* 配置编辑弹窗 */}
      <ConfigEditDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog(INITIAL_DIALOG)
        }}
        title={dialog.title}
        fields={dialog.fields}
        data={dialog.data}
        onSave={handleSave}
      />
    </div>
  )
}
```

- [ ] **Step 2: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
cd d:/Code/mudasky
git add frontend/app/\[locale\]/\(admin\)/admin/web-settings/page.tsx
git commit -m "feat: 创建网页设置主页面"
```

---

## Task 11: 删除旧管理页面

**Files:**

- Delete: `frontend/app/[locale]/(admin)/admin/articles/page.tsx`
- Delete: `frontend/app/[locale]/(admin)/admin/cases/page.tsx`
- Delete: `frontend/app/[locale]/(admin)/admin/categories/page.tsx`
- Delete: `frontend/app/[locale]/(admin)/admin/universities/page.tsx`
- Delete: `frontend/app/[locale]/(admin)/admin/settings/page.tsx`

- [ ] **Step 1: 删除旧页面文件**

```bash
cd d:/Code/mudasky/frontend
rm app/\[locale\]/\(admin\)/admin/articles/page.tsx
rm app/\[locale\]/\(admin\)/admin/cases/page.tsx
rm app/\[locale\]/\(admin\)/admin/categories/page.tsx
rm app/\[locale\]/\(admin\)/admin/universities/page.tsx
rm app/\[locale\]/\(admin\)/admin/settings/page.tsx
```

- [ ] **Step 2: 删除空目录**

```bash
rmdir app/\[locale\]/\(admin\)/admin/articles
rmdir app/\[locale\]/\(admin\)/admin/cases
rmdir app/\[locale\]/\(admin\)/admin/categories
rmdir app/\[locale\]/\(admin\)/admin/universities
rmdir app/\[locale\]/\(admin\)/admin/settings
```

- [ ] **Step 3: 验证构建**

```bash
cd d:/Code/mudasky/frontend && pnpm build
```

Expected: 构建成功，旧路由不再生成

- [ ] **Step 4: Commit**

```bash
cd d:/Code/mudasky
git add -A
git commit -m "refactor: 删除旧管理页面，已整合进网页设置"
```

---

## Task 12: 容器重启 + 端到端验证

- [ ] **Step 1: 重启前端容器**

```bash
cd d:/Code/mudasky
docker compose restart frontend
```

- [ ] **Step 2: 验证公共页面**

浏览器检查：
- 首页 Header 是否为两行结构（顶栏+导航栏）
- 导航顺序是否正确（首页/院校/出国/申请/案例/签证/留学/新闻/关于）
- `/contact` 路由是否返回 404
- `/about` 页面底部是否有联系方式区块
- 移动端 Header 是否正确（768px 断点）
- Footer 快捷链接中是否已无"联系我们"

- [ ] **Step 3: 验证后台管理**

浏览器检查：
- 侧边栏是否只有 4 项（仪表盘/用户/角色/网页设置）
- `/admin/web-settings` 页面是否正常渲染
- 导航栏点击是否切换页面预览
- Header/Footer 区块 hover 是否出现编辑按钮
- 院校/案例/文章管理表格是否能在弹窗中打开
- 编辑弹窗保存后是否刷新预览

- [ ] **Step 4: Commit 验证通过标记**

```bash
cd d:/Code/mudasky
git add -A
git commit -m "chore: 网页设置重构验证完成"
```
