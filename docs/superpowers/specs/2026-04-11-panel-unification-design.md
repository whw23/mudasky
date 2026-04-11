# 统一面板重构设计

## 背景

当前管理后台和用户中心使用两套独立的路由、布局和 Sidebar，后端 API 使用 RESTful 风格，权限校验分散在网关（粗筛）和后端（细粒度）两层。存在以下问题：

- 前后端路由/权限不统一，新增页面需要改多处
- 移动页面归属需要改目录、链接、Sidebar、权限
- 两个 Sidebar 组件逻辑重复
- 后端每个接口重复写 `require_permission()`
- RESTful 风格无法从 URL 推导权限

## 目标

1. 用 `[panel]` 动态路由统一前端面板
2. 后端 API 改 RPC 风格，权限从 URL 自动推导
3. 网关全权鉴权，后端不再校验权限
4. 面板配置存数据库，前后端共享单一数据源
5. admin 提供面板配置管理界面（排序、可见性、跨面板移动）
6. 权限前缀 `user_center` → `portal`

## 设计

### 1. code-style 规范更新（先行）

更新 `.claude/rules/code-style.md`，将 API 风格从 RESTful 改为 RPC：

- 路径格式：`/api/{panel}/{resource}/{action}`（需鉴权）或 `/api/public/{resource}/{action}`（公开）或 `/api/auth/{action}`（认证）
- 读操作用 `GET`，写操作用 `POST`
- 移除"RESTful 风格"和"通过 HTTP method 区分操作"规范

### 2. 面板配置 — 单一数据源

面板配置存数据库（`system_config` 表，key = `panel_pages`），后端提供公开接口 `/api/public/panel-config`，前端启动时拉取，不再硬编码。

#### 数据结构

```json
{
  "admin": [
    { "key": "dashboard", "permission": "admin.dashboard", "icon": "LayoutDashboard", "labelKey": "dashboard", "visible": true },
    { "key": "users", "permission": "admin.user", "icon": "Users", "labelKey": "users", "visible": true },
    { "key": "roles", "permission": "admin.role", "icon": "Shield", "labelKey": "roles", "visible": true },
    { "key": "general-settings", "permission": "admin.settings", "icon": "Settings", "labelKey": "generalSettings", "visible": true },
    { "key": "web-settings", "permission": "admin.settings", "icon": "Globe", "labelKey": "webSettings", "visible": true },
    { "key": "panel-settings", "permission": "admin.panel", "icon": "PanelLeft", "labelKey": "panelSettings", "visible": true }
  ],
  "portal": [
    { "key": "overview", "permission": "portal.overview", "icon": "LayoutDashboard", "labelKey": "overview", "visible": true },
    { "key": "profile", "permission": "portal.profile", "icon": "User", "labelKey": "profile", "visible": true },
    { "key": "documents", "permission": "portal.document", "icon": "FileText", "labelKey": "documents", "visible": true },
    { "key": "articles", "permission": "portal.article", "icon": "PenSquare", "labelKey": "articles", "visible": true }
  ]
}
```

- 数组顺序 = Sidebar 菜单顺序
- `visible` 控制是否在 Sidebar 显示（隐藏的页面仍可通过 URL 直接访问，不是权限控制）
- `icon` 存图标名称字符串，前端映射到 Lucide 组件

#### 初始化

`seed_config.py` 中初始化 `panel_pages` 配置，已存在则跳过。

#### 公开接口

`GET /api/public/panel-config` — 返回面板配置，支持 ETag 缓存。前端 `ConfigContext` 启动时拉取并缓存。

### 3. 前端路由结构

```
app/[locale]/[panel]/
├── layout.tsx                    ← 统一 layout
├── dashboard/page.tsx            ← admin 独占
├── users/page.tsx                ← admin 独占
├── roles/page.tsx                ← admin 独占
├── general-settings/page.tsx     ← admin 独占
├── web-settings/page.tsx         ← admin 独占
├── panel-settings/page.tsx       ← admin 独占（面板配置管理）
├── overview/page.tsx             ← portal 独占
├── profile/page.tsx              ← portal 独占
├── documents/page.tsx            ← portal 独占
└── articles/page.tsx             ← portal 独占
```

- `[panel]` 合法值由后端 panel-config 接口返回的 key 决定（初始为 `admin` | `portal`）
- 非法 panel 值 → `notFound()`
- 删除旧的 `(admin)/` 和 `(user)/` route group 目录

### 4. 统一 Layout

`app/[locale]/[panel]/layout.tsx` 职责：

1. 校验 `panel` 是否合法（不在 panel-config 的 key 中 → `notFound()`）
2. 校验当前页面是否属于当前 panel（不在该 panel 的页面列表中 → `notFound()`）
3. 校验用户权限（无对应权限 → 未登录跳转登录，已登录无权限显示 403）
4. 渲染 `SidebarShell` + `PanelSidebar`

权限校验在客户端进行（使用 `usePermissions` hook），因为用户权限信息存储在前端（localStorage + Context）。

### 5. 权限与路径匹配规则

访问 `/{panel}/{page}` 时的校验流程：

1. **panel 校验**：`panel` 不在配置中 → `notFound()`
2. **页面归属校验**：在当前 panel 的页面列表中查找 `key === page`，找不到 → `notFound()`（即 `/admin/profile` 会 404）
3. **权限校验**：根据匹配到的 `permission` 值，用户拥有的任意权限以该值开头即视为有权限

示例：

| URL | 需要权限 | 用户权限 | 结果 |
| --- | --- | --- | --- |
| `/admin/users` | `admin.user` | `admin.*` | 通过 |
| `/admin/users` | `admin.user` | `portal.*` | 403 |
| `/portal/profile` | `portal.profile` | `portal.*` | 通过 |
| `/portal/profile` | `portal.profile` | `portal.profile.view` | 通过 |
| `/admin/profile` | — | — | 404 |
| `/admin/dashboard` | `admin.dashboard` | `admin.user.list` | 403 |
| `/admin/dashboard` | `admin.dashboard` | `admin.*` | 通过 |

通配符 `*` 的匹配逻辑：

- `*` → 拥有所有权限
- `admin.*` → 拥有所有以 `admin.` 开头的权限
- `portal.profile.*` → 拥有所有以 `portal.profile.` 开头的权限

### 6. 动态 Sidebar

新建 `PanelSidebar` 组件替代 `AdminSidebar` + `UserSidebar`：

- 接收 `panel` 参数
- 从 panel-config 读取当前 panel 的页面列表
- 过滤 `visible === true` 的页面
- 根据用户权限再过滤（无权限的不显示）
- 按数组顺序渲染菜单项
- `href` 自动拼接 `/{panel}/{page}`
- `icon` 字符串映射到 Lucide 图标组件

### 7. 面板配置管理页

新增 `/admin/panel-settings` 页面，admin 专属。

功能：

- **显示两个面板**（admin / portal），每个面板下列出其页面列表
- **拖拽排序**：拖拽改变同一面板内页面顺序（使用 dnd-kit，项目已有依赖）
- **跨面板拖拽**：把页面从一个面板拖到另一个，改变归属
- **可见性切换**：每个页面旁边有眼睛图标，点击切换 `visible` 状态
- **panel-settings 自身不可隐藏**：防止锁死
- **不可删除**：没有删除功能，只能隐藏
- **保存**：调用 `/api/admin/panel/edit` 更新配置

### 8. 后端权限重命名

`seed_rbac.py` 中所有 `user_center` 前缀改为 `portal`：

| 旧 | 新 |
| --- | --- |
| `user_center.profile.view` | `portal.profile.view` |
| `user_center.profile.edit` | `portal.profile.edit` |
| `user_center.document.upload` | `portal.document.upload` |
| `user_center.*` | `portal.*` |
| ...以此类推 | |

新增权限：

- `admin.dashboard.view` — 查看管理仪表盘
- `portal.overview.view` — 查看个人概览
- `admin.panel.view` — 查看面板配置
- `admin.panel.edit` — 编辑面板配置

同步更新数据库中已有的权限记录。

### 9. 原 dashboard 拆分

- `/admin/dashboard` → admin 管理仪表盘（用户统计、文章统计、最近注册）
- `/portal/overview` → 个人概览（文档数量、存储空间、最近文档、快捷操作）

两个页面各自独立的 `page.tsx`，内容组件分别为 `AdminDashboard` 和 `PortalOverview`。

### 10. URL 变更总结

#### 前端页面

| 旧 URL | 新 URL |
| --- | --- |
| `/admin/dashboard` | `/admin/dashboard`（不变）|
| `/admin/users` | `/admin/users`（不变）|
| `/admin/roles` | `/admin/roles`（不变）|
| `/admin/general-settings` | `/admin/general-settings`（不变）|
| `/admin/web-settings` | `/admin/web-settings`（不变）|
| — | `/admin/panel-settings`（新增）|
| `/user-center/dashboard` | `/portal/overview` |
| `/user-center/profile` | `/portal/profile` |
| `/user-center/documents` | `/portal/documents` |
| `/user-center/articles` | `/portal/articles` |

#### 后端 API

| 旧路径 (RESTful) | 新路径 (RPC) | 推导权限 |
| --- | --- | --- |
| `GET /api/admin/users` | `GET /api/admin/user/list` | `admin.user.list` |
| `GET /api/admin/users/{id}` | `GET /api/admin/user/detail/{id}` | `admin.user.detail` |
| `PATCH /api/admin/users/{id}` | `POST /api/admin/user/edit/{id}` | `admin.user.edit` |
| `PUT /api/admin/users/{id}/toggle-active` | `POST /api/admin/user/toggle-active/{id}` | `admin.user.toggle_active` |
| `GET /api/roles` | `GET /api/admin/role/list` | `admin.role.list` |
| `POST /api/roles` | `POST /api/admin/role/create` | `admin.role.create` |
| `PATCH /api/roles/{id}` | `POST /api/admin/role/edit/{id}` | `admin.role.edit` |
| `DELETE /api/roles/{id}` | `POST /api/admin/role/delete/{id}` | `admin.role.delete` |
| `GET /api/admin/config` | `GET /api/admin/settings/list` | `admin.settings.list` |
| `PUT /api/admin/config/{key}` | `POST /api/admin/settings/edit/{key}` | `admin.settings.edit` |
| — | `GET /api/admin/panel/view` | `admin.panel.view` |
| — | `POST /api/admin/panel/edit` | `admin.panel.edit` |
| `GET /api/users/me` | `GET /api/portal/profile/view` | `portal.profile.view` |
| `PATCH /api/users/me` | `POST /api/portal/profile/edit` | `portal.profile.edit` |
| `PUT /api/users/me/password` | `POST /api/portal/profile/password` | `portal.profile.password` |
| `PUT /api/users/me/phone` | `POST /api/portal/profile/phone` | `portal.profile.phone` |
| `POST /api/users/me/2fa/*` | `POST /api/portal/profile/2fa-*` | `portal.profile.*` |
| `POST /api/documents/upload` | `POST /api/portal/document/upload` | `portal.document.upload` |
| `GET /api/documents` | `GET /api/portal/document/list` | `portal.document.list` |
| `GET /api/documents/{id}` | `GET /api/portal/document/detail/{id}` | `portal.document.detail` |
| `GET /api/documents/{id}/download` | `GET /api/portal/document/download/{id}` | `portal.document.download` |
| `DELETE /api/documents/{id}` | `POST /api/portal/document/delete/{id}` | `portal.document.delete` |
| `GET /api/config/{key}` | `GET /api/public/config/{key}` | 无需权限 |
| `GET /api/cases` | `GET /api/public/case/list` | 无需权限 |
| `GET /api/universities` | `GET /api/public/university/list` | 无需权限 |
| `GET /api/content/categories` | `GET /api/public/content/categories` | 无需权限 |
| `GET /api/content/articles` | `GET /api/public/content/articles` | 无需权限 |
| `POST /api/auth/login` | `POST /api/auth/login` | 无需权限 |
| `POST /api/auth/register` | `POST /api/auth/register` | 无需权限 |
| `GET /api/auth/public-key` | `GET /api/auth/public-key` | 无需权限 |
| `POST /api/auth/sms-code` | `POST /api/auth/sms-code` | 无需权限 |
| `POST /api/auth/refresh` | `POST /api/auth/refresh` | 无需权限 |
| `GET /api/health` | `GET /api/health` | 无需权限 |

#### HTTP Method 规则

- `list`、`detail`、`view`、`download` → `GET`
- `create`、`edit`、`delete`、`upload`、`password`、`phone` 等 → `POST`

### 11. 后端 API 路由集中注册

后端路由通过集中配置自动注册，与前端 panel-config 共享同一数据源：

```python
# core/panel_routes.py
# 从数据库 panel_pages 配置读取面板结构
# 结合各 resource 的 handler 定义自动注册路由
```

每个 resource 定义自己的 action handlers，路由注册时自动拼接 `/api/{panel}/{resource}/{action}` 路径。

### 12. 网关全权鉴权

网关从 URL 路径自动推导所需权限，与 JWT claims 中的 `permissions` 数组匹配。后端不再做权限校验。

#### 鉴权流程

1. 请求进入 → 解析路径前缀
2. `/api/auth/*` 或 `/api/public/*` 或 `/api/health` → 直接放行
3. `/api/admin/*` 或 `/api/portal/*` → 验证 JWT → 从路径提取权限字符串 → 与 JWT claims 匹配
4. 匹配成功 → 注入 `X-User-Id` 请求头，转发后端
5. 匹配失败 → 返回 403

#### 权限提取规则

从路径 `/api/{panel}/{resource}/{action}[/{id}]` 提取前三段拼成 `{panel}.{resource}.{action}`，忽略后续路径参数。

#### 通配符匹配

- `*` → 匹配所有权限
- `admin.*` → 匹配所有 `admin.` 开头的权限
- `admin.user.*` → 匹配所有 `admin.user.` 开头的权限

#### 后端简化

- 移除所有 `Depends(require_permission(...))` 装饰器
- 后端只做业务逻辑，信任网关传入的 `X-User-Id`
- 后端只允许来自网关的请求（通过网络隔离）

### 13. Header 链接更新

Header 中用户名点击跳转从 `/user-center/dashboard` 改为 `/portal/overview`。

### 14. 测试策略

#### 删除的测试

- 所有引用旧路径（`/admin/dashboard`、`/user-center/*`、`/dashboard`）的 E2E 测试
- 后端单元测试中使用 `require_permission` 的 mock 测试

#### 新增/修改的测试

**后端单元测试（pytest）**：
- 权限重命名后的 seed_rbac 初始化测试
- RPC 风格 router 的集成测试（httpx ASGI transport）
- panel-config CRUD service 测试

**后端 httpx E2E 测试**：
- 所有 API 路径改为 RPC 格式
- 验证网关权限拦截（无权限返回 403）
- 验证 panel-config 公开接口

**前端单元测试（Vitest）**：
- PanelSidebar 组件测试（权限过滤、可见性过滤）
- panel-config Context 测试

**前端 Playwright E2E 测试**：
- admin 面板页面可达性测试（新路径）
- portal 面板页面可达性测试（新路径）
- panel-settings 页面拖拽排序测试
- 权限拦截测试（无权限用户访问 admin 页面）

## 文件变更清单

| 操作 | 文件 |
| --- | --- |
| 修改 | `.claude/rules/code-style.md` — API 风格 RESTful → RPC |
| 新增 | `backend/shared/src/app/panel/` — 面板配置 model/schema/service/router |
| 新增 | `frontend/app/[locale]/[panel]/layout.tsx` |
| 新增 | `frontend/app/[locale]/[panel]/panel-settings/page.tsx` |
| 新增 | `frontend/app/[locale]/[panel]/overview/page.tsx` |
| 新增 | `frontend/components/layout/PanelSidebar.tsx` |
| 移动 | `(admin)/admin/*` 页面 → `[panel]/*` |
| 移动 | `(user)/user-center/*` 页面 → `[panel]/*` |
| 删除 | `(admin)/layout.tsx` |
| 删除 | `(user)/layout.tsx` |
| 删除 | `components/layout/AdminSidebar.tsx` |
| 删除 | `components/layout/UserSidebar.tsx` |
| 修改 | `backend/shared/src/app/*/router.py` — 所有 router 路径改 RPC 风格 |
| 修改 | `backend/api/src/api/main.py` — router 挂载调整 |
| 修改 | `backend/api/scripts/init/seed_rbac.py` — `user_center` → `portal` + 新增权限 |
| 修改 | `backend/api/scripts/init/seed_config.py` — 新增 `panel_pages` 初始化 |
| 修改 | `gateway/lua/auth.lua` — 鉴权逻辑重写（路径推导权限） |
| 修改 | `gateway/lua/init.lua` — 公开路由白名单更新 |
| 修改 | `frontend/components/layout/Header.tsx` — 链接更新 |
| 修改 | `frontend/lib/api.ts` + 所有前端 API 调用路径 |
| 修改 | `frontend/contexts/ConfigContext.tsx` — 新增 panel-config 数据 |
| 修改 | 后端测试 — 路径更新 + 权限测试调整 |
| 修改 | 前端测试 — 路径更新 + 新增 PanelSidebar 测试 |
| 修改 | E2E 测试 — 全部路径更新 |

## 不在范围

- 角色编辑页面的权限选择 UI 改造
- 移动端 Sidebar 行为变更（保持现有 SidebarShell 的汉堡菜单逻辑）
- 动态新增面板（只支持 admin/portal 两个固定面板）
