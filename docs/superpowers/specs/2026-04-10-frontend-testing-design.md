# 前端测试补全设计

## 背景

当前前端有 98 个可测目标（57 组件、2 hooks、32 页面、5 lib、2 contexts），仅 6 个有测试（覆盖率 6.1%）。需要补全测试以达到 80%+ 覆盖率目标。

## 策略：Vitest + Playwright 混合

| 层级 | 工具 | 职责 |
| ---- | ---- | ---- |
| lib 工具函数 | Vitest | 纯逻辑测试（输入→输出） |
| hooks & contexts | Vitest | 状态管理、副作用、错误处理 |
| UI 组件 | Vitest | variant/props 渲染、className 传递 |
| 业务组件 + 页面 | Playwright | 真实浏览器中验证用户流程 |

开发过程中使用 Chrome DevTools MCP 连接浏览器实时调试验证。

## Batch 1：Vitest — lib 工具函数

### 1.1 `lib/utils.ts` → `tests/lib/utils.test.ts`

- `cn()` 函数：空输入、单类名、多类名合并、Tailwind 冲突解析（如 `p-2` vs `p-4`）、条件类名

### 1.2 `lib/i18n-config.ts` → `tests/lib/i18n-config.test.ts`

- `CONFIG_LOCALES` 常量：包含 zh/en/ja/de
- `getLocalizedValue()`：
  - field 为 undefined → 返回 ""
  - field 为 string → 直接返回（向后兼容）
  - field 为 object → 按 locale 取值
  - field 为 object 但 locale 不存在 → fallback 到 "zh"
  - field 为 object 且 "zh" 也不存在 → 返回 ""
- `createLocalizedField()`：
  - 有值 → zh 填充，其余为空字符串
  - 无值 → 全空字符串

### 1.3 `lib/crypto.ts` → `tests/lib/crypto.test.ts`

- `encryptPassword()`：mock `api.get("/auth/public-key")` 和 `crypto.subtle`
  - 正常流程：获取公钥 → PEM 解析 → RSA 加密 → base64 编码
  - 返回值包含 `encrypted_password` 和 `nonce`
  - API 失败时抛错

### 1.4 `lib/content-api.ts` → `tests/lib/content-api.test.ts`

- mock 全局 `fetch`
- `fetchCategories()`：正常返回、API 失败返回空数组
- `fetchArticles()`：默认参数、自定义分页、分类过滤、API 失败返回空分页
- `fetchArticle()`：正常返回、404 返回 null
- `getCategoryIdBySlug()`：找到 → 返回 id，找不到 → undefined
- `fetchArticlesByCategorySlug()`：串联 slug→id→articles 流程

### 1.5 `lib/api.ts` → `tests/lib/api.test.ts`（已有，补充）

现有测试只覆盖 baseURL 和 withCredentials。补充：

- `setKeepLogin()`：验证 `X-Keep-Login` header 值变化
- 请求拦截器：`X-Requested-With` header 注入
- 响应拦截器：
  - 非 401 错误 → 直接 reject
  - 401 + TOKEN_EXPIRED → 触发 refresh → 重试原请求
  - 并发 401 → 请求排队，refresh 成功后全部重试
  - refresh 失败 → 所有排队请求 reject
  - `_retry` 标记防止无限循环

## Batch 2：Vitest — hooks & contexts

### 2.1 `hooks/use-auth.ts` → `tests/hooks/use-auth.test.ts`

- 在 AuthProvider 内调用 → 返回 context 值
- 在 AuthProvider 外调用 → 抛错 "useAuth 必须在 AuthProvider 内使用"

### 2.2 `contexts/AuthContext.tsx` → `tests/contexts/AuthContext.test.tsx`

- mock `api.get("/users/me")`
- 初始状态：`loading=true`, `user=null`, `isLoggedIn=false`
- mount 后 fetchUser 成功 → `user` 有值，`isLoggedIn=true`，`loading=false`
- mount 后 fetchUser 失败 → `user=null`，`loading=false`
- `logout()` → `user=null`，`isLoggedIn=false`
- `showLoginModal()` / `showRegisterModal()` / `hideAuthModal()` → authModal 状态切换

### 2.3 `contexts/ConfigContext.tsx` → `tests/contexts/ConfigContext.test.tsx`

- mock `api.get` 的 5 个配置端点
- 默认值在 API 响应前生效
- API 返回后更新 state
- API 失败时保持默认值
- `countryCodes` 过滤逻辑：只保留 `enabled: true` 的
- `useConfig()` 返回原始配置
- `useLocalizedConfig()` 返回按 locale 解析后的配置

## Batch 3：Vitest — UI 组件

对 11 个 shadcn/ui 封装组件编写轻量测试，验证 props 透传和 className 合并：

| 组件 | 测试要点 |
| ---- | -------- |
| `button.tsx` | variant/size className、render prop 时 nativeButton=false、data-slot="button" |
| `card.tsx` | Card/CardHeader/CardTitle/CardContent/CardFooter 渲染、className 合并 |
| `checkbox.tsx` | checked/indeterminate 状态、onCheckedChange 回调、data-slot |
| `dialog.tsx` | open/close 切换、DialogTitle/Description 渲染 |
| `input.tsx` | type/placeholder 透传、className 合并、data-slot |
| `label.tsx` | children 渲染、htmlFor 透传 |
| `separator.tsx` | orientation（horizontal/vertical）、className |
| `switch.tsx` | checked 状态、onCheckedChange 回调 |
| `tabs.tsx` | TabsList/TabsTrigger/TabsContent 渲染、切换 |
| `textarea.tsx` | rows/placeholder 透传、className |
| `sonner.tsx` | Toaster 渲染（轻量验证） |

## Batch 4：Playwright — 公开页面 E2E

### 4.1 技术选型

- 测试框架：Playwright Test
- 入口：通过 `http://localhost` 走 gateway 完整链路
- 目录：`frontend/e2e/`

### 4.2 目录结构

```
frontend/e2e/
├── playwright.config.ts     # 配置
├── fixtures/
│   └── base.ts              # 共享 fixtures（登录态等）
├── public/
│   ├── home.spec.ts          # 首页
│   ├── about.spec.ts         # 关于页
│   ├── articles.spec.ts      # 文章列表+详情
│   ├── universities.spec.ts  # 院校列表+搜索
│   ├── cases.spec.ts         # 案例页
│   ├── contact.spec.ts       # 联系页
│   ├── news.spec.ts          # 新闻列表+详情
│   ├── life.spec.ts          # 留学生活
│   ├── visa.spec.ts          # 签证页
│   ├── requirements.spec.ts  # 申请条件
│   └── study-abroad.spec.ts  # 留学页
├── user/
│   ├── auth.spec.ts          # 登录/注册/登出
│   ├── dashboard.spec.ts     # 用户仪表盘
│   ├── profile.spec.ts       # 个人信息/改密码/改手机
│   ├── documents.spec.ts     # 文档上传/列表/删除
│   └── articles.spec.ts      # 我的文章 CRUD
└── admin/
    ├── dashboard.spec.ts     # 管理仪表盘
    ├── users.spec.ts         # 用户管理
    ├── articles.spec.ts      # 文章管理
    ├── categories.spec.ts    # 分类管理
    ├── cases.spec.ts         # 案例管理
    ├── universities.spec.ts  # 院校管理
    ├── roles.spec.ts         # 角色权限管理
    └── settings.spec.ts      # 系统设置
```text

### 4.3 共享 fixtures

```ts
// fixtures/base.ts
import { test as base } from "@playwright/test"

export const test = base.extend<{
  adminPage: Page
  userPage: Page
}>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/")
    // 通过 UI 登录管理员账号
    await page.click("text=登录")
    await page.fill('input[name="phone"]', "mudasky")
    await page.fill('input[type="password"]', "mudasky@12321.")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/admin/**")
    await use(page)
    await context.close()
  },
  userPage: async ({ browser, adminPage }, use) => {
    // 先通过管理后台创建测试用户（或使用已有普通用户）
    // 然后在新 context 中用该用户登录
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/")
    await page.click("text=登录")
    await page.fill('input[name="phone"]', "13800000001")
    await page.fill('input[type="password"]', "Test@12345")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard")
    await use(page)
    await context.close()
  },
})
```

### 4.4 测试覆盖要点

**公开页面**（无需登录）：

- 页面可达（200）
- 核心内容渲染（标题、Banner、列表）
- 导航切换、语言切换
- 分页、搜索（院校页）

**用户流程**：

- 登录 → 进入用户中心
- 个人信息编辑、密码修改
- 文档上传/下载/删除
- 文章创建/编辑/删除
- 登出

**管理后台**：

- 仪表盘统计数据展示
- 用户列表、搜索、编辑、禁用
- 文章/分类/案例/院校 CRUD
- 角色创建、权限树勾选
- 系统设置查看/编辑

### 4.5 运行方式

```bash
# 前置：容器已运行
docker compose up -d

# 运行所有 Playwright 测试
cd frontend && pnpm exec playwright test

# 运行单个模块
pnpm exec playwright test e2e/admin/roles.spec.ts

# 带 UI 模式调试
pnpm exec playwright test --ui
```

## 测试文件总量

| 批次 | 类型 | 文件数 |
| ---- | ---- | ------ |
| Batch 1 | Vitest — lib | 5（其中 1 个补充现有） |
| Batch 2 | Vitest — hooks & contexts | 3 |
| Batch 3 | Vitest — UI 组件 | 11 |
| Batch 4-5 | Playwright — E2E | 19 |
| **合计** | | **38** |

## Mock 策略（Vitest）

| Mock 对象 | 方式 | 使用场景 |
| --------- | ---- | -------- |
| `@/lib/api` | `vi.mock()` + `vi.fn()` | contexts、crypto 等发 API 请求的模块 |
| `fetch` | `vi.stubGlobal("fetch", vi.fn())` | content-api（使用原生 fetch） |
| `crypto.subtle` | `vi.stubGlobal()` | crypto.ts 加密测试 |
| `next-intl` | `vi.mock()` | contexts/ConfigContext 的 useLocale |

Playwright 不需要 mock — 走真实的前后端链路。

## 执行顺序

1. Batch 1（lib）→ 2（hooks/contexts）→ 3（UI 组件）：自底向上，每批完成后运行 `pnpm test` 验证
2. 安装 Playwright + 配置 → Batch 4（公开页面）→ Batch 5（用户/管理后台）
3. 每批完成后用 Chrome DevTools MCP 辅助验证
