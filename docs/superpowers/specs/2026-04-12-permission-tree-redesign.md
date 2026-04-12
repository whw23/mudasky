# 权限管理器重构：三栏级联 + 动态数据源

## 背景

当前角色编辑对话框（RoleDialog）中的权限选择器是平铺的复选框列表，缺少折叠、搜索、层级可视化。
随着权限节点从 44 个逐步增长到 100+，需要更清晰的交互方式。
同时，权限数据全靠手动维护（seed_rbac.py），后端新增接口需要同步更新种子数据，容易遗漏。

## 目标

1. 将权限选择器改为三栏级联面板，结构清晰、支持搜索和批量操作
2. 第三栏（API 接口）从后端 OpenAPI spec 动态获取，后端新增路由自动出现
3. 权限选择器抽取为可复用组件，可在角色对话框、用户详情、权限审计等场景使用

## 三栏结构

| 栏 | 内容 | 数据来源 | 控制层 |
|---|---|---|---|
| 第一栏 | Panel（admin / portal） | 前端 `[panel]` 路由配置 | 前端可见性 |
| 第二栏 | Panel 内页面/模块 | 前端 Sidebar MENU_KEYS | 前端可见性 |
| 第三栏 | API 接口（方法+路径+描述） | 后端 OpenAPI spec | 前端可见性 + 网关可用性 |

### 交互

- 点击第一栏 panel → 第二栏显示该 panel 下的页面列表
- 点击第二栏页面 → 第三栏显示该页面关联的 API 接口列表
- 每栏有复选框，支持级联勾选（勾选 panel → 勾选所有页面 → 勾选所有 API）
- 选中行左侧显示 2px 深色指示条
- 顶部搜索栏支持跨三栏过滤
- 已选计数显示在工具栏
- 每栏列头显示「自动」或「OpenAPI」标签表明数据来源
- 第三栏有「全选」按钮

### Checkbox 状态

- 未选中：空白
- 全选中：黑色填充 + 白色勾
- 部分选中：灰色填充 + 黑色横线（indeterminate）

### 第三栏 API 行信息

- API 名称：取自路由 docstring 的第一句话
- HTTP 方法：GET（绿色标签）/ POST（黄色标签）
- 路径：等宽字体显示完整路径
- 新发现的接口（未分配过权限的）：黄色背景 + NEW 标签

## 后端改动

### 新增端点：GET /admin/roles/list/openapi.json

- 位置：`backend/shared/src/app/rbac/router.py`
- 实现：调用 FastAPI `app.openapi()` 获取完整 OpenAPI spec，返回 JSON
- 权限码：`admin/roles/list`（网关取前三段，复用已有权限）
- 不需要改网关逻辑

### 生产环境 openapi 配置

- `openapi_url` 保持 `None`（生产环境不暴露原生 openapi.json）
- `/docs` 和 `/redoc` 保持生产关闭、开发开放
- 唯一的 openapi 入口是 `GET /admin/roles/list/openapi.json`，受 admin 权限保护

### API 路由信息不入数据库

- 路由信息每次前端打开权限面板时实时获取，不持久化
- 角色与权限的映射关系（role_permission 表）不变
- permission 表结构和 seed 数据不变

## 前端改动

### 新建可复用组件 PermissionTree

- 位置：`frontend/components/admin/PermissionTree.tsx`
- Props：
  - `selectedIds: Set<string>` — 已选中的权限 ID 集合
  - `onSelectionChange: (ids: Set<string>) => void` — 选中变更回调
  - `readonly?: boolean` — 只读模式（用于查看场景）

### 第一栏数据提取

从前端已有配置中提取 panel 列表：
- admin：对应 `AdminSidebar.tsx` 的 MENU_KEYS
- portal：对应 `UserSidebar.tsx` 的 MENU_KEYS

### 第二栏数据提取

根据选中的 panel，读取对应 Sidebar 的 MENU_KEYS：
- key、href、icon、permissions 字段已包含所需信息

### 第三栏数据获取

1. 调用 `GET /admin/roles/list/openapi.json` 获取 OpenAPI spec
2. 解析 `paths` 对象，提取每个路由的：
   - 路径（如 `/admin/users/list`）
   - HTTP 方法（GET / POST）
   - summary / description（取自 docstring）
3. 只保留 `/admin/*` 和 `/portal/*` 路由，过滤掉 `/auth/*`、`/public/*`、`/health`
4. 根据第二栏选中的页面，匹配对应的 API（通过路径前缀对应，如页面 `用户管理` → href `/admin/users` → 匹配 `/admin/users/*` 的 API）

### RoleDialog 改造

- 移除现有的 PermissionTree、BranchNode 组件和 buildTree 等函数
- 替换为新的 PermissionTree 组件
- 对话框宽度需要调大以容纳三栏（`max-w-4xl` 或更大）

## 基础设施改动

### 开发环境

在 `docker-compose.override.yml` 中：

1. 给 api 容器添加端口映射：

```yaml
api:
  ports:
    - "8000:8000"
```

开发者可直接访问 `localhost:8000/api/docs` 使用 Swagger UI，不走网关。

2. 将 frontend 的匿名 volume 改为 named volume，避免容器重建时产生孤立匿名 volume 堆积：

```yaml
frontend:
  volumes:
    - ./frontend:/app
    - frontend_node_modules:/app/node_modules
    - frontend_next:/app/.next
```

并在 `docker-compose.override.yml` 底部声明：

```yaml
volumes:
  frontend_node_modules:
  frontend_next:
```

### 生产环境

在 `docker-compose.yml` 中给 db 容器添加端口映射，方便远程数据库管理：

```yaml
db:
  ports:
    - "47293:5432"
```

通过云服务器防火墙控制端口通断，保障安全。

## 不变的部分

- 角色与权限的映射关系（role_permission 表）
- 网关的权限校验逻辑（JWT + permission 通配符匹配）
- JWT 中携带 permissions 的方式
- permission 表结构和种子数据
- RoleList 角色列表页面

## 涉及的关键文件

| 文件 | 改动 |
|------|------|
| `backend/shared/src/app/rbac/router.py` | 新增 openapi.json 端点 |
| `frontend/components/admin/PermissionTree.tsx` | 新建：三栏权限选择器组件 |
| `frontend/components/admin/RoleDialog.tsx` | 替换旧的权限树为新组件 |
| `docker-compose.override.yml` | api 端口映射 8000:8000 |
| `docker-compose.yml` | db 端口映射 47293:5432 |

## 验证方式

1. 启动开发环境，打开角色编辑对话框，确认三栏权限选择器正常显示
2. 第一栏显示 admin / portal 两个 panel
3. 点击 admin → 第二栏显示管理后台的页面列表
4. 点击用户管理 → 第三栏显示 `/admin/users/*` 的 API 接口列表，包含方法、路径、描述
5. 勾选/取消权限后保存角色，确认 role_permission 关系正确保存
6. 后端新增一个测试路由后重启，刷新前端页面，第三栏自动出现新接口
7. 搜索功能可跨三栏过滤
8. `localhost:8000/api/docs` 可直接访问 Swagger UI（开发环境）
