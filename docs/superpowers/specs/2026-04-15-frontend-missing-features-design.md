# 前端缺失功能补全设计

**Goal:** 补全前端缺失的页面功能——案例详情页、院校详情页、文章详情页按栏目分流——使所有后端 API 端点都有对应的前端 UI。

**背景:** 后端已实现案例详情、院校详情、文章详情 API，但前端缺少对应的详情页。同时所有文章详情链接都堆在 `/news/{id}`，应按分类分流到各自栏目路由下。

---

## 1. 文章详情页按栏目分流

### 现状

- 5 个分类：新闻政策(news)、留学项目(study-abroad)、申请条件(requirements)、签证办理(visa)、留学生活(life)
- 各栏目页通过 `fetchArticlesByCategorySlug(slug)` 获取对应分类文章
- 但 `ArticleSection` 组件中所有文章链接都指向 `/news/{id}`
- `/news/[id]/page.tsx` 已完整实现文章详情
- `/articles/[id]/page.tsx` 是废弃占位符

### 改动

#### 1.1 抽取共享详情页组件

从 `/news/[id]/page.tsx` 抽取逻辑为共享组件：

**文件:** `frontend/components/content/ArticleDetailPage.tsx`

**Props:**
```typescript
interface ArticleDetailPageProps {
  articleId: string
  backPath: string      // 返回链接路径，如 "/study-abroad"
  bannerTitle: string   // Banner 标题翻译键
  bannerSubtitle: string // Banner 副标题翻译键
}
```

**内容:** 调用 `fetchArticle(id)` → 渲染 Banner + 返回链接 + 文章头（分类标签、日期、标题、摘要）+ ArticleContent + 底部返回链接。

#### 1.2 各栏目创建 `[id]/page.tsx`

| 路由 | 文件路径 | bannerTitle | backPath |
|------|---------|-------------|----------|
| `/study-abroad/[id]` | `app/[locale]/(public)/study-abroad/[id]/page.tsx` | Pages.studyAbroad | /study-abroad |
| `/visa/[id]` | `app/[locale]/(public)/visa/[id]/page.tsx` | Pages.visa | /visa |
| `/life/[id]` | `app/[locale]/(public)/life/[id]/page.tsx` | Pages.life | /life |
| `/requirements/[id]` | `app/[locale]/(public)/requirements/[id]/page.tsx` | Pages.requirements | /requirements |
| `/news/[id]` | 改为使用 `ArticleDetailPage` 组件 | Pages.news | /news |

每个 `[id]/page.tsx` 只做：解析路由参数 → 传给 `ArticleDetailPage`。

#### 1.3 ArticleSection 链接改动

**文件:** `frontend/components/content/ArticleSection.tsx`

- 新增 prop: `basePath: string`
- 链接从 `href={/news/${article.id}}` 改为 `href={${basePath}/${article.id}}`
- 各栏目页调用时传入对应 basePath

#### 1.4 清理

- 删除 `frontend/app/[locale]/(public)/articles/[id]/page.tsx`
- 修正 `ArticleCard.tsx` 中的 `/articles/` 链接（如果该组件仍在使用）

---

## 2. 案例详情页

### API

`GET /api/public/cases/detail/{case_id}` → CaseResponse

**字段:** id, student_name, university, program, year, testimonial, avatar_url, is_featured, sort_order, created_at

### 页面

**文件:** `frontend/app/[locale]/(public)/cases/[id]/page.tsx`

**布局:**
1. `<Banner>` — 标题"成功案例"
2. 返回链接 → `/cases`
3. 案例详情卡片：
   - 头像（`avatar_url`，无则显示首字母占位）
   - 学生姓名 + 年份
   - 录取院校 + 专业
   - 感言引用块（`testimonial`）
4. `<ConsultButton>` — 底部 CTA
5. 底部返回链接

**样式:** 遵循前端设计规范——红色主色调、正式稳重风格。感言使用引号装饰的引用块样式。

### 列表页改动

**文件:** `frontend/app/[locale]/(public)/cases/page.tsx`

案例卡片加 `<Link href={/cases/${case.id}}>` 包裹，hover 时使用现有的卡片上移 + 阴影效果。

---

## 3. 院校详情页

### API

`GET /api/public/universities/detail/{university_id}` → UniversityResponse

**字段:** id, name, name_en, country, province, city, logo_url, description, programs(list), website, is_featured, sort_order, created_at

### 页面

**文件:** `frontend/app/[locale]/(public)/universities/[id]/page.tsx`

**布局:**
1. `<Banner>` — 标题"院校详情"
2. 返回链接 → `/universities`
3. 院校信息区：
   - Logo（`logo_url`，无则显示校名首字母占位）+ 中文校名 + 英文校名
   - 地理信息：国家 / 省份（如有）/ 城市
   - 官网链接（`website`，外链新窗口，带外链图标）
4. 开设专业：`programs` 数组以标签（Badge）形式展示
5. 学校简介：`description` 段落
6. `<ConsultButton>` — 底部 CTA
7. 底部返回链接

**样式:** 标签使用柔和颜色区分，官网链接带外链图标。

### 列表页改动

**文件:** `frontend/components/public/UniversityList.tsx`

院校卡片的校名加 `<Link href={/universities/${uni.id}}>` 包裹，hover 时校名变为主色。

---

## 4. 不在本次范围

- 公开联系表单（后端 API 不存在，需另行设计）
- 文章编辑器改动（属于 admin 功能，已完整实现）

---

## 5. 国际化

所有新增页面文本通过 `useTranslations()` 获取，需要在 `messages/zh.json`、`en.json`、`ja.json`、`de.json` 中添加对应翻译键。

涉及的翻译命名空间：
- `Cases` — 案例详情相关文本（返回列表、录取院校、专业等）
- `Universities` — 院校详情相关文本（返回列表、开设专业、学校简介、官网等）
- `Pages` — 已有的页面标题

---

## 6. 测试

每个新功能需要对应的 E2E 测试（在后续 E2E 计划中覆盖）：
- 案例详情页：加载、数据展示、返回链接、ConsultButton
- 院校详情页：加载、数据展示、专业标签、官网链接、返回链接
- 文章详情分流：各栏目详情页加载、返回到正确栏目
