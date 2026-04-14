# 前端面板 API 路径对齐设计

## 背景

后端已完成两轮重构：分层架构 + 权限层级统一。URL 路径全部静态化、层级化（`/list/detail/edit`），ID 不在 URL 中（GET 用 query param，POST 用 body）。前端 API 调用路径仍为旧格式，需全面对齐。

## 目标

1. 前端所有 API 调用路径与后端完全对齐
2. 统一使用 `usePathname()/{action}` 模式推导 API 路径
3. 新增 admin/students、admin/contacts 页面（表格 + 展开面板）
4. 更新 permission-config、sidebar、PanelGuard 等配套设施
5. 更新类型定义匹配后端响应结构

## 核心规则

### usePathname() 推导 API 路径

`usePathname()`（from `@/i18n/navigation`）返回不含 locale 前缀的路径，如 `/admin/categories`。组件拼接 action 后缀即为 API 路径：

```typescript
const pathname = usePathname() // "/admin/categories"
api.get(`${pathname}/list`)                          // GET /admin/categories/list
api.post(`${pathname}/list/create`, body)             // POST /admin/categories/list/create
api.post(`${pathname}/list/detail/edit`, { category_id, ...body })  // POST
api.post(`${pathname}/list/detail/delete`, { category_id })         // POST
```

### 特殊路径映射

部分页面路径与 API 路径不完全 1:1：

| 前端页面路径 | API 调用规则 | 原因 |
|---|---|---|
| `/admin/roles` | `${pathname}/meta/list` 等 | 有附属数据（权限树） |
| `/portal/profile` | `${pathname}/meta/list` 等 | 有附属数据 |
| `/admin/dashboard` | 聚合多个接口 | 仪表盘特殊 |
| 其他页面 | `${pathname}/list` 等 | 直接对应 |

### ID 传递规则

- **GET 请求**：ID 通过 query param（如 `?user_id=xxx`）
- **POST 请求**：ID 通过 body（如 `{ user_id: "xxx", ... }`）
- **字段名**：资源特定（`user_id`、`role_id`、`case_id`、`category_id`、`article_id`、`university_id`、`doc_id`、`token_id`）

## 后端端点完整覆盖矩阵

前端功能必须完全覆盖所有后端接口（内部接口除外）。以下为 84 个端点的覆盖状态。

### auth（7 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /auth/public-key` | crypto.ts（登录加密） | 已覆盖，路径不变 |
| `POST /auth/sms-code` | SmsCodeButton | 已覆盖，路径不变 |
| `POST /auth/register` | RegisterModal | 已覆盖，路径不变 |
| `POST /auth/login` | LoginModal | 已覆盖，路径不变 |
| `POST /auth/refresh-token-hash` | — | 内部端点，后端自调用，不需要前端覆盖 |
| `POST /auth/logout` | AuthContext | 已覆盖，路径不变 |
| `POST /auth/refresh` | api.ts 拦截器 | 已覆盖，路径不变 |

### public（15 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /public/config/{key}` | ConfigContext | 已覆盖，路径不变 |
| `GET /public/panel-config` | ConfigContext | 已覆盖，路径不变 |
| `GET /public/content/articles` | content-api.ts / NewsPreview | 已覆盖，路径不变 |
| `GET /public/content/article/{article_id}` | content-api.ts | 已覆盖，路径不变 |
| `GET /public/content/categories` | content-api.ts / NewsPreview | 已覆盖，路径不变 |
| `GET /public/cases/list` | CasesPreview | **需修正**：旧路径 `/public/case/list` |
| `GET /public/cases/detail/{case_id}` | 公开案例详情页 | 需确认公开页面覆盖 |
| `GET /public/universities/list` | 公开院校页面 | 需确认公开页面覆盖 |
| `GET /public/universities/countries` | 公开院校筛选 | 需确认公开页面覆盖 |
| `GET /public/universities/provinces` | 公开院校筛选 | 需确认公开页面覆盖 |
| `GET /public/universities/cities` | 公开院校筛选 | 需确认公开页面覆盖 |
| `GET /public/universities/detail/{university_id}` | 公开院校详情页 | 需确认公开页面覆盖 |

### admin/users（7 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/users/list` | UserTable | **需修正路径** |
| `GET /admin/users/list/detail` | UserExpandPanel | **需修正**：旧路径 `/admin/users/detail/${id}`，改为 query param |
| `POST /admin/users/list/detail/edit` | UserExpandPanel | **需修正**：旧路径含 ID |
| `POST /admin/users/list/detail/reset-password` | UserExpandPanel | **需修正**：旧路径含 ID |
| `POST /admin/users/list/detail/assign-role` | UserExpandPanel | **需修正**：旧路径含 ID |
| `POST /admin/users/list/detail/force-logout` | UserExpandPanel | **需修正**：旧路径含 ID |
| `POST /admin/users/list/detail/delete` | UserExpandPanel | **需修正**：旧路径含 ID |

### admin/roles（7 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/roles/meta` | RoleDialog（权限树） | **需修正**：旧路径 `/admin/roles/permissions` |
| `GET /admin/roles/meta/list` | RoleList | **需修正**：旧路径 `/admin/roles/list` |
| `POST /admin/roles/meta/list/create` | RoleDialog | **需修正**：旧路径 `/admin/roles/create` |
| `POST /admin/roles/meta/list/reorder` | RoleList | **需修正**：旧路径 `/admin/roles/reorder` |
| `GET /admin/roles/meta/list/detail` | RoleDialog | **需新增**：编辑时应获取角色详情 |
| `POST /admin/roles/meta/list/detail/edit` | RoleDialog | **需修正**：旧路径 `/admin/roles/edit/${id}` |
| `POST /admin/roles/meta/list/detail/delete` | RoleList | **需修正**：旧路径 `/admin/roles/delete/${id}` |

### admin/config（4 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/general-settings/list` | general-settings page | 已覆盖，路径不变 |
| `POST /admin/general-settings/list/edit` | general-settings page / CountryCodeEditor | **需修正**：旧路径含 key |
| `GET /admin/web-settings/list` | web-settings page | 已覆盖，路径不变 |
| `POST /admin/web-settings/list/edit` | web-settings page | **需修正**：旧路径含 key |

### admin/content（8 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/categories/list` | CategoryTable | 已覆盖（用 `${pathname}/list`） |
| `POST /admin/categories/list/create` | CategoryDialog | **需修正**：`${pathname}/create` → `${pathname}/list/create` |
| `POST /admin/categories/list/detail/edit` | CategoryDialog | **需修正**：路径 + body |
| `POST /admin/categories/list/detail/delete` | CategoryTable | **需修正**：路径 + body |
| `GET /admin/articles/list` | ArticleTable | **需修正**：旧路径 `/admin/content/list` |
| `POST /admin/articles/list/create` | ArticleTable | **需修正**：旧路径 |
| `POST /admin/articles/list/detail/edit` | ArticleTable | **需修正**：旧路径 `/admin/content/edit/${id}` |
| `POST /admin/articles/list/detail/delete` | ArticleTable | **需修正**：旧路径 `/admin/content/delete/${id}` |

### admin/cases（4 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/cases/list` | CaseTable | 已覆盖（用 `${pathname}/list`） |
| `POST /admin/cases/list/create` | CaseDialog | **需修正**：`${pathname}/create` → `${pathname}/list/create` |
| `POST /admin/cases/list/detail/edit` | CaseTable / CaseDialog | **需修正**：路径 + body |
| `POST /admin/cases/list/detail/delete` | CaseTable | **需修正**：路径 + body |

### admin/universities（4 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/universities/list` | UniversityTable | 已覆盖（用 `${pathname}/list`） |
| `POST /admin/universities/list/create` | UniversityDialog | **需修正**：`${pathname}/create` → `${pathname}/list/create` |
| `POST /admin/universities/list/detail/edit` | UniversityDialog | **需修正**：路径 + body |
| `POST /admin/universities/list/detail/delete` | UniversityTable | **需修正**：路径 + body |

### admin/students（8 个端点）— 全部新增

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/students/list` | StudentTable | **新增** |
| `GET /admin/students/list/detail` | StudentExpandPanel | **新增** |
| `POST /admin/students/list/detail/edit` | StudentExpandPanel | **新增** |
| `POST /admin/students/list/detail/assign-advisor` | StudentExpandPanel | **新增** |
| `POST /admin/students/list/detail/downgrade` | StudentExpandPanel | **新增** |
| `GET /admin/students/list/detail/documents/list` | StudentExpandPanel | **新增** |
| `GET /admin/students/list/detail/documents/list/detail` | StudentExpandPanel | **新增** |
| `GET /admin/students/list/detail/documents/list/detail/download` | StudentExpandPanel | **新增** |

### admin/contacts（6 个端点）— 全部新增

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /admin/contacts/list` | ContactTable | **新增** |
| `GET /admin/contacts/list/detail` | ContactExpandPanel | **新增** |
| `POST /admin/contacts/list/detail/mark` | ContactExpandPanel | **新增** |
| `POST /admin/contacts/list/detail/note` | ContactExpandPanel | **新增** |
| `GET /admin/contacts/list/detail/history` | ContactExpandPanel | **新增** |
| `POST /admin/contacts/list/detail/upgrade` | ContactExpandPanel | **新增** |

### portal/profile（6 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /portal/profile/meta` | ProfileInfo | **需新增**：前置数据获取 |
| `GET /portal/profile/meta/list` | AuthContext / ProfileInfo | **需修正**：旧路径 `/portal/profile/view` |
| `POST /portal/profile/meta/list/edit` | ProfileInfo | **需修正**：旧路径 `/portal/profile/edit` |
| `POST /portal/profile/password` | ProfileInfo / ChangePassword | 已覆盖，路径不变 |
| `POST /portal/profile/phone` | ProfileInfo / ChangePhone | 已覆盖，路径不变 |
| `POST /portal/profile/delete-account` | ProfileInfo | 已覆盖，路径不变 |

### portal/sessions（3 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /portal/profile/sessions/list` | SessionManagement | **需修正**：旧路径 `/portal/profile/sessions` |
| `POST /portal/profile/sessions/list/revoke` | SessionManagement | **需修正**：旧路径含 ID |
| `POST /portal/profile/sessions/list/revoke-all` | SessionManagement | **需修正**：旧路径缺 `/list` |

### portal/two-factor（4 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `POST /portal/profile/two-factor/enable-totp` | ProfileInfo / TwoFactorSettings | **需修正**：旧路径 `2fa-enable-totp` |
| `POST /portal/profile/two-factor/confirm-totp` | ProfileInfo / TwoFactorSettings | **需修正**：旧路径 `2fa-confirm-totp` |
| `POST /portal/profile/two-factor/enable-sms` | ProfileInfo | **需修正**：旧路径 `2fa-enable-sms` |
| `POST /portal/profile/two-factor/disable` | ProfileInfo / TwoFactorSettings | **需修正**：旧路径 `2fa-disable` |

### portal/documents（5 个端点）

| 端点 | 前端组件 | 状态 |
|---|---|---|
| `GET /portal/documents/list` | DocumentList / overview page | 已覆盖，路径不变 |
| `POST /portal/documents/list/upload` | DocumentUpload | **需修正**：旧路径 `/portal/documents/upload` |
| `GET /portal/documents/list/detail` | DocumentList | **需新增**：文档详情查看 |
| `GET /portal/documents/list/detail/download` | DocumentList | **需修正**：旧路径用 window.open |
| `POST /portal/documents/list/detail/delete` | DocumentList | **需修正**：旧路径含 ID |

### 覆盖统计

| 类别 | 总数 | 已覆盖 | 需修正 | 需新增 | 不需要 |
|---|---|---|---|---|---|
| auth | 7 | 6 | 0 | 0 | 1（内部） |
| public | 15 | 5 | 1 | 0 | 9（公开页面本次不改） |
| admin | 48 | 4 | 24 | 16 | 0 |
| portal | 18 | 3 | 11 | 2 | 0 |
| **合计** | **84** | **18** | **36** | **18** | **10** |

> 注：public 面板的 9 个端点由公开页面（SSR/content-api）覆盖，本次改造聚焦 admin/portal 面板，公开页面路径如有不一致（如 CasesPreview）一并修正。

## 变更清单

### 1. API 路径对齐（已有组件）

#### admin 面板

| 组件 | 旧 API 路径 | 新 API 路径 |
|---|---|---|
| **UserTable** | `GET /admin/users/list` | `GET /admin/users/list`（不变） |
| **UserExpandPanel** | `POST /admin/users/edit/${userId}` | `POST /admin/users/list/detail/edit` body: `{ user_id }` |
| | `POST /admin/users/assign-role/${userId}` | `POST /admin/users/list/detail/assign-role` body: `{ user_id, role_id }` |
| | `POST /admin/users/reset-password/${userId}` | `POST /admin/users/list/detail/reset-password` body: `{ user_id, ... }` |
| | `POST /admin/users/force-logout/${userId}` | `POST /admin/users/list/detail/force-logout` body: `{ user_id }` |
| | `POST /admin/users/delete/${userId}` | `POST /admin/users/list/detail/delete` body: `{ user_id }` |
| **UserExpandPanel** | `GET /admin/users/detail/${userId}` | `GET /admin/users/list/detail?user_id=xxx` |
| **CategoryTable** | `POST ${pathname}/delete/${id}` | `POST ${pathname}/list/detail/delete` body: `{ category_id }` |
| **CategoryDialog** | `POST ${pathname}/edit/${id}` | `POST ${pathname}/list/detail/edit` body: `{ category_id, ... }` |
| | `POST ${pathname}/create` | `POST ${pathname}/list/create` |
| **ArticleTable** | `POST /admin/content/edit/${id}` | `POST /admin/articles/list/detail/edit` body: `{ article_id, ... }` |
| | `POST /admin/content/delete/${id}` | `POST /admin/articles/list/detail/delete` body: `{ article_id }` |
| **CaseTable** | `POST ${pathname}/edit/${id}` | `POST ${pathname}/list/detail/edit` body: `{ case_id, ... }` |
| | `POST ${pathname}/delete/${id}` | `POST ${pathname}/list/detail/delete` body: `{ case_id }` |
| **CaseDialog** | `POST ${pathname}/edit/${id}` | `POST ${pathname}/list/detail/edit` body: `{ case_id, ... }` |
| | `POST ${pathname}/create` | `POST ${pathname}/list/create` |
| **UniversityTable** | `POST ${pathname}/delete/${id}` | `POST ${pathname}/list/detail/delete` body: `{ university_id }` |
| **UniversityDialog** | `POST ${pathname}/edit/${id}` | `POST ${pathname}/list/detail/edit` body: `{ university_id, ... }` |
| | `POST ${pathname}/create` | `POST ${pathname}/list/create` |
| **RoleDialog** | `POST /admin/roles/edit/${id}` | `POST /admin/roles/meta/list/detail/edit` body: `{ role_id, ... }` |
| | `POST /admin/roles/create` | `POST /admin/roles/meta/list/create` |
| **RoleList** | `POST /admin/roles/reorder` | `POST /admin/roles/meta/list/reorder` |
| | `POST /admin/roles/delete/${id}` | `POST /admin/roles/meta/list/detail/delete` body: `{ role_id }` |
| **CountryCodeEditor** | `POST /admin/general-settings/edit/phone_country_codes` | `POST /admin/general-settings/list/edit` body: `{ key: "phone_country_codes", value }` |
| **general-settings page** | `GET /admin/general-settings/list` | 不变 |
| | `POST /admin/general-settings/edit/site_info` | `POST /admin/general-settings/list/edit` body: `{ key: "site_info", value }` |
| **web-settings page** | `GET /admin/web-settings/list` | 不变 |
| | `POST /admin/web-settings/edit/${key}` | `POST /admin/web-settings/list/edit` body: `{ key, value }` |
| **dashboard page** | `GET /admin/content/list` | `GET /admin/articles/list` |

#### portal 面板

| 组件 | 旧 API 路径 | 新 API 路径 |
|---|---|---|
| **AuthContext** | `GET /portal/profile/view` | `GET /portal/profile/meta/list` |
| **ProfileInfo** | `POST /portal/profile/edit` | `POST /portal/profile/meta/list/edit` |
| | `POST /portal/profile/password` | `POST /portal/profile/password`（不变） |
| | `POST /portal/profile/phone` | `POST /portal/profile/phone`（不变） |
| | `POST /portal/profile/delete-account` | `POST /portal/profile/delete-account`（不变） |
| | `POST /portal/profile/2fa-enable-totp` | `POST /portal/profile/two-factor/enable-totp` |
| | `POST /portal/profile/2fa-confirm-totp` | `POST /portal/profile/two-factor/confirm-totp` |
| | `POST /portal/profile/2fa-enable-sms` | `POST /portal/profile/two-factor/enable-sms` |
| | `POST /portal/profile/2fa-disable` | `POST /portal/profile/two-factor/disable` |
| **TwoFactorSettings** | 同 ProfileInfo 中的 2FA 路径 | 同上 |
| **SessionManagement** | `POST /portal/profile/sessions/revoke/${tokenId}` | `POST /portal/profile/sessions/list/revoke` body: `{ token_id }` |
| | `POST /portal/profile/sessions/revoke-all` | `POST /portal/profile/sessions/list/revoke-all` |
| **DocumentList** | `POST /portal/documents/delete/${id}` | `POST /portal/documents/list/detail/delete` body: `{ doc_id }` |
| **DocumentUpload** | `POST /portal/documents/upload` | `POST /portal/documents/list/upload` |
| **overview page** | `GET /portal/documents/list` | 不变 |
| **ArticleList** | `POST /portal/articles/delete/${id}` | 删除（portal 面板无文章） |
| **ArticleEditor** | `/portal/documents/upload` 等 | 删除（portal 面板无文章） |

#### 公开接口

| 组件 | 旧 API 路径 | 新 API 路径 |
|---|---|---|
| **CasesPreview** | `GET /public/case/list` | `GET /public/cases/list` |
| **NewsPreview** | `GET /public/content/categories` | 不变 |
| | `GET /public/content/articles` | 不变 |
| **ConfigContext** | 全部不变 | — |
| **content-api.ts** | 全部不变 | — |

### 2. 新增页面

#### admin/students — 学生管理

**页面**：`app/[locale]/[panel]/students/page.tsx`

**组件**：
- `components/admin/StudentTable.tsx` — 学生列表表格（支持按顾问筛选）
- `components/admin/StudentExpandPanel.tsx` — 展开面板（编辑、分配顾问、降级、查看文档）

**API 端点**：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/students/list` | 学生列表（query: page, page_size, advisor_id, my_students） |
| GET | `/admin/students/list/detail` | 学生详情（query: user_id） |
| POST | `/admin/students/list/detail/edit` | 编辑学生（body: user_id, is_active, contact_note） |
| POST | `/admin/students/list/detail/assign-advisor` | 指定顾问（body: user_id, advisor_id） |
| POST | `/admin/students/list/detail/downgrade` | 降为访客（body: user_id） |
| GET | `/admin/students/list/detail/documents/list` | 学生文件列表（query: user_id） |
| GET | `/admin/students/list/detail/documents/list/detail` | 文件详情（query: doc_id） |
| GET | `/admin/students/list/detail/documents/list/detail/download` | 下载文件（query: doc_id） |

#### admin/contacts — 联系人管理

**页面**：`app/[locale]/[panel]/contacts/page.tsx`

**组件**：
- `components/admin/ContactTable.tsx` — 联系人列表表格
- `components/admin/ContactExpandPanel.tsx` — 展开面板（标记状态、添加备注、升级为学生、查看历史）

**API 端点**：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/contacts/list` | 联系人列表（query: page, page_size） |
| GET | `/admin/contacts/list/detail` | 联系人详情（query: user_id） |
| POST | `/admin/contacts/list/detail/mark` | 标记状态（body: user_id, contact_status） |
| POST | `/admin/contacts/list/detail/note` | 添加备注（body: user_id, note） |
| GET | `/admin/contacts/list/detail/history` | 联系历史（query: user_id） |
| POST | `/admin/contacts/list/detail/upgrade` | 升级为学生（body: user_id） |

### 3. 配套设施更新

#### permission-config.ts

新增页面配置：

```typescript
const ADMIN_PAGES: PageConfig[] = [
  // ...existing...
  { key: "studentManagement", href: "/admin/students", apiPrefix: "admin/students" },
  { key: "contactManagement", href: "/admin/contacts", apiPrefix: "admin/contacts" },
]
```

#### AdminSidebar.tsx

新增菜单项：

```typescript
{ key: "studentManagement", href: "/admin/students", icon: BookUser, permissions: ["admin/students/*"] },
{ key: "contactManagement", href: "/admin/contacts", icon: Contact, permissions: ["admin/contacts/*"] },
```

#### PanelGuard.tsx

admin 路由列表新增 `"students"` 和 `"contacts"`。

#### types/index.ts

- **Role 接口更新**：`permissions` 从 `Permission[]` 改为 `string[]`（匹配后端 JSON 数组）
- **删除 Permission 接口**（后端已删除 Permission 表）
- **新增 Student 接口**
- **新增 ContactRecord 接口**

```typescript
export interface Role {
  id: string
  name: string
  description: string
  is_builtin: boolean
  sort_order: number
  permissions: string[]  // 改为 string[]
  user_count: number
  created_at: string
  updated_at: string | null
}

export interface Student {
  id: string
  phone: string | null
  username: string | null
  is_active: boolean
  contact_status: string | null
  contact_note: string | null
  advisor_id: string | null
  storage_quota: number
  created_at: string
  updated_at: string | null
}

export interface ContactRecord {
  id: string
  user_id: string
  staff_id: string
  action: string
  note: string | null
  created_at: string
}
```

#### messages/*.json

新增翻译键（Admin 命名空间）：
- `studentManagement` — 学生管理
- `contactManagement` — 联系人管理

### 4. 需删除的文件/代码

- `components/user/ArticleList.tsx` — portal 面板无文章功能
- `components/user/ArticleEditor.tsx` — portal 面板无文章功能
- `app/[locale]/[panel]/articles/page.tsx` 中的 portal 文章相关逻辑（如果有）

### 5. 不变的部分

- `lib/api.ts` — axios 实例无需改动
- `lib/content-api.ts` — 公开接口路径未变
- `lib/crypto.ts` — 加密工具无需改动
- 公开页面 `(public)/*` — 不涉及
- auth 组件 — 路径未变（`/auth/*`）
- `ConfigContext.tsx` — 公开接口路径未变

## 测试要求

### 原则

- 每个后端端点在前端被调用的地方，都必须有对应的 Playwright E2E 测试
- 前端所有用户交互（按钮点击、表单填写、弹窗操作、展开面板、分页、筛选等）都必须有测试
- 不同 URL 之间要交叉测试，验证路由切换后状态正确
- 单线程执行：`pnpm --prefix frontend exec playwright test --workers=1`

### E2E 测试文件结构

```text
frontend/e2e/
├── admin/
│   ├── users.spec.ts          # 用户管理全流程
│   ├── roles.spec.ts          # 角色管理全流程（含权限树）
│   ├── categories.spec.ts     # 分类 CRUD
│   ├── articles.spec.ts       # 文章 CRUD
│   ├── cases.spec.ts          # 案例 CRUD
│   ├── universities.spec.ts   # 院校 CRUD
│   ├── students.spec.ts       # 学生管理全流程（新增）
│   ├── contacts.spec.ts       # 联系人管理全流程（新增）
│   ├── general-settings.spec.ts  # 通用设置
│   ├── web-settings.spec.ts   # 网站设置
│   └── dashboard.spec.ts      # 仪表盘
├── portal/
│   ├── overview.spec.ts       # 用户概览
│   ├── profile.spec.ts        # 个人资料（含密码、手机、2FA）
│   ├── sessions.spec.ts       # 会话管理
│   └── documents.spec.ts      # 文档管理（上传、详情、下载、删除）
├── auth/
│   ├── login.spec.ts          # 登录流程
│   ├── register.spec.ts       # 注册流程
│   └── token-refresh.spec.ts  # token 自动刷新
├── cross-navigation.spec.ts   # 路径乱序交叉测试
└── permission-guard.spec.ts   # 权限拦截测试
```

### 每个测试文件覆盖内容

每个 `*.spec.ts` 必须覆盖：

1. **端点覆盖**：该页面调用的所有后端端点，至少一个正向测试触发该 API 调用
2. **用户交互覆盖**：页面上每个可交互元素（按钮、输入框、选择器、开关等）至少被操作一次
3. **正向测试**：操作成功的完整流程（如创建 → 列表出现新数据）
4. **反向测试**：错误/边界情况（如提交空表单、重复数据、权限不足）
5. **状态验证**：操作后页面状态正确更新（如删除后列表刷新、编辑后数据变更）

### 路径乱序交叉测试（cross-navigation.spec.ts）

验证不同页面之间快速切换时状态隔离正确：

- admin 页面之间快速切换：users → roles → students → contacts → users
- admin 和 portal 之间切换：admin/users → portal/profile → admin/roles
- 在 CRUD 操作中间切换页面后返回，验证数据一致性
- 展开面板/弹窗打开状态下切换页面，验证无残留状态

### 权限拦截测试（permission-guard.spec.ts）

- 未登录访问 admin/portal 页面 → 重定向首页
- 普通用户访问 admin 页面 → 重定向 portal/overview
- 不同角色用户看到不同的侧边栏菜单项
- 无权限的 API 调用返回 403

## 后端修正（已完成）

- `admin/students/router.py`：`edit_student` 端点的 `student_id` 从 query param 改为 body 中的 `user_id`
- `admin/students/schemas.py`：`StudentEdit` 新增 `user_id` 字段
- 测试已更新并通过
