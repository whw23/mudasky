# 权限系统增强设计

## 概述

四项改动，提升权限管理的精确度和可用性：

1. 后端权限树重构 — 消除重复节点，全中文
2. 网关 module 级 302 — page_guard.lua 做 tab 级权限校验
3. 前端 PanelGuard module 级重定向 — 无权限时精确跳转
4. 前端 PermissionTree Miller Columns — 无限层级分栏选择器

## 术语

- **panel**：面板，admin / portal
- **module**：面板下的一级子路由，如 users / roles / dashboard / profile
- **操作**：叶子节点，对应具体 API 端点

## 1. 后端权限树重构

### 当前问题

`permission_tree.py` 用两步构建权限树：先扫描 `__init__.py` 的 `description` 构建文件夹骨架（key 为 Python 包名如 `user`、`rbac`），再从 OpenAPI spec 补全叶子（key 为 URL 路径段如 `users`、`roles`）。两者 key 不一致导致同一 module 生成两个节点，中间路径段（`meta`/`list`/`detail`）也被保留为树节点。

### 方案

#### 1.1 新增 router.label

每个 `router.py` 中给 `APIRouter` 实例添加 `label` 属性：

```python
router = APIRouter(prefix="/roles", tags=["rbac"])
router.label = "角色管理"
```

`label` 是纯 Python 属性，不会出现在 openapi.json 中。

叶子节点继续使用 `@router.get(summary="...")` 的 `summary` 作为中文名。

| 层级 | 中文名来源 |
|------|-----------|
| 中间节点（router 级） | `router.label` |
| 叶子节点（endpoint 级） | `summary` |

#### 1.2 重写 build_permission_tree

废弃 `_build_folder_tree`（文件系统扫描），改为遍历 FastAPI 的 router 树：

1. 递归遍历 `app.router.routes`，从每个 `APIRouter` 取 `prefix` 和 `label`
2. 从 OpenAPI spec 取每个端点的 `summary`
3. 合并为完整权限树

消除 `meta`/`list`/`detail` 等路由结构中间层级，将它们扁平化到父节点下作为叶子。

#### 1.3 最终权限树结构示例

```json
{
  "admin": {
    "description": "管理后台",
    "children": {
      "users": {
        "description": "用户管理",
        "children": {
          "list": { "description": "查询用户列表" },
          "list/detail": { "description": "查询用户详情" },
          "list/detail/edit": { "description": "更新用户信息" }
        }
      },
      "config": {
        "description": "系统设置",
        "children": {
          "general-settings/list": { "description": "获取所有通用配置" },
          "web-settings": {
            "description": "网站设置",
            "children": {
              "articles": {
                "description": "文章管理",
                "children": { "...": "..." }
              }
            }
          }
        }
      }
    }
  }
}
```

#### 1.4 兼容性

权限树结构变化只影响前端展示。`Role.permissions` 中存储的权限码不变（仍为完整 URL 路径如 `admin/users/list`）。网关 `auth.lua` 的匹配逻辑不受影响。

## 2. 网关 page_guard.lua module 级 302

### 当前行为

只检查用户是否有整个面板（admin/portal）的权限。

### 方案

从页面 URI 自动推导权限码，复用现有 `has_permission` 函数：

```
/zh/admin/users → 提取 panel="admin", module="users" → 权限码 "admin/users"
→ has_permission(perms, "admin/users")
→ 无权限 → 302 /{locale}/admin/dashboard
→ dashboard 也无权限 → 302 /{locale}/
```

#### 重定向规则

| 场景 | 重定向目标 |
|------|-----------|
| admin module 无权限 | `/{locale}/admin/dashboard` |
| admin dashboard 也无权限 | `/{locale}/` |
| portal module 无权限 | `/{locale}/portal/profile` |
| portal profile 也无权限 | `/{locale}/` |

#### 不变的行为

- access_token 过期但有 refresh_token 时仍放行页面，前端 JS 自动续签
- API 请求的权限校验（`auth.lua`）不受影响

## 3. 前端 PanelGuard module 级重定向

### 当前行为

PanelGuard 只检查面板权限和 `PANEL_ROUTES` 路由白名单。

### 方案

用 `MODULE_PERMISSIONS` 替代 `PANEL_ROUTES`，同时承担白名单和权限校验：

```typescript
const MODULE_PERMISSIONS: Record<string, Record<string, string>> = {
  admin: {
    dashboard: "admin/dashboard",
    users: "admin/users",
    roles: "admin/roles",
    "general-settings": "admin/general-settings",
    "web-settings": "admin/web-settings",
    students: "admin/students",
    contacts: "admin/contacts",
  },
  portal: {
    overview: "portal/overview",
    profile: "portal/profile",
    documents: "portal/documents",
  },
}
```

#### 处理流程

```
1. subRoute 不在 MODULE_PERMISSIONS[panel] 中？
   → 非法路由（含 /admin/profile、/admin/documents 等错误拼接）
   → 重定向到默认页，默认页也无权限则回首页

2. subRoute 在 MODULE_PERMISSIONS[panel] 中但无权限？
   → 同上重定向逻辑

3. 合法且有权限 → 放行
```

#### 重定向规则

与网关一致：admin → dashboard → 首页，portal → profile → 首页。

#### 与其他组件的关系

- **PANEL_ROUTES 废弃**，被 MODULE_PERMISSIONS 取代
- **AdminSidebar**：`hasPermission` 过滤菜单项控制"看到什么"，不变
- **网关 page_guard.lua**：第一道防线，PanelGuard 是前端体验层（SPA 内跳转时即时响应）

## 4. 前端 PermissionTree Miller Columns

### 当前问题

递归树形组件层级混乱、中英文混杂、级联勾选不明确。

### 方案

替换为 Miller Columns 分栏布局，支持无限层级。

#### 组件结构

```
PermissionTree (容器)
├── 面包屑导航 (层级 > 2 时显示)
├── 分栏容器 (横向滚动)
│   ├── Column 1: 面板列表
│   ├── Column 2: 选中面板的子节点
│   ├── Column N: ...无限延伸
│   └── 最右栏: 叶子操作列表（flex 填充）
└── 底部统计栏 (已选 N/M)
```

#### 状态

```typescript
// 当前展开的路径
const [activePath, setActivePath] = useState<string[]>([])
// [] → 只显示面板栏
// ["admin"] → 面板栏 + admin 子节点栏
// ["admin", "config", "web-settings"] → 4 栏

// selectedCodes: Set<string> 从 props 传入，只存叶子路径
```

#### 交互

| 操作 | 行为 |
|------|------|
| 点击行（非 checkbox） | 有 children → 展开下一栏，关闭更右侧的栏 |
| 点击 checkbox | 勾选/取消该节点及所有后代叶子，不展开栏 |
| 栏头 全选/全不选 | 操作当前栏所有项 |
| 面包屑点击 | 截断 activePath，跳回该层级 |

#### 级联勾选与通配符折叠

- `selectedCodes` 只存叶子路径或通配符
- 父节点的 checked/indeterminate 状态从子叶子推导：
  - 所有后代叶子选中 → checked
  - 部分选中 → indeterminate
  - 无选中 → unchecked
- 选中子节点时不往 `selectedCodes` 中加父路径，网关祖先匹配已覆盖
- **通配符自动折叠**：当一个节点的所有子叶子全部选中时，`selectedCodes` 中合并为 `parent/*`，不逐个存叶子
- **通配符自动展开**：从全选状态取消某个子叶子时，将 `parent/*` 展开为剩余叶子的逐个路径
- 多层级递归折叠：如果 `admin/config/web-settings` 下所有子节点都是 `*`，则进一步折叠为 `admin/config/web-settings/*`

示例：

```
全选"用户管理"下 7 个操作：
  selectedCodes 存 "admin/users/*"（而非 7 个叶子路径）

取消"删除用户"：
  selectedCodes 展开为 "admin/users/list", "admin/users/list/detail", 
  "admin/users/list/detail/edit", ... （除 delete 外的 6 个叶子）

全选"管理后台"下所有 module：
  selectedCodes 存 "admin/*"
```

#### 样式

- 每栏 `min-width: 140px`，固定宽度
- 最右栏 `flex: 1` 填充剩余空间
- 容器 `overflow-x: auto`，超出时横向滚动
- 选中行高亮背景 `#e8f0fe`
- 分支行右侧显示 `›` 和 `n/m` 统计
- 栏头显示当前层级名称 + 全选按钮

#### 弹窗调整

RoleDialog 弹窗最大宽度增大到 `max-w-3xl`（~768px），分栏区域 `max-height: 360px`。

#### Props 接口不变

```typescript
export interface PermissionTreeProps {
  selectedCodes: Set<string>
  onSelectionChange: (codes: Set<string>) => void
  readonly?: boolean
}
```

## 影响范围

| 文件 | 改动 |
|------|------|
| `backend/api/api/**/router.py` | 每个 router 加 `router.label = "中文名"` |
| `backend/api/api/core/permission_tree.py` | 重写，遍历 router 树构建权限树 |
| `gateway/lua/page_guard.lua` | 增加 module 级权限校验和重定向 |
| `frontend/components/layout/PanelGuard.tsx` | MODULE_PERMISSIONS 替代 PANEL_ROUTES |
| `frontend/components/admin/PermissionTree.tsx` | 重写为 Miller Columns |
| `frontend/components/admin/RoleDialog.tsx` | 弹窗宽度调整 |

## 不变的部分

- `Role.permissions` JSON 数组格式和权限码
- 网关 `auth.lua` API 权限校验逻辑
- `use-permissions.ts` hook
- `AdminSidebar.tsx` 菜单过滤逻辑
- 种子数据 `seed_rbac.py`
