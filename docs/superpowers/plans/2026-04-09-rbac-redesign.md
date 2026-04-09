# RBAC 权限系统重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将扁平权限码系统重构为树形点分权限码 + 通配符 + 平等角色体系。

**Architecture:** Permission 表存储点分叶子码和通配符码，Role 表替代 PermissionGroup（去掉 is_system/auto_include_all），User.role_id 替代 group_id（去掉 is_superuser/user_type）。通配符权限（`*`、`admin.*`）在 `has_permission()` 中动态匹配。前端通过 `code.split('.')` 构建权限树 UI。

**Tech Stack:** Python/SQLAlchemy/Alembic (后端), Lua (网关), TypeScript/React (前端)

**Spec:** `docs/superpowers/specs/2026-04-09-rbac-redesign.md`

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 重写 | `backend/shared/src/app/rbac/models.py` | Role 模型（替代 PermissionGroup） |
| 重写 | `backend/shared/src/app/rbac/tables.py` | role_permission 关联表 |
| 重写 | `backend/shared/src/app/rbac/schemas.py` | 新权限码、角色 schema |
| 重写 | `backend/shared/src/app/rbac/service.py` | 角色 CRUD、权限查询 |
| 重写 | `backend/shared/src/app/rbac/repository.py` | 角色数据访问 |
| 重写 | `backend/shared/src/app/rbac/router.py` | /roles 端点 |
| 修改 | `backend/shared/src/app/user/models.py` | role_id，去掉 is_superuser/user_type |
| 修改 | `backend/shared/src/app/user/schemas.py` | role_id/role_name 替代 group 字段 |
| 修改 | `backend/shared/src/app/user/service.py` | 适配新字段 |
| 修改 | `backend/shared/src/app/core/dependencies.py` | has_permission 通配符，删除旧函数 |
| 修改 | `backend/shared/src/app/auth/service.py` | 注册分配 visitor，JWT 字段 |
| 修改 | `backend/shared/src/app/admin/router.py` | 新权限码，assign_role |
| 修改 | `backend/shared/src/app/admin/service.py` | 适配新模型 |
| 修改 | `backend/shared/src/app/admin/schemas.py` | role_id 替代 group_id |
| 修改 | `backend/shared/src/app/config/router.py` | require_superuser → require_permission |
| 修改 | `backend/shared/src/app/content/router.py` | 新权限码 |
| 修改 | `backend/shared/src/app/content/admin_router.py` | 新权限码 |
| 修改 | `backend/shared/src/app/case/admin_router.py` | 新权限码 |
| 修改 | `backend/shared/src/app/university/router.py` | 新权限码 |
| 重写 | `backend/api/scripts/init_superuser.py` | 新权限码和角色初始化 |
| 新建 | `backend/api/alembic/versions/xxxx_rbac_redesign.py` | 数据库迁移 |
| 修改 | `gateway/lua/auth.lua` | 去掉 X-Is-Superuser/X-User-Type |
| 修改 | `gateway/lua/auth_proxy.lua` | JWT 去掉 is_superuser/user_type |
| 修改 | `gateway/lua/refresh_proxy.lua` | JWT 去掉 is_superuser/user_type |
| 修改 | `frontend/types/index.ts` | User/Role 类型 |
| 重写 | `frontend/hooks/use-permissions.ts` | 通配符匹配 |
| 修改 | `frontend/contexts/AuthContext.tsx` | 去掉 is_superuser |
| 修改 | `frontend/components/layout/AdminSidebar.tsx` | 新权限码 |
| 修改 | `frontend/components/layout/Header.tsx` | isAdmin 逻辑 |
| 重写 | `frontend/components/admin/GroupList.tsx` → `RoleList.tsx` | 角色管理 |
| 重写 | `frontend/components/admin/GroupDialog.tsx` → `RoleDialog.tsx` | 树形权限编辑 |
| 修改 | `frontend/components/admin/UserDrawer.tsx` | 角色分配 |
| 修改 | `frontend/components/admin/UserTable.tsx` | 角色显示 |
| 修改 | `frontend/components/user/ProfileInfo.tsx` | 角色显示 |
| 修改 | `frontend/messages/zh.json` | 权限名称 i18n |
| 修改 | `frontend/messages/en.json` | 权限名称 i18n |
| 修改 | `frontend/messages/ja.json` | 权限名称 i18n |
| 修改 | `frontend/messages/de.json` | 权限名称 i18n |
| 重写 | 所有相关单元测试 | 适配新权限码 |
| 重写 | 所有 e2e 测试 | 适配新权限码 |

---

### Task 1: 数据库模型 + 迁移

**目标：** 重建 Permission/Role/User 模型，生成 Alembic 迁移。

**Files:**
- Modify: `backend/shared/src/app/rbac/models.py`
- Modify: `backend/shared/src/app/rbac/tables.py`
- Modify: `backend/shared/src/app/user/models.py`
- Create: `backend/api/alembic/versions/xxxx_rbac_redesign.py`

- [ ] **Step 1: 重写 rbac/models.py**

`PermissionGroup` → `Role`：
- 去掉 `is_system`、`auto_include_all` 字段
- Permission 表新增 `name_key` 字段

- [ ] **Step 2: 重写 rbac/tables.py**

`group_permission` → `role_permission`

- [ ] **Step 3: 修改 user/models.py**

- `group_id` → `role_id` (FK → Role)
- 删除 `is_superuser` 字段
- 删除 `user_type` 字段
- relationship 从 `group` → `role`

- [ ] **Step 4: 生成 Alembic 迁移**

```bash
cd backend/api && uv run alembic revision --autogenerate -m "RBAC 重构：Role 替代 PermissionGroup"
```

手动审查生成的迁移文件，确保：
- permission_group 表重命名为 role
- group_permission 表重命名为 role_permission
- User 表 group_id 重命名为 role_id
- User 表删除 is_superuser、user_type 列
- Permission 表新增 name_key 列

- [ ] **Step 5: Commit**

```
feat: RBAC 数据模型重构（Role 替代 PermissionGroup）
```

---

### Task 2: 核心权限检查函数

**目标：** 实现通配符权限匹配，替换旧的权限检查函数。

**Files:**
- Modify: `backend/shared/src/app/core/dependencies.py`
- Create: `backend/api/tests/test_core_permissions.py`

- [ ] **Step 1: 写 has_permission 测试**

测试用例：
- `*` 匹配任何权限
- `admin.*` 匹配 `admin.user.list`、`admin.content.edit`
- `admin.user.*` 匹配 `admin.user.list`，不匹配 `admin.content.list`
- 精确匹配 `admin.user.list`
- 不匹配的情况

- [ ] **Step 2: 实现 has_permission 函数**

```python
def has_permission(user_perms: list[str], required: str) -> bool:
    for perm in user_perms:
        if perm == "*":
            return True
        if perm.endswith(".*"):
            prefix = perm[:-1]
            if required.startswith(prefix):
                return True
        if perm == required:
            return True
    return False
```

- [ ] **Step 3: 重写 dependencies.py**

- `require_permission()` 和 `require_any_permission()` 使用 `has_permission()`
- 删除 `require_superuser()`、`get_is_superuser()`、`get_current_user_type()`、`IsSuperuser` 类型
- 保留 `CurrentUserId`、`CurrentPermissions`

- [ ] **Step 4: 运行测试**

- [ ] **Step 5: Commit**

```
feat: 通配符权限匹配函数（has_permission）
```

---

### Task 3: RBAC 领域重写（schemas/service/repository/router）

**目标：** 完整重写 RBAC 领域，Role CRUD + 新权限码。

**Files:**
- Rewrite: `backend/shared/src/app/rbac/schemas.py`
- Rewrite: `backend/shared/src/app/rbac/service.py`
- Rewrite: `backend/shared/src/app/rbac/repository.py`
- Rewrite: `backend/shared/src/app/rbac/router.py`

- [ ] **Step 1: 重写 schemas.py**

- `PermissionResponse`：code, name_key, description
- `RoleResponse`：id, name, description, permissions, user_count, created_at, updated_at
- `RoleCreate`：name, description, permission_ids
- `RoleUpdate`：name?, description?, permission_ids?
- 删除 `PERMISSION_CATEGORIES`（前端通过 code.split 构建树）
- 删除 `GroupResponse`、`GroupCreate`、`GroupUpdate`

- [ ] **Step 2: 重写 repository.py**

- `list_permissions()` → 返回所有 Permission
- `list_roles()` → 返回所有 Role（含 user_count）
- `get_role_by_id()` → 加载权限关系
- `get_role_by_name()` → 按名称查找
- `create_role()` → 创建角色
- `update_role()` → 更新角色
- `delete_role()` → 删除角色（保护 superuser/visitor）
- `get_user_permissions()` → 查询用户权限码列表
- `get_user_role_name()` → 查询用户角色名称
- `set_user_role()` → 设置用户角色

- [ ] **Step 3: 重写 service.py**

- Role CRUD 逻辑
- 删除角色时保护 superuser/visitor（按名称判断）
- `assign_user_role()` 防止越权

- [ ] **Step 4: 重写 router.py**

端点从 `/groups` 改为 `/roles`：
- `GET /permissions` → `admin.role.list`
- `GET /roles` → `admin.role.list`
- `POST /roles` → `admin.role.create`
- `GET /roles/{id}` → `admin.role.list`
- `PATCH /roles/{id}` → `admin.role.edit`
- `DELETE /roles/{id}` → `admin.role.delete`

- [ ] **Step 5: Commit**

```
refactor: RBAC 领域重写（Role CRUD + 点分权限码）
```

---

### Task 4: 初始化脚本 + 相关 Service 适配

**目标：** 重写 init 脚本，适配 auth/user/admin service。

**Files:**
- Rewrite: `backend/api/scripts/init_superuser.py`
- Modify: `backend/shared/src/app/auth/service.py`
- Modify: `backend/shared/src/app/user/service.py`
- Modify: `backend/shared/src/app/user/schemas.py`
- Modify: `backend/shared/src/app/admin/service.py`
- Modify: `backend/shared/src/app/admin/schemas.py`
- Modify: `backend/shared/src/app/admin/router.py`

- [ ] **Step 1: 重写 init_superuser.py**

- 创建所有叶子权限码 + 通配符权限码（含 name_key）
- 创建 5 个预置角色（superuser/website_admin/student_advisor/student/visitor）
- 为各角色分配权限
- 创建 superuser 用户，分配 superuser 角色
- 不再设置 is_superuser=True 和 user_type

- [ ] **Step 2: 修改 user/schemas.py**

- `group_id` → `role_id`
- `group_name` → `role_name`
- 删除 `is_superuser`、`user_type`

- [ ] **Step 3: 修改 user/service.py**

- `build_user_response` 中使用 `role_id`、`role_name`
- 权限查询走新的 repository

- [ ] **Step 4: 修改 auth/service.py**

- 注册时分配 visitor 角色（查询 visitor role_id 并赋值）
- JWT 相关字段通过 UserResponse 传递（已无 is_superuser/user_type）

- [ ] **Step 5: 修改 admin/schemas.py**

- `group_id` → `role_id`
- 删除 `user_type` 相关 schema

- [ ] **Step 6: 修改 admin/service.py**

- `assign_user_group` → `assign_user_role`
- 删除 `change_user_type()`
- 权限检查适配新函数

- [ ] **Step 7: 修改 admin/router.py**

- `PUT /admin/users/{id}/groups` → `PUT /admin/users/{id}/role`
- 删除 `PATCH /admin/users/{id}/type` 端点
- 所有权限码改为新的点分码

- [ ] **Step 8: Commit**

```
refactor: init 脚本 + auth/user/admin 适配新 RBAC
```

---

### Task 5: 所有 Router 权限码迁移

**目标：** 将所有 router 的旧权限码替换为新的点分码。

**Files:**
- Modify: `backend/shared/src/app/config/router.py`
- Modify: `backend/shared/src/app/content/router.py`
- Modify: `backend/shared/src/app/content/admin_router.py`
- Modify: `backend/shared/src/app/case/admin_router.py`
- Modify: `backend/shared/src/app/university/router.py`
- Modify: `backend/shared/src/app/document/router.py`（如有权限检查）

- [ ] **Step 1: 修改每个 router**

权限码映射：

| 旧 | 新 |
|----|-----|
| `require_superuser()` | `require_permission("admin.settings.view"/"admin.settings.edit")` |
| `require_permission("blog:write")` | `require_permission("user_center.article.create")` |
| `require_permission("category:manage")` | `require_permission("admin.category.*")` |
| `require_any_permission("post:manage", "blog:manage")` | `require_permission("admin.content.*")` |
| `require_permission("post:manage")` | `require_permission("admin.content.*")` |

- [ ] **Step 2: 验证编译通过**

```bash
cd backend/api && uv run python -c "from api.main import api; print('OK')"
```

- [ ] **Step 3: Commit**

```
refactor: 所有 router 迁移到点分权限码
```

---

### Task 6: Gateway Lua 修改

**目标：** JWT payload 和 header 注入去掉 is_superuser 和 user_type。

**Files:**
- Modify: `gateway/lua/auth.lua`
- Modify: `gateway/lua/auth_proxy.lua`
- Modify: `gateway/lua/refresh_proxy.lua`

- [ ] **Step 1: 修改 auth_proxy.lua**

JWT payload 去掉 `is_superuser` 和 `user_type` 字段。

- [ ] **Step 2: 修改 refresh_proxy.lua**

同样去掉 JWT payload 中的 `is_superuser` 和 `user_type`。

- [ ] **Step 3: 修改 auth.lua**

- 删除 `ngx.req.set_header("X-User-Type", ...)` 行
- 删除 `ngx.req.set_header("X-Is-Superuser", ...)` 行
- 保留 `X-User-Id` 和 `X-User-Permissions`

- [ ] **Step 4: Commit**

```
refactor: 网关 JWT 去掉 is_superuser/user_type
```

---

### Task 7: 前端类型 + 权限 Hook

**目标：** 更新 TypeScript 类型和权限检查逻辑。

**Files:**
- Modify: `frontend/types/index.ts`
- Rewrite: `frontend/hooks/use-permissions.ts`
- Modify: `frontend/contexts/AuthContext.tsx`

- [ ] **Step 1: 修改 types/index.ts**

```typescript
interface User {
  id: string
  username: string
  phone: string
  role_id: string | null
  role_name: string | null
  permissions: string[]
  is_active: boolean
  // 去掉 is_superuser, user_type, group_id, group_name
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  user_count: number
  created_at: string
  updated_at: string
}

interface Permission {
  id: string
  code: string
  name_key: string
  description: string
}
```

- [ ] **Step 2: 重写 use-permissions.ts**

```typescript
export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (perm: string): boolean => {
    if (!user?.permissions) return false
    for (const p of user.permissions) {
      if (p === "*") return true
      if (p.endsWith(".*") && perm.startsWith(p.slice(0, -1))) return true
      if (p === perm) return true
    }
    return false
  }

  const hasAnyPermission = (...perms: string[]): boolean =>
    perms.some((p) => hasPermission(p))

  const isAdmin = hasAnyPermission("admin.*")

  return { hasPermission, hasAnyPermission, isAdmin }
}
```

- [ ] **Step 3: 修改 AuthContext.tsx**

去掉 `is_superuser` 相关逻辑。

- [ ] **Step 4: Commit**

```
refactor: 前端类型和权限 Hook 适配新 RBAC
```

---

### Task 8: 前端组件适配

**目标：** 更新所有使用权限检查的前端组件。

**Files:**
- Modify: `frontend/components/layout/AdminSidebar.tsx`
- Modify: `frontend/components/layout/Header.tsx`
- Rewrite: `frontend/components/admin/GroupList.tsx` → `RoleList.tsx`
- Rewrite: `frontend/components/admin/GroupDialog.tsx` → `RoleDialog.tsx`
- Modify: `frontend/components/admin/UserDrawer.tsx`
- Modify: `frontend/components/admin/UserTable.tsx`
- Modify: `frontend/components/user/ProfileInfo.tsx`
- Modify: `frontend/app/[locale]/(user)/dashboard/page.tsx`
- Modify: `frontend/messages/zh.json`, `en.json`, `ja.json`, `de.json`
- Modify: 管理后台路由页面（如果引用了 GroupList）

- [ ] **Step 1: AdminSidebar — 新权限码**

```typescript
const MENU_KEYS = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "userManagement", href: "/admin/users", permissions: ["admin.user.*"] },
  { key: "roleManagement", href: "/admin/roles", permissions: ["admin.role.*"] },
  { key: "articleManagement", href: "/admin/articles", permissions: ["admin.content.*"] },
  { key: "caseManagement", href: "/admin/cases", permissions: ["admin.case.*"] },
  { key: "categoryManagement", href: "/admin/categories", permissions: ["admin.category.*"] },
  { key: "universityManagement", href: "/admin/universities", permissions: ["admin.university.*"] },
  { key: "settings", href: "/admin/settings", permissions: ["admin.settings.*"] },
]
```

去掉 `superuserOnly` 属性。

- [ ] **Step 2: Header — isAdmin 逻辑**

使用新的 `isAdmin`（`hasAnyPermission("admin.*")`）。

- [ ] **Step 3: RoleList — 角色列表**

替代 GroupList，调用 `/api/roles` 端点。所有角色平等展示（无 system/custom tab）。

- [ ] **Step 4: RoleDialog — 树形权限编辑**

从 `/api/permissions` 获取扁平权限码列表，前端 `code.split('.')` 构建树。实现：
- 树形复选框（递归渲染）
- 勾叶子 → 自动勾祖先
- 一键全选某节点的所有子节点
- 保存时：某节点下全部叶子勾选 → 保存为通配符

- [ ] **Step 5: UserDrawer / UserTable — 角色分配**

- `group_id` → `role_id`，`group_name` → `role_name`
- 分配角色改为单选下拉
- 去掉 `change_type` 相关 UI

- [ ] **Step 6: ProfileInfo — 角色显示**

`user_type` / `group_name` 显示改为 `role_name`。

- [ ] **Step 7: i18n — 新增权限名称翻译**

在 4 个语言文件中添加所有权限码的翻译（`permission.admin.user.list` 等）。

- [ ] **Step 8: 管理后台路由**

`/admin/groups` 路由改为 `/admin/roles`，引用 RoleList 组件。

- [ ] **Step 9: Commit**

```
refactor: 前端所有组件适配新 RBAC
```

---

### Task 9: 单元测试适配

**目标：** 修复所有因 RBAC 重构而失败的单元测试。

**Files:**
- Modify: `backend/api/tests/conftest.py`
- Modify: 所有 `test_*.py` 文件中使用旧权限码的地方

- [ ] **Step 1: 修改 conftest.py fixtures**

- `superuser_headers`：permissions 改为 `*`，去掉 `X-Is-Superuser`、`X-User-Type`
- `staff_headers`：permissions 改为新的点分码
- `user_headers`：permissions 为空或 `user_center.profile.view`

- [ ] **Step 2: 批量替换测试中的权限码**

搜索所有 `member:manage`、`staff:manage`、`group:manage` 等旧码，替换为新码。

- [ ] **Step 3: 修复 RBAC 相关测试**

`test_rbac_service.py`、`test_rbac_repository.py`、`test_rbac_router.py` 全部重写适配新模型。

- [ ] **Step 4: 修复 admin 相关测试**

`test_admin_service.py`、`test_admin_service_extra.py`、`test_admin_router.py` 适配新权限码和角色分配。

- [ ] **Step 5: 修复其他 router 测试**

`test_content_router.py`、`test_config_router.py` 等适配新权限码。

- [ ] **Step 6: 运行全部单元测试**

```bash
cd backend/api && uv run pytest -m "not e2e" -v
```

Expected: ALL PASS

- [ ] **Step 7: Commit**

```
test: 单元测试适配新 RBAC
```

---

### Task 10: E2E 测试适配

**目标：** 修复所有 e2e 测试，适配新权限码和角色。

**Files:**
- Modify: `backend/api/tests/e2e/conftest.py`
- Modify: 所有 `tests/e2e/test_*.py`

- [ ] **Step 1: 修改 e2e conftest**

superuser_client 登录后的权限验证不再检查 `is_superuser`。

- [ ] **Step 2: 修改各模块 e2e 测试**

- RBAC 测试：`/groups` → `/roles`
- Admin 测试：去掉 user_type 相关测试
- Auth 测试：注册用户默认为 visitor 角色

- [ ] **Step 3: 启动容器并运行 e2e**

```bash
docker compose up --build -d
cd backend/api && uv run pytest tests/e2e/ -v
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```
test: e2e 测试适配新 RBAC
```

---

### Task 11: 数据库迁移执行 + 集成验证

**目标：** 运行迁移，验证完整链路。

- [ ] **Step 1: 备份数据库**

```bash
docker compose exec db pg_dump -U mudasky mudasky > backup.sql
```

- [ ] **Step 2: 运行迁移**

```bash
docker compose up --build -d
# API 容器启动时自动执行 alembic upgrade head + init_superuser
```

- [ ] **Step 3: 手动验证**

1. 浏览器登录 superuser
2. 进入权限管理页面，确认 5 个预置角色
3. 编辑角色权限，验证树形复选框联动
4. 新建用户，确认默认 visitor 角色
5. 分配角色，验证权限生效

- [ ] **Step 4: 运行全部测试**

```bash
uv run pytest -v          # 单元测试
uv run pytest tests/e2e/  # e2e 测试
```

- [ ] **Step 5: Commit（如有修复）**

```
fix: RBAC 重构集成修复
```
