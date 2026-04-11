# 统一面板重构设计 v2

## 背景

基于 v1 设计（2026-04-11），本次调整核心变更：

1. **前后端路径对齐**：前端页面路径段 = 后端 API resource 段，网关用路径做权限校验
2. **路径直接拼接**：admin/portal 页面从路由取当前路径，直接拼 action，无需工具函数
3. **保留 `api.ts`**：现有 axios 实例 + 拦截器不变，不新建文件

## 核心约定

### 路径对齐规则

前端页面 `/{panel}/{page}` 中的请求，只调用 `/api/{panel}/{page}/{action}` 开头的后端接口。

```text
前端页面: /admin/users        → API: /api/admin/users/{action}
前端页面: /admin/dashboard    → API: /api/admin/dashboard/{action}
前端页面: /portal/documents   → API: /api/portal/documents/{action}
前端页面: /portal/profile     → API: /api/portal/profile/{action}
```

网关从路径自动推导权限：`/api/{panel}/{page}/{action}` → `{panel}/{page}/{action}`（去掉 `/api/` 前缀即为权限）

### 前端 API 调用方式

**admin/portal 页面**：从路由取当前路径，直接拼 action：

```ts
// currentPath 从路由参数拼接，如 "/admin/users"
api.get(`${currentPath}/list`, { params })
api.get(`${currentPath}/detail/${userId}`)
api.post(`${currentPath}/edit/${userId}`, data)
```

**auth 接口**：固定路径，直接写：

```ts
api.post("/auth/login", data)
api.post("/auth/register", data)
api.post("/auth/sms-code", { phone })
api.get("/auth/public-key")
```

**public 接口**：固定路径，直接写：

```ts
api.get("/public/config/site_info")
api.get("/public/panel-config")
```

**SSR fetch**：固定路径，直接写：

```ts
fetch(`${baseUrl}/api/public/content/articles?${params}`)
```

### API 客户端（保留 api.ts）

现有的 `lib/api.ts`（axios 实例 + 拦截器）不变，不新建文件。

## 后端 API 路径（更新）

resource 名与前端页面路径一致：

| 前端页面 | 后端 API | 推导权限 |
| --- | --- | --- |
| `/admin/dashboard` | `GET /api/admin/dashboard/stats` | `admin/dashboard/stats` |
| `/admin/users` | `GET /api/admin/users/list` | `admin/users/list` |
| `/admin/users` | `GET /api/admin/users/detail/{id}` | `admin/users/detail` |
| `/admin/users` | `POST /api/admin/users/edit/{id}` | `admin/users/edit` |
| `/admin/users` | `POST /api/admin/users/reset-password/{id}` | `admin/users/reset-password` |
| `/admin/users` | `POST /api/admin/users/assign-role/{id}` | `admin/users/assign-role` |
| `/admin/users` | `POST /api/admin/users/force-logout/{id}` | `admin/users/force-logout` |
| `/admin/roles` | `GET /api/admin/roles/list` | `admin/roles/list` |
| `/admin/roles` | `GET /api/admin/roles/permissions` | `admin/roles/permissions` |
| `/admin/roles` | `POST /api/admin/roles/create` | `admin/roles/create` |
| `/admin/roles` | `POST /api/admin/roles/edit/{id}` | `admin/roles/edit` |
| `/admin/roles` | `POST /api/admin/roles/delete/{id}` | `admin/roles/delete` |
| `/admin/roles` | `POST /api/admin/roles/reorder` | `admin/roles/reorder` |
| `/admin/general-settings` | `GET /api/admin/general-settings/list` | `admin/general-settings/list` |
| `/admin/general-settings` | `POST /api/admin/general-settings/edit/{key}` | `admin/general-settings/edit` |
| `/admin/web-settings` | `GET /api/admin/web-settings/list` | `admin/web-settings/list` |
| `/admin/web-settings` | `POST /api/admin/web-settings/edit/{key}` | `admin/web-settings/edit` |
| `/admin/panel-settings` | `GET /api/admin/panel-settings/view` | `admin/panel-settings/view` |
| `/admin/panel-settings` | `POST /api/admin/panel-settings/edit` | `admin/panel-settings/edit` |
| `/portal/profile` | `GET /api/portal/profile/view` | `portal/profile/view` |
| `/portal/profile` | `POST /api/portal/profile/edit` | `portal/profile/edit` |
| `/portal/profile` | `POST /api/portal/profile/password` | `portal/profile/password` |
| `/portal/profile` | `POST /api/portal/profile/phone` | `portal/profile/phone` |
| `/portal/profile` | `POST /api/portal/profile/2fa-enable-totp` | `portal/profile/2fa-enable-totp` |
| `/portal/profile` | `POST /api/portal/profile/2fa-disable` | `portal/profile/2fa-disable` |
| `/portal/profile` | `POST /api/portal/profile/2fa-verify` | `portal/profile/2fa-verify` |
| `/portal/documents` | `GET /api/portal/documents/list` | `portal/documents/list` |
| `/portal/documents` | `GET /api/portal/documents/download/{id}` | `portal/documents/download` |
| `/portal/documents` | `POST /api/portal/documents/upload` | `portal/documents/upload` |
| `/portal/documents` | `POST /api/portal/documents/delete/{id}` | `portal/documents/delete` |
| `/portal/articles` | `GET /api/portal/articles/list` | `portal/articles/list` |
| `/portal/articles` | `POST /api/portal/articles/create` | `portal/articles/create` |
| `/portal/articles` | `POST /api/portal/articles/edit/{id}` | `portal/articles/edit` |
| `/portal/articles` | `POST /api/portal/articles/delete/{id}` | `portal/articles/delete` |
| `/portal/overview` | `GET /api/portal/overview/stats` | `portal/overview/stats` |
| — | `GET /api/public/config/{key}` | 无需权限 |
| — | `GET /api/public/panel-config` | 无需权限 |
| — | `GET /api/public/case/list` | 无需权限 |
| — | `GET /api/public/university/list` | 无需权限 |
| — | `GET /api/public/university/countries` | 无需权限 |
| — | `GET /api/public/content/categories` | 无需权限 |
| — | `GET /api/public/content/articles` | 无需权限 |
| — | `GET /api/public/content/article/{id}` | 无需权限 |
| — | `POST /api/auth/login` | 无需权限 |
| — | `POST /api/auth/register` | 无需权限 |
| — | `POST /api/auth/sms-code` | 无需权限 |
| — | `POST /api/auth/refresh` | 无需权限 |
| — | `POST /api/auth/logout` | 无需权限 |
| — | `GET /api/auth/public-key` | 无需权限 |

### 需要注意的路径

- `general-settings` 和 `web-settings` 原来共用 `/admin/settings/*`，现在拆为独立 resource
- 后端 ConfigService 共用，只是 router 分开注册
- `portal/overview` 当前从多个 resource 取统计数据（documents、profile），改为单一 `/api/portal/overview/stats` 聚合接口

## 面板配置（不变）

与 v1 相同：存数据库 `system_config` 表，key = `panel_pages`，公开接口 `GET /api/public/panel-config`，前端 ConfigContext 启动时拉取。

数据结构见 v1 设计。

## 前端路由结构（不变）

与 v1 相同：`app/[locale]/[panel]/` 动态路由，统一 Layout + PanelSidebar。

`(public)` route group 保持不动。

## 路由参数驱动 API 调用

admin/portal 页面用 next-intl 的 `usePathname()` 取当前路径（已去掉 locale 前缀），直接拼 action：

```tsx
import { usePathname } from "@/i18n/navigation"

// usePathname() 返回不带 locale 的路径，如 "/admin/users"
const currentPath = usePathname()

// list
const res = await api.get(`${currentPath}/list`, { params })

// detail
const res = await api.get(`${currentPath}/detail/${userId}`)

// edit
await api.post(`${currentPath}/edit/${userId}`, data)
```

不需要从 `useParams()` 取 panel 再拼接，`usePathname()` 直接返回可用的 API 路径前缀。

## SSR 范围

只有首页和文章详情页需要 SSR（SEO）。服务端用 `fetch` + 固定路径：

```ts
fetch(`${baseUrl}/api/public/content/articles?${params}`)
```

数量少，直接写路径。

## 后端路由注册

每个 router 文件去掉 prefix，改用 `register_routes` 集中注册。路径从 `make_path(panel, resource, action)` 拼接。

resource 名与前端页面路径一致（复数形式）。

## 权限格式

权限 = URL 路径去掉 `/api/` 前缀，用 `/` 分隔，通配符用 `*`。网关无需任何字符转换。

### 权限重命名

`seed_rbac.py` 中所有权限前缀更新：

| 旧 | 新 |
| --- | --- |
| `admin.user.*` | `admin/users/*` |
| `admin.role.*` | `admin/roles/*` |
| `admin.settings.*` | `admin/general-settings/*` + `admin/web-settings/*` |
| `user_center.profile.*` | `portal/profile/*` |
| `user_center.document.*` | `portal/documents/*` |
| `user_center.article.*` | `portal/articles/*` |

新增：

- `admin/dashboard/*`
- `admin/panel-settings/*`
- `portal/overview/*`

### 角色权限定义

```python
superuser:       ["*"]
website_admin:   ["admin/*", "portal/*"]
student_advisor: ["admin/users/*", "admin/content/*", "admin/cases/*", "portal/*"]
student:         ["portal/*"]
visitor:         ["portal/profile/view"]
```

## 网关鉴权（更新）

权限推导简化：去掉 `/api/` 前缀，取前 3 段路径即为权限，不做任何字符转换（去掉原来的连字符转下划线逻辑）。通配符匹配规则不变（`*`、`admin/*`、`admin/users/*`）。

## 测试策略（不变）

与 v1 相同。

## 文件变更清单

| 操作 | 文件 |
| --- | --- |
| — | （不新增前端工具文件，路径直接拼接） |
| 新增 | `frontend/app/[locale]/[panel]/layout.tsx` |
| 新增 | `frontend/app/[locale]/[panel]/panel-settings/page.tsx` |
| 新增 | `frontend/app/[locale]/[panel]/overview/page.tsx` |
| 新增 | `frontend/components/layout/PanelSidebar.tsx` |
| 新增 | `backend/shared/src/app/core/route_registry.py` |
| 移动 | `(admin)/admin/*` 页面 → `[panel]/*` |
| 移动 | `(user)/user-center/*` 页面 → `[panel]/*` |
| 删除 | `(admin)/layout.tsx` |
| 删除 | `(user)/layout.tsx` |
| 删除 | `components/layout/AdminSidebar.tsx` |
| 删除 | `components/layout/UserSidebar.tsx` |
| 修改 | `backend/shared/src/app/*/router.py` — resource 名改复数 + 集中注册 |
| 修改 | `backend/api/src/api/main.py` — router 挂载调整 |
| 修改 | `backend/api/scripts/init/seed_rbac.py` — 权限重命名 |
| 修改 | `backend/api/scripts/init/seed_config.py` — 新增 panel_pages |
| 修改 | `gateway/lua/auth.lua` — 鉴权逻辑 |
| 修改 | `frontend/components/layout/Header.tsx` — 链接更新 |
| 修改 | `frontend/contexts/ConfigContext.tsx` — 新增 panel-config |
| 修改 | 所有前端 admin/portal API 调用 — 硬编码路径 → `usePathname()` + action 拼接 |
| 修改 | `frontend/lib/content-api.ts` — SSR fetch 路径更新 |
| 修改 | 后端测试 — 路径更新 |
| 修改 | 前端测试 — client mock + 路径更新 |
| 修改 | E2E 测试 — 页面路径更新 |

## 不在范围

- `(public)` route group — 保持不动
- 角色编辑页面的权限选择 UI
- 移动端 Sidebar 行为
- 动态新增面板（只支持 admin/portal）
