# 网页设置所见即所得重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将文章/分类/院校/案例管理统一到网页设置的所见即所得预览中，支持导航栏拖动排序和新增文章类导航项。

**Architecture:** 后端将 content/university/case 路由迁移到 config/web-settings 下统一权限管理，新增 nav API；前端删除独立管理页面，在 PagePreview 中直接嵌入增删改交互；官网导航栏改为从 API 读取配置。

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, React, @hello-pangea/dnd (拖拽), Playwright E2E

---

### Task 1: 后端路由迁移 — categories 和 articles

**Files:**
- Create: `backend/api/api/admin/config/web_settings/categories/router.py`
- Create: `backend/api/api/admin/config/web_settings/categories/schemas.py`
- Create: `backend/api/api/admin/config/web_settings/categories/service.py`
- Create: `backend/api/api/admin/config/web_settings/categories/__init__.py`
- Create: `backend/api/api/admin/config/web_settings/articles/router.py`
- Create: `backend/api/api/admin/config/web_settings/articles/schemas.py`
- Create: `backend/api/api/admin/config/web_settings/articles/service.py`
- Create: `backend/api/api/admin/config/web_settings/articles/__init__.py`
- Modify: `backend/api/api/admin/config/router.py` — web_settings_router include 新子路由
- Modify: `backend/api/api/admin/__init__.py` — 移除 content_router
- Delete: `backend/api/api/admin/content/` — 整个目录

- [ ] **Step 1: 创建 categories 子目录**

将 `admin/content/` 中分类相关的 schemas、service、router 代码拆分到 `admin/config/web_settings/categories/` 下。路由前缀从 `/categories` 改为不变（因为已经挂在 web_settings_router 下，最终路径为 `/admin/config/web-settings/categories/...`）。

schemas.py、service.py 内容从 `admin/content/` 中提取分类相关部分，保持不变。router.py 中 APIRouter prefix 改为 `/categories`。

- [ ] **Step 2: 创建 articles 子目录**

同上，将文章相关代码拆分到 `admin/config/web_settings/articles/`。

- [ ] **Step 3: 更新 web_settings_router 挂载**

在 `admin/config/router.py` 中：
```python
from .web_settings.categories import router as ws_categories_router
from .web_settings.articles import router as ws_articles_router

web_settings_router.include_router(ws_categories_router)
web_settings_router.include_router(ws_articles_router)
```

- [ ] **Step 4: 从 admin/__init__.py 移除 content_router**

```python
# 删除这两行:
from .content import router as content_router
router.include_router(content_router)
```

- [ ] **Step 5: 删除 admin/content/ 目录**

- [ ] **Step 6: 验证 API 路径可用**

```bash
curl -s http://localhost:8000/api/admin/config/web-settings/categories/list
curl -s http://localhost:8000/api/admin/config/web-settings/articles/list
```

- [ ] **Step 7: 提交**

```bash
git commit -m "refactor: categories/articles 路由迁移到 web-settings 下"
```

---

### Task 2: 后端路由迁移 — universities 和 cases

**Files:**
- Create: `backend/api/api/admin/config/web_settings/universities/` (router/schemas/service/__init__)
- Create: `backend/api/api/admin/config/web_settings/cases/` (router/schemas/service/__init__)
- Modify: `backend/api/api/admin/config/router.py` — 挂载新子路由
- Modify: `backend/api/api/admin/__init__.py` — 移除 university_router 和 case_router
- Delete: `backend/api/api/admin/university/`
- Delete: `backend/api/api/admin/case/`

- [ ] **Step 1: 迁移 university**

复制 `admin/university/` 的 router/schemas/service 到 `admin/config/web_settings/universities/`。router prefix 改为 `/universities`。

- [ ] **Step 2: 迁移 case**

复制 `admin/case/` 到 `admin/config/web_settings/cases/`。router prefix 改为 `/cases`。

- [ ] **Step 3: 更新挂载和 __init__.py**

web_settings_router 挂载新路由。admin/__init__.py 移除旧引用。

- [ ] **Step 4: 删除旧目录**

- [ ] **Step 5: 验证 API 路径**

```bash
curl -s http://localhost:8000/api/admin/config/web-settings/universities/list
curl -s http://localhost:8000/api/admin/config/web-settings/cases/list
```

- [ ] **Step 6: 提交**

```bash
git commit -m "refactor: universities/cases 路由迁移到 web-settings 下"
```

---

### Task 3: 后端 — 导航栏配置 API

**Files:**
- Create: `backend/api/api/admin/config/web_settings/nav/router.py`
- Create: `backend/api/api/admin/config/web_settings/nav/schemas.py`
- Create: `backend/api/api/admin/config/web_settings/nav/service.py`
- Create: `backend/api/api/admin/config/web_settings/nav/__init__.py`
- Modify: `backend/api/api/admin/config/router.py` — 挂载 nav 路由
- Modify: `backend/api/api/public/config/service.py` — /config/all 包含 nav_config

- [ ] **Step 1: 创建 nav schemas**

```python
# schemas.py
class NavCustomItem(BaseModel):
    slug: str
    name: str | dict  # 多语言
    category_id: str

class NavConfig(BaseModel):
    order: list[str]
    custom_items: list[NavCustomItem] = []

class NavReorderRequest(BaseModel):
    order: list[str]

class NavAddItemRequest(BaseModel):
    slug: str
    name: str | dict
    description: str = ""

class NavRemoveItemRequest(BaseModel):
    slug: str
    delete_content: bool = False  # 是否同时删除分类和文章
```

- [ ] **Step 2: 创建 nav service**

从 config 表读写 `nav_config` key。add_item 时创建 category 并更新 nav_config。remove_item 时可选删除 category 及其文章。

- [ ] **Step 3: 创建 nav router**

端点：
- `GET /nav/list` — 获取 nav_config
- `POST /nav/reorder` — 更新排序
- `POST /nav/add-item` — 新增导航项
- `POST /nav/remove-item` — 删除导航项

- [ ] **Step 4: 挂载到 web_settings_router**

- [ ] **Step 5: 公开接口 — 在 /config/all 中包含 nav_config**

在 `public/config/service.py` 的 `get_all_homepage_config` 中新增 `nav_config` key。

- [ ] **Step 6: 初始化种子数据**

在 `db/init.sql` 或 `seed_config.py` 中插入默认的 nav_config：

```json
{
  "order": ["home", "universities", "study-abroad", "requirements", "cases", "visa", "life", "news", "about"],
  "custom_items": []
}
```

- [ ] **Step 7: 提交**

```bash
git commit -m "feat: 导航栏配置 API（排序/新增/删除）"
```

---

### Task 4: 前端 — 侧边栏清理 + 页面删除

**Files:**
- Modify: `frontend/components/layout/AdminSidebar.tsx` — 删除 4 个菜单项
- Delete: `frontend/app/[locale]/[panel]/articles/page.tsx`
- Delete: `frontend/app/[locale]/[panel]/categories/page.tsx`
- Delete: `frontend/app/[locale]/[panel]/universities/page.tsx`
- Delete: `frontend/app/[locale]/[panel]/cases/page.tsx`
- Delete: 对应的表格组件（ArticleTable、CategoryTable、UniversityTable、CaseTable）

- [ ] **Step 1: AdminSidebar.tsx 删除 4 个菜单项**

从 `MENU_KEYS` 数组中删除：
- `articleManagement` (href="/admin/articles")
- `categoryManagement` (href="/admin/categories")
- `universityManagement` (href="/admin/universities")
- `caseManagement` (href="/admin/cases")

- [ ] **Step 2: 删除前端页面文件**

删除 4 个 page.tsx 和对应的表格组件。保留编辑 Dialog 组件（CategoryDialog、ArticleDialog 等）供网页设置复用。

- [ ] **Step 3: 清理翻译文件中对应的菜单项文本**

各语言的 `messages/*.json` 中 AdminSidebar namespace 下的 `articleManagement`、`categoryManagement`、`universityManagement`、`caseManagement` 可保留（不影响功能）或删除。

- [ ] **Step 4: 提交**

```bash
git commit -m "refactor: 删除独立管理页面，功能移入网页设置"
```

---

### Task 5: 前端 — 导航栏拖动排序

**Files:**
- Modify: `frontend/components/layout/Header.tsx` — editable 模式下支持拖动
- Create: `frontend/components/admin/web-settings/NavEditor.tsx` — 拖动排序 + 增删 UI
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx` — 集成 NavEditor

- [ ] **Step 1: 安装拖拽库**

```bash
pnpm --prefix frontend add @hello-pangea/dnd
```

- [ ] **Step 2: 创建 NavEditor 组件**

导航栏编辑器组件：
- 从 API 获取 nav_config
- 用 `DragDropContext` + `Droppable` + `Draggable` 实现拖动排序
- 每个预设项显示拖动手柄 + 名称（不可删除）
- 每个自定义项额外显示删除按钮
- 底部 "+" 按钮新增文章类导航项
- 点击某项触发 `onPageChange` 切换预览
- 排序变化时调用 `POST /nav/reorder` API

- [ ] **Step 3: 在 web-settings 页面中替换 Header 导航栏**

替换当前 Header 的导航栏部分为 NavEditor（仅 editable 模式下）。或者在 Header 上方单独渲染 NavEditor 作为导航栏编辑区域。

- [ ] **Step 4: 新增导航项弹窗**

点击 "+" 按钮弹出 Dialog：输入名称（多语言）和 slug。提交时调用 `POST /nav/add-item`。

- [ ] **Step 5: 删除导航项确认弹窗**

点击自定义项的删除按钮，弹出确认 Dialog：是否同时删除该分类下的文章。调用 `POST /nav/remove-item`。

- [ ] **Step 6: 提交**

```bash
git commit -m "feat: 网页设置导航栏拖动排序 + 增删"
```

---

### Task 6: 前端 — 文章类页面预览组件

**Files:**
- Create: `frontend/components/admin/web-settings/ArticleListPreview.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx` — 文章类页面走 ArticleListPreview

- [ ] **Step 1: 创建 ArticleListPreview 组件**

Props: `categorySlug: string`

功能：
- 从 API 获取该 category 的文章列表（`GET /admin/config/web-settings/articles/list?category_slug=xxx`）
- 渲染 Banner + 文章卡片列表（只显示本分类，无跨分类 tab）
- 每个文章卡片用 EditableOverlay 包裹，hover 显示"编辑"/"删除"按钮
- 顶部"写文章"按钮
- 点击"编辑" → 打开 ArticleEditDialog（复用现有组件）
- 点击"删除" → AlertDialog 确认后调用 DELETE API
- 点击"写文章" → 打开空白 ArticleEditDialog，category 自动绑定

- [ ] **Step 2: 修改 PagePreview.tsx**

将 `NewsPagePreview` 和 `StaticPagePreview`（出国留学/申请条件等）改为统一使用 `ArticleListPreview`：

```typescript
switch (activePage) {
  case "home": return <HomePreview ... />
  case "universities": return <UniversitiesEditPreview />
  case "cases": return <CasesEditPreview />
  case "about": return <AboutPreview ... />
  default: {
    // 文章类页面（预设 + 自定义）
    return <ArticleListPreview categorySlug={activePage} />
  }
}
```

- [ ] **Step 3: 删除 StaticPagePreview、NewsPagePreview**

这两个组件不再需要。

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: 文章类页面在预览中直接编辑"
```

---

### Task 7: 前端 — 院校和案例预览组件

**Files:**
- Create: `frontend/components/admin/web-settings/UniversitiesEditPreview.tsx`
- Create: `frontend/components/admin/web-settings/CasesEditPreview.tsx`
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx` — 替换旧预览

- [ ] **Step 1: 创建 UniversitiesEditPreview**

替换现有的 `UniversitiesPreview`（只有 DataSectionOverlay 跳转链接）。

功能：
- 从 API 获取院校列表（`GET /admin/config/web-settings/universities/list`）
- 渲染 Banner + 搜索框 + 院校卡片网格
- 每个院校卡片用 EditableOverlay 包裹
- 点击"编辑" → 打开 UniversityDialog（复用现有组件）
- 点击"删除" → AlertDialog 确认
- "添加院校"按钮 → 打开空白 UniversityDialog

- [ ] **Step 2: 创建 CasesEditPreview**

同上模式，案例的编辑/删除/添加。

- [ ] **Step 3: 在 PagePreview 中替换**

替换 `UniversitiesPreview` → `UniversitiesEditPreview`，`CasesPagePreview` → `CasesEditPreview`。删除 `DataSectionOverlay` 组件（不再需要）。

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: 院校/案例在预览中直接编辑"
```

---

### Task 8: 前端 — 官网导航栏动态化

**Files:**
- Modify: `frontend/components/layout/Header.tsx` — NAV_KEYS 改为从 API 读取
- Modify: `frontend/contexts/ConfigContext.tsx` — 存储 nav_config

- [ ] **Step 1: 在 /config/all 响应中包含 nav_config**

ConfigProvider 解析 `data.nav_config` 并存入 context。

- [ ] **Step 2: Header.tsx 导航栏动态渲染**

移除硬编码的 `NAV_KEYS` 常量。改为从 config context 读取 `nav_config.order`，按顺序渲染：
- 预设项：名称从翻译文件读（`tNav(key)`）
- 自定义项：名称从 `nav_config.custom_items` 中匹配读取
- 路径：预设项用固定映射，自定义项用 `/{slug}`

- [ ] **Step 3: 移动端菜单同步更新**

移动端展开菜单也用相同的动态导航列表。

- [ ] **Step 4: 提交**

```bash
git commit -m "feat: 官网导航栏从 API 动态渲染"
```

---

### Task 9: 前端 — API 路径更新

**Files:**
- 全局搜索替换所有前端代码中旧 API 路径

- [ ] **Step 1: 批量替换 API 路径**

```
/admin/content/categories  → /admin/config/web-settings/categories
/admin/content/articles    → /admin/config/web-settings/articles
/admin/universities        → /admin/config/web-settings/universities
/admin/cases               → /admin/config/web-settings/cases
```

涉及文件：所有编辑 Dialog 组件、网页设置页面、ConfigContext 等。

- [ ] **Step 2: 更新权限码引用**

侧边栏权限、E2E 测试中的权限检查路径同步更新。

- [ ] **Step 3: 提交**

```bash
git commit -m "refactor: 前端 API 路径对齐后端迁移"
```

---

### Task 10: E2E 测试适配 + 验证

**Files:**
- Modify: `frontend/e2e/w1/tasks.ts` — CRUD 任务的 API 路径和覆盖率声明更新
- Modify: `frontend/e2e/w5/tasks.ts` — 同上
- Modify: `frontend/e2e/fns/admin-crud.ts` — 页面导航路径更新
- Modify: E2E 覆盖率清单文件
- Modify: `frontend/e2e/global-setup.ts` — 预热路由更新

- [ ] **Step 1: 更新 E2E fn 中的页面路径**

`admin-crud.ts` 中 `page.goto("/admin/categories")` 等改为网页设置的导航操作：

```typescript
// 旧：直接导航到管理页面
await page.goto("/admin/categories")

// 新：导航到网页设置 → 点击对应导航项
await page.goto("/admin/web-settings")
// 操作预览中的内容
```

- [ ] **Step 2: 更新 tasks.ts 中的 coverage 声明**

API 端点路径更新：
```
/admin/categories/list → /admin/config/web-settings/categories/list
```

- [ ] **Step 3: 更新覆盖率清单文件**

- [ ] **Step 4: 全量 E2E 验证**

```bash
pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
```

预期：184 pass，四维度 100%。

- [ ] **Step 5: 提交**

```bash
git commit -m "test: E2E 适配网页设置重构"
```
