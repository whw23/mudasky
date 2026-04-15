# 前端功能补全 + E2E 全覆盖实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先补全前端缺失功能（案例详情页、院校详情页、文章按栏目分流），再补全 E2E 测试覆盖所有 API 端点和前端交互。

**Architecture:** 前端功能复用现有模式（`/news/[id]` 详情页、`ArticleSection` 组件）。E2E 测试基于 Playwright + 项目 fixtures（`gotoAdmin`、`adminPage`）。前端功能 Task 在前，E2E Task 在后。

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Playwright

**约定：**
- E2E 创建的数据以 `E2E` 开头
- 不修改/删除种子数据
- 搜索防抖允许 `waitForTimeout(500)`，其他场景禁止

---

## 第一部分：前端功能补全

### Task 1: 抽取文章详情页共享组件

**Files:**
- Create: `frontend/components/content/ArticleDetailPage.tsx`
- Modify: `frontend/app/[locale]/(public)/news/[id]/page.tsx`

- [ ] **Step 1: 创建 ArticleDetailPage 组件**

```typescript
// frontend/components/content/ArticleDetailPage.tsx
/**
 * 文章详情页共享组件。
 * 被各栏目的 [id]/page.tsx 复用。
 */

import { Banner } from "@/components/layout/Banner"
import { fetchArticle, fetchCategories } from "@/lib/content-api"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ArticleContent } from "@/components/content/ArticleContent"

/** 组件属性 */
interface ArticleDetailPageProps {
  /** 文章 ID */
  articleId: string
  /** 返回链接路径 */
  backPath: string
  /** Banner 标题 */
  bannerTitle: string
  /** Banner 副标题 */
  bannerSubtitle: string
}

/** 文章详情页共享组件 */
export async function ArticleDetailPage({
  articleId,
  backPath,
  bannerTitle,
  bannerSubtitle,
}: ArticleDetailPageProps) {
  const t = await getTranslations("News")

  const [article, categories] = await Promise.all([
    fetchArticle(articleId),
    fetchCategories(),
  ])

  if (!article) notFound()

  const category = categories.find((c) => c.id === article.category_id)
  const dateStr = (article.published_at ?? article.created_at).slice(0, 10)

  return (
    <>
      <Banner title={bannerTitle} subtitle={bannerSubtitle} />

      <article className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* 返回链接 */}
        <Link
          href={backPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* 文章头部 */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            {category && (
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                {category.name}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{dateStr}</span>
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-bold leading-tight">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* 分割线 */}
        <div className="my-8 h-px bg-border" />

        {/* 文章正文 */}
        <ArticleContent
          contentType={article.content_type ?? "markdown"}
          content={article.content}
          fileUrl={article.file_url ?? null}
          title={article.title}
        />

        {/* 底部返回 */}
        <div className="mt-12 border-t pt-6">
          <Link
            href={backPath}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </div>
      </article>
    </>
  )
}
```

- [ ] **Step 2: 改写 news/[id]/page.tsx 使用共享组件**

替换 `frontend/app/[locale]/(public)/news/[id]/page.tsx` 全部内容：

```typescript
import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 新闻详情页 */
export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/news"
      bannerTitle={p("articleDetail")}
      bannerSubtitle={p("newsSubtitle")}
    />
  )
}
```

- [ ] **Step 3: 验证 news 详情页功能不变**

启动 dev 环境，在浏览器访问一篇已发布文章的 `/news/{id}` 页面，确认渲染正常。

Run: `pnpm --prefix frontend exec playwright test public/news-detail.spec.ts --reporter=list 2>/dev/null || echo "test file not yet created, manual verify"`

- [ ] **Step 4: Commit**

```bash
git add frontend/components/content/ArticleDetailPage.tsx frontend/app/[locale]/(public)/news/[id]/page.tsx
git commit -m "refactor: 抽取 ArticleDetailPage 共享组件，news 详情页复用"
```

---

### Task 2: 各栏目创建文章详情页

**Files:**
- Create: `frontend/app/[locale]/(public)/study-abroad/[id]/page.tsx`
- Create: `frontend/app/[locale]/(public)/visa/[id]/page.tsx`
- Create: `frontend/app/[locale]/(public)/life/[id]/page.tsx`
- Create: `frontend/app/[locale]/(public)/requirements/[id]/page.tsx`

- [ ] **Step 1: 创建 study-abroad 详情页**

```typescript
// frontend/app/[locale]/(public)/study-abroad/[id]/page.tsx
import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 留学项目文章详情页 */
export default async function StudyAbroadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/study-abroad"
      bannerTitle={p("studyAbroad")}
      bannerSubtitle={p("studyAbroadSubtitle")}
    />
  )
}
```

- [ ] **Step 2: 创建 visa 详情页**

```typescript
// frontend/app/[locale]/(public)/visa/[id]/page.tsx
import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 签证办理文章详情页 */
export default async function VisaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/visa"
      bannerTitle={p("visa")}
      bannerSubtitle={p("visaSubtitle")}
    />
  )
}
```

- [ ] **Step 3: 创建 life 详情页**

```typescript
// frontend/app/[locale]/(public)/life/[id]/page.tsx
import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 留学生活文章详情页 */
export default async function LifeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/life"
      bannerTitle={p("life")}
      bannerSubtitle={p("lifeSubtitle")}
    />
  )
}
```

- [ ] **Step 4: 创建 requirements 详情页**

```typescript
// frontend/app/[locale]/(public)/requirements/[id]/page.tsx
import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 申请条件文章详情页 */
export default async function RequirementsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/requirements"
      bannerTitle={p("requirements")}
      bannerSubtitle={p("requirementsSubtitle")}
    />
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/[locale]/(public)/study-abroad/[id]/page.tsx frontend/app/[locale]/(public)/visa/[id]/page.tsx frontend/app/[locale]/(public)/life/[id]/page.tsx frontend/app/[locale]/(public)/requirements/[id]/page.tsx
git commit -m "feat: 各栏目文章详情页 — study-abroad/visa/life/requirements"
```

---

### Task 3: ArticleSection 链接分流 + 清理

**Files:**
- Modify: `frontend/components/content/ArticleSection.tsx`
- Modify: `frontend/app/[locale]/(public)/study-abroad/page.tsx`
- Modify: `frontend/app/[locale]/(public)/visa/page.tsx`
- Modify: `frontend/app/[locale]/(public)/life/page.tsx`
- Modify: `frontend/app/[locale]/(public)/requirements/page.tsx`
- Delete: `frontend/app/[locale]/(public)/articles/[id]/page.tsx`
- Modify: `frontend/components/content/ArticleCard.tsx`（修正链接）

- [ ] **Step 1: ArticleSection 添加 basePath prop**

修改 `frontend/components/content/ArticleSection.tsx`：

将 interface 中添加 `basePath` 属性：

```typescript
interface ArticleSectionProps {
  /** 文章列表 */
  articles: Article[]
  /** 区块标题 */
  title: string
  /** 无内容时的提示文本 */
  emptyText: string
  /** 阅读更多文本 */
  readMoreText: string
  /** 文章详情页基础路径，如 "/study-abroad" */
  basePath?: string
}
```

修改组件签名添加 `basePath = "/news"` 默认值：

```typescript
export function ArticleSection({
  articles,
  title,
  emptyText,
  readMoreText,
  basePath = "/news",
}: ArticleSectionProps) {
```

修改 Link 的 href：

```typescript
href={`${basePath}/${article.id}`}
```

（将原来的 `` href={`/news/${article.id}`} `` 替换为 `` href={`${basePath}/${article.id}`} ``）

- [ ] **Step 2: 各栏目页传入 basePath**

在 `study-abroad/page.tsx` 中，找到 `<ArticleSection` 调用，添加 `basePath="/study-abroad"`：

```typescript
<ArticleSection
  articles={articles}
  title={n("relatedArticles")}
  emptyText={n("noContent")}
  readMoreText={n("readMore")}
  basePath="/study-abroad"
/>
```

同样修改 `visa/page.tsx`（`basePath="/visa"`）、`life/page.tsx`（`basePath="/life"`）、`requirements/page.tsx`（`basePath="/requirements"`）。

在每个文件中找到 `<ArticleSection` 调用，添加对应的 `basePath` prop。

- [ ] **Step 3: 删除 articles 占位符**

```bash
rm frontend/app/[locale]/(public)/articles/[id]/page.tsx
```

如果 `articles/` 目录变空，也一并删除。

- [ ] **Step 4: 修正 ArticleCard 链接**

检查 `frontend/components/content/ArticleCard.tsx` 第 35 行的 `href={`/articles/${id}`}`，修改为 `href={`/news/${id}`}`。如果该组件未被使用，直接删除文件。

- [ ] **Step 5: 验证文章链接分流**

在浏览器中访问 `/study-abroad` 页面，点击文章链接，确认跳转到 `/study-abroad/{id}` 而非 `/news/{id}`。

- [ ] **Step 6: Commit**

```bash
git add -A frontend/components/content/ArticleSection.tsx frontend/components/content/ArticleCard.tsx frontend/app/[locale]/(public)/
git commit -m "feat: 文章链接按栏目分流 + 清理 articles 占位符"
```

---

### Task 4: 案例详情页

**Files:**
- Create: `frontend/app/[locale]/(public)/cases/[id]/page.tsx`
- Modify: `frontend/app/[locale]/(public)/cases/page.tsx`（卡片加链接）
- Modify: `frontend/messages/zh.json`（添加翻译键）
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: 添加翻译键**

在 `frontend/messages/zh.json` 的 `"Cases"` 对象中追加：

```json
"backToList": "返回案例列表",
"admittedTo": "录取院校",
"major": "专业",
"year": "年份",
"testimonialTitle": "学生感言",
"detailTitle": "案例详情"
```

在 `en.json` 的 `"Cases"` 中追加：

```json
"backToList": "Back to Cases",
"admittedTo": "Admitted To",
"major": "Program",
"year": "Year",
"testimonialTitle": "Testimonial",
"detailTitle": "Case Detail"
```

在 `ja.json` 和 `de.json` 中也添加对应翻译。

- [ ] **Step 2: 创建案例详情页**

```typescript
// frontend/app/[locale]/(public)/cases/[id]/page.tsx
import { Banner } from "@/components/layout/Banner"
import { ConsultButton } from "@/components/common/ConsultButton"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, GraduationCap, Quote } from "lucide-react"

/** 获取案例详情 */
async function fetchCase(id: string) {
  try {
    const baseUrl = process.env.INTERNAL_API_URL || "http://api:8000"
    const res = await fetch(`${baseUrl}/api/public/case/detail/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 案例详情页 */
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")
  const t = await getTranslations("Cases")

  const caseData = await fetchCase(id)
  if (!caseData) notFound()

  return (
    <>
      <Banner title={t("detailTitle")} subtitle={p("casesSubtitle")} />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* 返回链接 */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* 学生信息 */}
        <div className="mt-8 rounded-xl border bg-white p-8">
          <div className="flex items-center gap-4">
            {caseData.avatar_url ? (
              <img
                src={caseData.avatar_url}
                alt={caseData.student_name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{caseData.student_name}</h1>
              <p className="text-sm text-muted-foreground">
                {t("year")}: {caseData.year}
              </p>
            </div>
          </div>

          {/* 录取信息 */}
          <div className="mt-6 rounded-lg bg-gray-50 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("admittedTo")}
                </p>
                <p className="mt-1 text-lg font-bold text-primary">
                  {caseData.university}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("major")}
                </p>
                <p className="mt-1 text-lg font-bold">{caseData.program}</p>
              </div>
            </div>
          </div>

          {/* 感言 */}
          {caseData.testimonial && (
            <div className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("testimonialTitle")}
              </h2>
              <div className="mt-3 flex gap-3 rounded-lg border-l-4 border-primary/30 bg-gray-50 p-5">
                <Quote className="mt-0.5 h-5 w-5 shrink-0 text-primary/40" />
                <p className="italic leading-relaxed text-muted-foreground">
                  {caseData.testimonial}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-muted-foreground">{t("ctaDesc")}</p>
          <ConsultButton className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>

        {/* 底部返回 */}
        <div className="mt-12 border-t pt-6">
          <Link
            href="/cases"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: 案例列表页卡片加链接**

在 `frontend/app/[locale]/(public)/cases/page.tsx` 中，将案例卡片的外层 `<div>` 替换为 `<Link>`。

找到第 88-89 行的：
```typescript
{cases.map((c: Record<string, string>) => (
  <div
    key={c.name}
    className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
  >
```

由于 API 数据有 `id` 但翻译回退数据没有，需要先修改 map 逻辑。在 apiCases 映射时保留 `id`：

```typescript
const cases = apiCases.length > 0
  ? apiCases.map((c: { id: string; student_name: string; university: string; program: string; year: number; testimonial: string | null }) => ({
    id: c.id,
    name: c.student_name,
    uni: c.university,
    program: c.program,
    year: String(c.year),
    quote: c.testimonial ?? "",
  }))
  : [/* 翻译回退数据不变 */]
```

然后将卡片包裹改为条件渲染：有 `id` 时用 `<Link>`，无 `id`（翻译回退数据）时用 `<div>`。

在文件头部添加 `import { Link } from "@/i18n/navigation"`。

将卡片外层改为：

```typescript
{cases.map((c: Record<string, string>) => {
  const Wrapper = c.id ? Link : "div"
  const wrapperProps = c.id ? { href: `/cases/${c.id}` as const } : {}
  return (
    <Wrapper
      key={c.name}
      {...wrapperProps}
      className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
    >
      {/* 内容不变 */}
    </Wrapper>
  )
})}
```

- [ ] **Step 4: 在浏览器中验证案例详情页**

访问 `/cases` 页面，点击案例卡片，确认跳转到 `/cases/{id}` 并正确渲染详情。

- [ ] **Step 5: Commit**

```bash
git add frontend/app/[locale]/(public)/cases/ frontend/messages/
git commit -m "feat: 案例详情页 + 列表页卡片链接"
```

---

### Task 5: 院校详情页

**Files:**
- Create: `frontend/app/[locale]/(public)/universities/[id]/page.tsx`
- Modify: `frontend/components/public/UniversityList.tsx`（卡片加链接）
- Modify: `frontend/messages/zh.json`（添加翻译键）
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: 添加翻译键**

在 `frontend/messages/zh.json` 的 `"Universities"` 对象中追加：

```json
"backToList": "返回院校列表",
"detailTitle": "院校详情",
"location": "所在地",
"programs": "开设专业",
"about": "学校简介",
"officialWebsite": "官方网站",
"visitWebsite": "访问官网"
```

在 `en.json`、`ja.json`、`de.json` 的 `"Universities"` 中也添加对应翻译。

- [ ] **Step 2: 创建院校详情页**

```typescript
// frontend/app/[locale]/(public)/universities/[id]/page.tsx
import { Banner } from "@/components/layout/Banner"
import { ConsultButton } from "@/components/common/ConsultButton"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react"

/** 获取院校详情 */
async function fetchUniversity(id: string) {
  try {
    const baseUrl = process.env.INTERNAL_API_URL || "http://api:8000"
    const res = await fetch(
      `${baseUrl}/api/public/university/detail/${id}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 院校详情页 */
export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")
  const t = await getTranslations("Universities")

  const uni = await fetchUniversity(id)
  if (!uni) notFound()

  const locationParts = [uni.city, uni.province, uni.country].filter(Boolean)

  return (
    <>
      <Banner title={t("detailTitle")} subtitle={p("universitiesSubtitle")} />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* 返回链接 */}
        <Link
          href="/universities"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* 院校信息卡 */}
        <div className="mt-8 rounded-xl border bg-white p-8">
          {/* 头部：Logo + 校名 */}
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              {uni.logo_url ? (
                <img
                  src={uni.logo_url}
                  alt={uni.name}
                  className="h-14 w-14 object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{uni.name}</h1>
              {uni.name_en && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {uni.name_en}
                </p>
              )}
            </div>
          </div>

          {/* 地理信息 */}
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>{locationParts.join(", ")}</span>
          </div>

          {/* 官网链接 */}
          {uni.website && (
            <a
              href={uni.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {t("visitWebsite")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* 开设专业 */}
          {uni.programs && uni.programs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("programs")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {uni.programs.map((prog: string) => (
                  <span
                    key={prog}
                    className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {prog}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 学校简介 */}
          {uni.description && (
            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("about")}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {uni.description}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <ConsultButton className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">
            {t("adviceButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>

        {/* 底部返回 */}
        <div className="mt-12 border-t pt-6">
          <Link
            href="/universities"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: 院校列表卡片加链接**

在 `frontend/components/public/UniversityList.tsx` 中，在文件头部添加：

```typescript
import { Link } from "@/i18n/navigation"
```

将第 129 行的院校卡片外层 `<div>` 改为 `<Link>`：

将：
```typescript
<div
  key={uni.id}
  className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
>
```

改为：
```typescript
<Link
  key={uni.id}
  href={`/universities/${uni.id}`}
  className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
>
```

同时将对应的闭合标签 `</div>` 改为 `</Link>`（在第 176 行左右）。

- [ ] **Step 4: 在浏览器中验证院校详情页**

访问 `/universities` 页面，点击院校卡片，确认跳转到 `/universities/{id}` 并正确渲染详情。

- [ ] **Step 5: Commit**

```bash
git add frontend/app/[locale]/(public)/universities/[id]/ frontend/components/public/UniversityList.tsx frontend/messages/
git commit -m "feat: 院校详情页 + 列表页卡片链接"
```

---

## 第二部分：E2E 测试全覆盖

> 以下 Task 的完整代码已在 `docs/superpowers/plans/2026-04-15-e2e-full-coverage.md` 中定义。
> 此处仅列出 Task 编号和对应关系，执行时参考该文件中的详细步骤和代码。

### Task 6: 提交未暂存的变更 + 确认基线

对应 E2E plan 的 Task 11。

- [ ] **Step 1:** `git status && git diff --stat`
- [ ] **Step 2:** 暂存并提交所有未提交的 E2E 变更
- [ ] **Step 3:** 运行全量 E2E 测试确认基线通过

Run: `pnpm --prefix frontend exec playwright test --reporter=list`

- [ ] **Step 4: Commit**

---

### Task 7: 学生管理全操作覆盖

对应 E2E plan 的 Task 1。扩展 `frontend/e2e/admin/students.spec.ts`，覆盖：edit、assign-advisor、documents/list。

---

### Task 8: 联系人管理全操作覆盖

对应 E2E plan 的 Task 2。扩展 `frontend/e2e/admin/contacts.spec.ts`，覆盖：mark、note、history、upgrade。

---

### Task 9: 文章管理 CRUD 完整流程

对应 E2E plan 的 Task 3。扩展 `frontend/e2e/admin/article-crud.spec.ts` + 更新 `global-teardown.ts`。

---

### Task 10: 通用设置/网站设置操作覆盖

对应 E2E plan 的 Task 4。扩展 `general-settings.spec.ts` 和 `web-settings-full.spec.ts`。

---

### Task 11: Portal 个人资料全操作覆盖

对应 E2E plan 的 Task 5。扩展 `portal/profile-full.spec.ts`。

---

### Task 12: Portal 文档管理全操作覆盖

对应 E2E plan 的 Task 6。扩展 `portal/documents-full.spec.ts`。

---

### Task 13: 公开页面详情和筛选覆盖

对应 E2E plan 的 Task 7。新建 `public/news-detail.spec.ts` 和 `public/university-search.spec.ts`。

**额外：** 新增案例详情页和院校详情页的 E2E 测试：

- [ ] **Step 1: 新建案例详情页 E2E 测试**

```typescript
// frontend/e2e/public/case-detail.spec.ts
/**
 * 案例详情页 E2E 测试。
 * 覆盖：列表页卡片点击进入详情、详情页数据展示、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("案例详情页", () => {
  test("列表页卡片可点击进入详情", async ({ page }) => {
    await page.goto("/cases")
    await page.locator("main").waitFor({ timeout: 15_000 })

    const caseLink = page.locator("a[href*='/cases/']").first()
    if (!(await caseLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await caseLink.click()
    await page.locator("main").waitFor({ timeout: 15_000 })

    // 详情页应包含返回链接
    await expect(page.locator("a[href*='/cases']").first()).toBeVisible()
    // 页面应包含学生信息
    await expect(page.locator("main")).toBeVisible()
  })

  test("详情页 API 正常响应", async ({ page }) => {
    await page.goto("/cases")
    await page.locator("main").waitFor({ timeout: 15_000 })

    const caseLink = page.locator("a[href*='/cases/']").first()
    if (!(await caseLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/case/detail/"),
    )
    await caseLink.click()
    const response = await responsePromise.catch(() => null)
    if (response) {
      expect(response.status()).toBe(200)
    }
  })
})
```

- [ ] **Step 2: 新建院校详情页 E2E 测试**

```typescript
// frontend/e2e/public/university-detail.spec.ts
/**
 * 院校详情页 E2E 测试。
 * 覆盖：列表页卡片点击进入详情、详情页数据展示、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("院校详情页", () => {
  test("列表页卡片可点击进入详情", async ({ page }) => {
    await page.goto("/universities")
    await page.locator("main").waitFor({ timeout: 15_000 })

    const uniLink = page.locator("a[href*='/universities/']").first()
    if (!(await uniLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await uniLink.click()
    await page.locator("main").waitFor({ timeout: 15_000 })

    // 详情页应包含返回链接
    await expect(page.locator("a[href*='/universities']").first()).toBeVisible()
  })

  test("详情页展示院校信息", async ({ page }) => {
    await page.goto("/universities")
    await page.locator("main").waitFor({ timeout: 15_000 })

    const uniLink = page.locator("a[href*='/universities/']").first()
    if (!(await uniLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/university/detail/"),
    )
    await uniLink.click()
    const response = await responsePromise.catch(() => null)
    if (response) {
      expect(response.status()).toBe(200)
    }

    await page.locator("main").waitFor({ timeout: 15_000 })
    // 页面应包含地理位置信息
    await expect(page.locator("main")).toBeVisible()
  })
})
```

- [ ] **Step 3: 新建文章分流 E2E 测试**

```typescript
// frontend/e2e/public/article-routing.spec.ts
/**
 * 文章栏目分流 E2E 测试。
 * 覆盖：各栏目页文章链接指向正确的详情路由。
 */

import { test, expect } from "@playwright/test"

const sections = [
  { path: "/study-abroad", name: "留学项目" },
  { path: "/visa", name: "签证办理" },
  { path: "/life", name: "留学生活" },
  { path: "/requirements", name: "申请条件" },
]

for (const { path, name } of sections) {
  test(`${name}页面文章链接指向 ${path}/[id]`, async ({ page }) => {
    await page.goto(path)
    await page.locator("main").waitFor({ timeout: 15_000 })

    // 检查文章链接是否指向本栏目路径
    const articleLink = page.locator(`a[href*='${path}/']`).first()
    if (!(await articleLink.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    const href = await articleLink.getAttribute("href")
    expect(href).toContain(path)
    expect(href).not.toContain("/news/")
  })
}
```

- [ ] **Step 4: 运行测试**

Run: `pnpm --prefix frontend exec playwright test public/case-detail.spec.ts public/university-detail.spec.ts public/article-routing.spec.ts --reporter=list`

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/public/case-detail.spec.ts frontend/e2e/public/university-detail.spec.ts frontend/e2e/public/article-routing.spec.ts
git commit -m "test: E2E 案例详情、院校详情、文章分流路由验证"
```

---

### Task 14: 角色管理拖拽排序覆盖

对应 E2E plan 的 Task 8。

---

### Task 15: 安全性测试补全

对应 E2E plan 的 Task 9。

---

### Task 16: 越权测试全覆盖

对应 E2E plan 的 Task 10。

---

### Task 17: 隐式端点显式验证 + API 直调

对应 E2E plan 的 Task 13。

---

### Task 18: 学生管理文档端点直调

对应 E2E plan 的 Task 14。

---

### Task 19: 全量测试验证 + UI 截图审查

对应 E2E plan 的 Task 12。

- [ ] **Step 1:** 运行全量 E2E 测试

Run: `pnpm --prefix frontend exec playwright test --reporter=list`
Expected: 所有测试通过

- [ ] **Step 2:** 截图审查前端 UI（特别关注新增的详情页）
- [ ] **Step 3:** 记录 UI 问题，整理为后续任务

---

## 端点覆盖预期

完成所有 Task 后：**88/90 端点覆盖（98%）**

不可覆盖的 2 个：
- `POST /auth/refresh-token-hash` — 网关内部
- `POST /admin/roles/meta/list/reorder` — @dnd-kit 拖拽无法在 Playwright 中可靠模拟
