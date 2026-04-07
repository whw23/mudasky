# RBAC + 用户中心 + 用户管理 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 RBAC 权限系统、用户中心自服务、管理后台用户管理和权限组管理。

**Architecture:** 后端新增 `rbac` 领域（models/schemas/repository/service/router），改造 `admin` 领域，User 模型新增 `user_type` 并删除 `role`。网关 JWT claims 增加 `permissions`/`user_type`/`is_superuser`，后端通过网关注入的请求头做权限校验。前端用户中心实现资料修改、密码、手机号、2FA 管理，管理后台实现用户管理和权限组管理页面。

**Tech Stack:** Python/FastAPI/SQLAlchemy（后端）、OpenResty/Lua（网关）、Next.js/React/shadcn-ui/next-intl（前端）

**Spec:** `docs/superpowers/specs/2026-04-07-rbac-user-center-design.md`

> **部署说明:** Task 1-8 涉及模型、Schema、依赖、网关的联动变更，必须作为原子单元一起部署。单独部署其中某个 Task 会导致 role 字段删除后 Schema 序列化失败或网关/后端头不匹配。

---

## 文件结构

### 后端新增

- `backend/shared/src/app/rbac/` — RBAC 领域
  - `models.py` — Permission, PermissionGroup, group_permission, user_group 模型
  - `schemas.py` — PermissionResponse, GroupCreate, GroupUpdate, GroupResponse
  - `repository.py` — 权限和权限组数据访问
  - `service.py` — RBAC 业务逻辑
  - `router.py` — `/permissions`, `/groups` 路由
  - `__init__.py`
- `backend/shared/src/app/admin/schemas.py` — Admin 请求/响应 Schema
- `backend/api/alembic/versions/xxxx_rbac_user_type.py` — 迁移文件

### 后端修改

- `backend/shared/src/app/user/models.py` — 新增 `user_type`，删除 `role`，添加 `groups` 关系
- `backend/shared/src/app/user/schemas.py` — UserResponse 移除 `role`，新增 `user_type`/`permissions`
- `backend/shared/src/app/user/repository.py` — 新增按 user_type 过滤查询
- `backend/shared/src/app/user/service.py` — `get_user` 返回权限信息
- `backend/shared/src/app/user/router.py` — 适配新 UserResponse 序列化
- `backend/shared/src/app/core/dependencies.py` — 替换 role 为 permissions 权限校验
- `backend/shared/src/app/auth/service.py` — register/auto_register 分配默认权限组
- `backend/shared/src/app/auth/schemas.py` — AuthResponse.user 增加 permissions/user_type
- `backend/shared/src/app/admin/service.py` — 重写用户管理逻辑
- `backend/shared/src/app/admin/router.py` — 新增用户管理端点
- `backend/api/src/api/main.py` — 挂载 rbac_router，更新 OpenAPI security schemes
- `backend/api/scripts/init_superuser.py` — 扩展为初始化权限+权限组+超级用户

### 网关修改

- `gateway/lua/auth.lua` — JWT 解析新增 permissions/user_type/is_superuser 头注入
- `gateway/lua/auth_proxy.lua` — JWT claims 写入 permissions/user_type/is_superuser
- `gateway/lua/refresh_proxy.lua` — 同上

### 前端新增

- `frontend/components/user/ProfileInfo.tsx` — 基本信息卡片
- `frontend/components/user/ChangePassword.tsx` — 修改密码卡片
- `frontend/components/user/ChangePhone.tsx` — 修改手机号卡片
- `frontend/components/user/TwoFactorSettings.tsx` — 2FA 管理卡片
- `frontend/components/admin/UserTable.tsx` — 用户列表表格
- `frontend/components/admin/UserDrawer.tsx` — 用户详情/编辑抽屉
- `frontend/components/admin/GroupList.tsx` — 权限组列表
- `frontend/components/admin/GroupDialog.tsx` — 权限组创建/编辑弹窗
- `frontend/hooks/use-permissions.ts` — 权限检查 hook

### 前端修改

- `frontend/types/index.ts` — User 类型更新，新增 Permission/Group 类型
- `frontend/contexts/AuthContext.tsx` — 增加 permissions/userType
- `frontend/components/layout/Header.tsx` — 管理后台入口按权限显示
- `frontend/components/layout/AdminSidebar.tsx` — 菜单按权限过滤，新增权限组管理入口
- `frontend/app/[locale]/(user)/profile/page.tsx` — 实现用户中心
- `frontend/app/[locale]/(admin)/admin/users/page.tsx` — 实现用户管理
- `frontend/app/[locale]/(admin)/admin/groups/page.tsx` — 新增权限组管理页
- `frontend/messages/zh.json` — 新增翻译
- `frontend/messages/en.json` — 新增翻译
- `frontend/messages/ja.json` — 新增翻译
- `frontend/messages/de.json` — 新增翻译

### 测试新增

- `backend/api/tests/test_rbac_service.py` — RBAC service 测试
- `backend/api/tests/test_admin_service.py` — Admin service 测试

---

## Task 1: RBAC 模型、User 模型改造与迁移

**Files:**

- Create: `backend/shared/src/app/rbac/__init__.py`
- Create: `backend/shared/src/app/rbac/models.py`
- Modify: `backend/shared/src/app/user/models.py`
- Modify: `backend/shared/src/app/user/schemas.py`
- Modify: `backend/shared/src/app/admin/service.py` (最小修复，移除 role 引用)
- Create: Alembic migration

- [ ] **Step 1: 创建 RBAC 模型文件**

创建 `backend/shared/src/app/rbac/__init__.py`（空文件）。

创建 `backend/shared/src/app/rbac/models.py`，包含：

- `Permission` 模型 — `id`, `code`(unique, indexed), `description`
- `PermissionGroup` 模型 — `id`, `name`(unique, indexed), `description`, `is_system`, `auto_include_all`, `created_at`, `updated_at`
- `group_permission` 关联表 — `(group_id, permission_id)` 联合主键，ON DELETE CASCADE
- `user_group` 关联表 — `(user_id, group_id)` 联合主键，ON DELETE CASCADE

- [ ] **Step 2: 修改 User 模型**

修改 `backend/shared/src/app/user/models.py`：

- 新增 `user_type = Column(String(10), nullable=False, default="student")`
- 删除 `role = Column(String(20), nullable=False, default="user")`
- 新增 `groups` relationship（通过 `user_group` 关联表关联 `PermissionGroup`，lazy="selectin"）

- [ ] **Step 3: 同步更新 UserResponse 和 AdminService**

修改 `backend/shared/src/app/user/schemas.py`：

- `UserResponse`：移除 `role: str`，新增 `user_type: str`，`permissions: list[str] = []`
- `UserAdminUpdate`：移除 `role: str | None`，新增 `user_type: str | None = None`

注意：`UserResponse` 的 `group_ids` 和 `permissions` 不能通过 `from_attributes` 自动填充。在 service 层手动构造 dict 传入，或在 UserResponse 中将这两个字段设为 `= []` 默认值，service 层查询后再填充。

修改 `backend/shared/src/app/admin/service.py`：

- `update_user` 方法中移除对 `user.role` 的赋值（约 line 40）

- [ ] **Step 4: 生成 Alembic 迁移**

```bash
docker compose exec api alembic revision --autogenerate -m "RBAC 权限表和 user_type 字段"
```

检查生成的迁移文件，确保：

- 创建 `permission`, `permission_group`, `group_permission`, `user_group` 表
- `user` 表新增 `user_type` 列（默认 `student`）
- `user` 表删除 `role` 列
- 关联表有正确的外键和 CASCADE

- [ ] **Step 5: 执行迁移验证**

```bash
docker compose exec api alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add backend/shared/src/app/rbac/ backend/shared/src/app/user/models.py backend/shared/src/app/user/schemas.py backend/shared/src/app/admin/service.py backend/api/alembic/
git commit -m "feat: RBAC 权限模型、User 模型改造和数据库迁移"
```

---

## Task 2: 初始化脚本（权限 + 权限组 + 超级用户）

**Files:**

- Modify: `backend/api/scripts/init_superuser.py`

- [ ] **Step 1: 扩展初始化脚本**

修改 `backend/api/scripts/init_superuser.py`：

- `init_permissions(session)` — 使用 `merge` 或先查后插方式插入 9 个权限记录（幂等）
- `init_groups(session)` — 创建 4 个预置权限组（is_system=True），关联对应权限（已存在则跳过）
- `init_superuser(session)` — 原有逻辑，设置 `user_type="staff"`
- 入口按顺序调用：init_permissions → init_groups → init_superuser

- [ ] **Step 2: 重启验证**

```bash
docker compose restart api
docker compose logs api --tail 20
```

确认权限、权限组、超级用户初始化成功。

- [ ] **Step 3: Commit**

```bash
git add backend/api/scripts/init_superuser.py
git commit -m "feat: 初始化脚本增加权限和权限组数据"
```

---

## Task 3: RBAC Repository、Service 和 Schemas

**Files:**

- Create: `backend/shared/src/app/rbac/repository.py`
- Create: `backend/shared/src/app/rbac/service.py`
- Create: `backend/shared/src/app/rbac/schemas.py`

- [ ] **Step 1: 创建 RBAC schemas**

创建 `backend/shared/src/app/rbac/schemas.py`：

- `PermissionResponse` — `id`, `code`, `description`
- `GroupCreate` — `name`, `description`, `permission_ids: list[str]`
- `GroupUpdate` — `name: str | None`, `description: str | None`, `permission_ids: list[str] | None`
- `GroupResponse` — `id`, `name`, `description`, `is_system`, `auto_include_all`, `permissions: list[PermissionResponse]`, `user_count: int`, `created_at`, `updated_at`

- [ ] **Step 2: 创建 RBAC repository**

创建 `backend/shared/src/app/rbac/repository.py`：

- `list_permissions(session)` — 查询所有权限
- `get_permissions_by_ids(session, perm_ids)` — 批量查询权限
- `list_groups(session)` — 查询所有权限组，含权限列表和用户计数
- `get_group_by_id(session, group_id)` — 权限组详情，含权限列表
- `get_group_by_name(session, name)` — 按名称查询
- `create_group(session, group)` — 创建权限组
- `update_group(session, group)` — 更新权限组
- `delete_group(session, group_id)` — 删除权限组
- `get_user_permissions(session, user_id)` — 查询用户所有权限（解析权限组，处理 auto_include_all：若用户属于任何 auto_include_all=True 的组，返回全部权限）
- `get_user_group_ids(session, user_id)` — 查询用户所属权限组 ID 列表
- `set_user_groups(session, user_id, group_ids)` — 设置用户的权限组（先删后插）
- `get_group_by_name_for_default(session, name)` — 用于注册时获取默认权限组

- [ ] **Step 3: 创建 RBAC service**

创建 `backend/shared/src/app/rbac/service.py`：

- `RbacService.__init__(session)` — 注入 session
- `list_permissions()` — 返回所有权限
- `list_groups()` — 返回所有权限组
- `get_group(group_id)` — 获取权限组详情，不存在抛 NotFoundException
- `create_group(data: GroupCreate)` — 创建权限组，名称重复抛 ConflictException
- `update_group(group_id, data: GroupUpdate)` — 编辑权限组，系统组名称不可改
- `delete_group(group_id)` — 删除权限组，系统组不可删抛 ForbiddenException
- `get_user_permissions(user_id)` — 返回用户权限代码列表
- `get_user_group_ids(user_id)` — 返回用户权限组 ID 列表
- `assign_user_groups(user_id, group_ids, operator_permissions, is_superuser)` — 分配权限组，校验权限约束规则

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/app/rbac/
git commit -m "feat: RBAC repository、service 和 schemas"
```

---

## Task 4: RBAC Router + 权限校验依赖改造

**Files:**

- Create: `backend/shared/src/app/rbac/router.py`
- Modify: `backend/shared/src/app/core/dependencies.py`
- Modify: `backend/shared/src/app/admin/router.py`
- Modify: `backend/api/src/api/main.py`

- [ ] **Step 1: 改造 dependencies.py**

修改 `backend/shared/src/app/core/dependencies.py`：

- 删除 `get_current_user_role` 和 `require_role`
- 删除 `CurrentUserRole` 类型别名
- 新增 `get_current_permissions(x_user_permissions: str = Header(""))` — 解析逗号分隔的权限列表为 `list[str]`，注意用 `[p for p in x_user_permissions.split(",") if p]` 过滤空字符串
- 新增 `get_current_user_type(x_user_type: str = Header("student"))` — 返回 user_type
- 新增 `get_is_superuser(x_is_superuser: str = Header("false"))` — 解析为 bool（`value.lower() == "true"`）
- 新增 `require_permission(*perms)` — 工厂函数，检查权限列表中是否包含**所有**所需权限，superuser 跳过
- 新增 `require_any_permission(*perms)` — 工厂函数，检查是否拥有**任一**权限，superuser 跳过
- 新增类型别名 `CurrentPermissions`, `CurrentUserType`, `IsSuperuser`

- [ ] **Step 2: 创建 RBAC router**

创建 `backend/shared/src/app/rbac/router.py`，前缀 `/`：

- `GET /permissions` — `Depends(require_permission("group:manage"))`
- `GET /groups` — `Depends(require_permission("group:manage"))`
- `POST /groups` — `Depends(require_permission("group:manage"))`
- `GET /groups/{group_id}` — `Depends(require_permission("group:manage"))`
- `PATCH /groups/{group_id}` — `Depends(require_permission("group:manage"))`
- `DELETE /groups/{group_id}` — `Depends(require_permission("group:manage"))`

- [ ] **Step 3: 更新 admin router 权限校验**

修改 `backend/shared/src/app/admin/router.py`：

- 移除 router 级别的 `Depends(require_role("admin"))`
- 各端点添加 `Depends(require_any_permission("student:manage", "staff:manage"))` 等

- [ ] **Step 4: 在 main.py 中挂载 rbac_router 并更新 OpenAPI**

修改 `backend/api/src/api/main.py`：

- 挂载 `rbac_router`
- 更新 OpenAPI security schemes（约 line 48-62）：将 `X-User-Role` 替换为 `X-User-Permissions`、`X-User-Type`、`X-Is-Superuser`

- [ ] **Step 5: Commit**

```bash
git add backend/shared/src/app/core/dependencies.py backend/shared/src/app/rbac/router.py backend/shared/src/app/admin/router.py backend/api/src/api/main.py
git commit -m "feat: RBAC 路由 + 权限校验依赖替换 role 为 permissions"
```

---

## Task 5: User/Auth Service 适配 RBAC

**Files:**

- Modify: `backend/shared/src/app/user/service.py`
- Modify: `backend/shared/src/app/user/router.py`
- Modify: `backend/shared/src/app/auth/schemas.py`
- Modify: `backend/shared/src/app/auth/service.py`
- Modify: `backend/shared/src/app/auth/router.py`

- [ ] **Step 1: 更新 UserService**

修改 `backend/shared/src/app/user/service.py`：

- `get_user` 方法中，查询用户后额外调用 `rbac_repo.get_user_permissions(session, user_id)` 和 `rbac_repo.get_user_group_ids(session, user_id)` 填充 `permissions` 和 `group_ids`
- 构造 UserResponse 时手动传入这些字段，不依赖 `from_attributes` 自动填充

- [ ] **Step 2: 更新 user/router.py 序列化**

修改 `backend/shared/src/app/user/router.py`：

- `get_me` 端点确保返回的 UserResponse 包含 `permissions`、`group_ids`、`user_type`（由 UserService.get_user 提供）

- [ ] **Step 3: 更新 AuthResponse 和 AuthService**

修改 `backend/shared/src/app/auth/schemas.py`：

- `AuthResponse.user` 类型确保包含 `permissions: list[str]`, `user_type: str`, `is_superuser: bool`, `is_active: bool`, `group_ids: list[str]` 字段

修改 `backend/shared/src/app/auth/service.py`：

- `register` 方法：创建用户后，查找 `student` 权限组并分配（调用 `rbac_repo.get_group_by_name_for_default` + `rbac_repo.set_user_groups`）
- `_auto_register` 方法：同上，注意此方法当前直接 `session.add(user)`，需改为通过 `user_repo.create` 后再分配权限组
- `login` 和 `refresh` 返回的 user dict 中包含 `permissions` 和 `group_ids`（调用 rbac_repo 查询）

修改 `backend/shared/src/app/auth/router.py`：

- 确保 register/login/refresh 端点返回的 AuthResponse 中 user 包含完整的权限信息

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/app/user/ backend/shared/src/app/auth/
git commit -m "feat: User/Auth service 适配 RBAC，AuthResponse 增加 permissions"
```

---

## Task 6: Admin Service 改造（用户管理增强）

**Files:**

- Create: `backend/shared/src/app/admin/schemas.py`
- Modify: `backend/shared/src/app/admin/service.py`
- Modify: `backend/shared/src/app/admin/router.py`

- [ ] **Step 1: 创建 Admin schemas**

创建 `backend/shared/src/app/admin/schemas.py`：

- `PasswordReset` — `password: str`
- `GroupAssignment` — `group_ids: list[str]`
- `UserTypeChange` — `user_type: str`（值限 `student`/`staff`）

- [ ] **Step 2: 重写 AdminService**

修改 `backend/shared/src/app/admin/service.py`：

- `list_users(session, user_type_filter, search, offset, limit)` — 按 user_type 过滤，支持手机号/用户名搜索
- `get_user(session, user_id)` — 获取用户详情含权限信息
- `update_user(session, user_id, data)` — 更新用户信息（is_active, storage_quota）
- `change_user_type(session, user_id, new_type)` — 修改 user_type
- `reset_password(session, user_id, new_password)` — 重置用户密码
- `assign_groups(session, user_id, group_ids, operator_permissions, is_superuser)` — 分配权限组（委托 RbacService）
- `force_logout(session, user_id)` — 删除用户所有 refresh_token
- `_check_target_permission(target_user, operator_permissions, is_superuser)` — 校验操作者是否有权操作目标用户（根据 user_type 检查 student:manage/staff:manage），superuser 跳过

- [ ] **Step 3: 重写 Admin Router**

修改 `backend/shared/src/app/admin/router.py`：

- `GET /admin/users` — 接收 `user_type`、`search` 查询参数
- `GET /admin/users/{user_id}` — 用户详情
- `PATCH /admin/users/{user_id}` — 编辑用户（is_active, storage_quota）
- `PATCH /admin/users/{user_id}/type` — 修改 user_type，需 `Depends(require_permission("student:manage", "staff:manage"))`
- `PUT /admin/users/{user_id}/password` — 重置密码，接收 `PasswordReset`
- `PUT /admin/users/{user_id}/groups` — 分配权限组，接收 `GroupAssignment`
- `DELETE /admin/users/{user_id}/tokens` — 强制下线

所有端点注入 `CurrentPermissions` 和 `IsSuperuser`，调用 `_check_target_permission` 校验。

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/app/admin/
git commit -m "feat: 管理后台用户管理增强（重置密码、分配权限组、强制下线）"
```

---

## Task 7: 网关 JWT 改造

**Files:**

- Modify: `gateway/lua/auth.lua`
- Modify: `gateway/lua/auth_proxy.lua`
- Modify: `gateway/lua/refresh_proxy.lua`

- [ ] **Step 1: 更新 auth_proxy.lua JWT 生成**

修改 `gateway/lua/auth_proxy.lua`（约 line 62-84）：

JWT access_token payload 改为：

```lua
payload = {
  sub = user.id,
  permissions = user.permissions or {},
  is_superuser = user.is_superuser or false,
  is_active = user.is_active,
  user_type = user.user_type or "student",
  type = "access",
  iat = now,
  exp = now + access_expire,
}
```

移除原有的 `group_ids` 和 `is_active`（保留 `is_active`）。

- [ ] **Step 2: 更新 refresh_proxy.lua JWT 生成**

修改 `gateway/lua/refresh_proxy.lua`（约 line 100-110），同 Step 1 修改 access_token claims。

- [ ] **Step 3: 更新 auth.lua 请求头注入**

修改 `gateway/lua/auth.lua`（约 line 70-76）：

替换现有的头注入（移除 `X-User-Role` 和 `X-User-Groups`）：

```lua
ngx.req.set_header("X-User-Id", payload.sub)
ngx.req.set_header("X-User-Type", payload.user_type or "student")
ngx.req.set_header("X-Is-Superuser", tostring(payload.is_superuser or false))

local perms = payload.permissions or {}
ngx.req.set_header("X-User-Permissions", table.concat(perms, ","))
```

- [ ] **Step 4: 重启网关验证**

```bash
docker compose restart gateway
```

- [ ] **Step 5: Commit**

```bash
git add gateway/lua/
git commit -m "feat: 网关 JWT claims 适配 RBAC（permissions/user_type/is_superuser）"
```

---

## Task 8: 后端 Service 层测试

**Files:**

- Create: `backend/api/tests/test_rbac_service.py`
- Create: `backend/api/tests/test_admin_service.py`

- [ ] **Step 1: 编写 RBAC service 测试**

创建 `backend/api/tests/test_rbac_service.py`：

- 测试创建权限组（正常 + 名称重复冲突）
- 测试编辑权限组（正常 + 系统组名称不可改）
- 测试删除权限组（正常 + 系统组不可删）
- 测试 `auto_include_all` 行为（global_admin 返回所有权限）
- 测试权限组分配约束规则

- [ ] **Step 2: 编写 Admin service 测试**

创建 `backend/api/tests/test_admin_service.py`：

- 测试 `_check_target_permission`（student:manage 操作 student 用户 OK，操作 staff 用户被拒）
- 测试 user_type 修改权限校验（需同时拥有两个权限）
- 测试权限组分配转发逻辑
- 测试强制下线（refresh_token 清除）

- [ ] **Step 3: 运行测试**

```bash
docker compose exec api pytest tests/ -v
```

- [ ] **Step 4: Commit**

```bash
git add backend/api/tests/
git commit -m "test: RBAC 和 Admin service 层单元测试"
```

---

## Task 9: 前端 AuthContext、类型和权限控制

**Files:**

- Modify: `frontend/types/index.ts`
- Modify: `frontend/contexts/AuthContext.tsx`
- Create: `frontend/hooks/use-permissions.ts`
- Modify: `frontend/components/layout/Header.tsx`
- Modify: `frontend/components/layout/AdminSidebar.tsx`

- [ ] **Step 1: 更新前端 User 类型**

修改 `frontend/types/index.ts`：

- `User` 接口：移除 `role`，新增 `user_type: string`，`permissions: string[]`
- 新增 `Permission` 接口：`id`, `code`, `description`
- 新增 `PermissionGroup` 接口：`id`, `name`, `description`, `is_system`, `auto_include_all`, `permissions: Permission[]`, `user_count: number`

- [ ] **Step 2: 更新 AuthContext**

修改 `frontend/contexts/AuthContext.tsx`：

- `AuthContextType` 增加 `permissions: string[]` 和 `userType: string`
- `AuthProvider` 中从 `user` 对象解析 `permissions` 和 `user_type`

- [ ] **Step 3: 创建权限检查 hook**

创建 `frontend/hooks/use-permissions.ts`：

```typescript
export function usePermissions() {
  const { user } = useAuth()
  const hasPermission = (perm: string) =>
    user?.is_superuser || user?.permissions?.includes(perm) || false
  const hasAnyPermission = (...perms: string[]) =>
    user?.is_superuser || perms.some(p => user?.permissions?.includes(p)) || false
  const isAdmin = hasAnyPermission(
    "student:manage", "staff:manage", "group:manage",
    "post:manage", "blog:manage", "category:manage",
    "document:manage"
  )
  return { hasPermission, hasAnyPermission, isAdmin }
}
```

- [ ] **Step 4: 更新 Header**

修改 `frontend/components/layout/Header.tsx`：

- 管理后台链接的显示条件从 `user.role === "admin"` 改为 `isAdmin`（使用 `usePermissions` hook）

- [ ] **Step 5: 更新 AdminSidebar**

修改 `frontend/components/layout/AdminSidebar.tsx`：

- 新增权限组管理菜单项（`/admin/groups`，需 `group:manage`）
- 菜单项增加权限要求映射，根据权限过滤显示：
  - 仪表盘：任意管理权限可见
  - 用户管理：需 `student:manage` 或 `staff:manage`
  - 权限组管理：需 `group:manage`
  - 文章管理：需 `post:manage` 或 `blog:manage`
  - 分类管理：需 `category:manage`

- [ ] **Step 6: Commit**

```bash
git add frontend/types/ frontend/contexts/ frontend/hooks/ frontend/components/layout/
git commit -m "feat: 前端权限控制（类型更新 + AuthContext + usePermissions + 导航过滤）"
```

---

## Task 10: 前端用户中心页面

**Files:**

- Create: `frontend/components/user/ProfileInfo.tsx`
- Create: `frontend/components/user/ChangePassword.tsx`
- Create: `frontend/components/user/ChangePhone.tsx`
- Create: `frontend/components/user/TwoFactorSettings.tsx`
- Modify: `frontend/app/[locale]/(user)/profile/page.tsx`

- [ ] **Step 1: 创建 ProfileInfo 组件**

基本信息卡片：

- 显示用户名（可编辑 inline）、手机号（只读）、用户类型（只读标签）、所属权限组（只读标签列表）
- 编辑用户名调用 `PATCH /api/users/me`
- 使用 `useTranslations("Profile")` 获取翻译

- [ ] **Step 2: 创建 ChangePassword 组件**

修改密码卡片：

- 表单：旧密码 + 新密码 + 确认密码
- 提交调用 `PUT /api/users/me/password`
- 成功后显示 toast 提示

- [ ] **Step 3: 创建 ChangePhone 组件**

修改手机号卡片：

- 表单：新手机号 + 短信验证码（使用已有 SmsCodeButton）
- 提交调用 `PUT /api/users/me/phone`

- [ ] **Step 4: 创建 TwoFactorSettings 组件**

2FA 管理卡片：

- 未开启状态：显示"开启二步验证"按钮
  - 点击调用 `POST /api/users/me/2fa/enable`，返回 QR 码图片
  - 显示 QR 码 + TOTP 输入框，确认调用 `POST /api/users/me/2fa/confirm`
- 已开启状态：显示"关闭二步验证"按钮
  - 点击弹出密码确认框，调用 `POST /api/users/me/2fa/disable`

- [ ] **Step 5: 组装 Profile 页面**

修改 `frontend/app/[locale]/(user)/profile/page.tsx`：

- 改为客户端组件
- 卡片式布局，依次渲染四个组件
- 使用 `useAuth` 获取用户信息

- [ ] **Step 6: Commit**

```bash
git add frontend/components/user/ frontend/app/
git commit -m "feat: 前端用户中心页面（资料、密码、手机号、2FA）"
```

---

## Task 11: 前端管理后台 — 用户管理页面

**Files:**

- Create: `frontend/components/admin/UserTable.tsx`
- Create: `frontend/components/admin/UserDrawer.tsx`
- Modify: `frontend/app/[locale]/(admin)/admin/users/page.tsx`

- [ ] **Step 1: 创建 UserTable 组件**

用户列表表格：

- 列：用户名、手机号、类型（student/staff 标签）、状态（启用/禁用标签）、权限组（标签列表）、注册时间
- 顶部：搜索框（手机号/用户名）+ user_type 筛选 Tab
- 底部：分页（使用已有 Pagination 组件）
- 点击行打开 UserDrawer
- 调用 `GET /api/admin/users?user_type=xxx&search=xxx&page=xxx`

- [ ] **Step 2: 创建 UserDrawer 组件**

用户详情/编辑抽屉：

- 用户基本信息展示
- 操作区域（按操作者权限显示/隐藏）：
  - 禁用/启用开关 — `PATCH /api/admin/users/{id}`
  - 权限组分配 — 多选 checkbox，`PUT /api/admin/users/{id}/groups`
  - 存储配额调整 — 数字输入，`PATCH /api/admin/users/{id}`
  - 重置密码 — 输入新密码，`PUT /api/admin/users/{id}/password`
  - 修改用户类型 — select，`PATCH /api/admin/users/{id}/type`
  - 强制下线按钮 — `DELETE /api/admin/users/{id}/tokens`

- [ ] **Step 3: 组装用户管理页面**

修改 `frontend/app/[locale]/(admin)/admin/users/page.tsx`：

- 改为客户端组件
- 渲染 UserTable，管理 drawer 状态

- [ ] **Step 4: Commit**

```bash
git add frontend/components/admin/ frontend/app/
git commit -m "feat: 前端管理后台用户管理页面"
```

---

## Task 12: 前端管理后台 — 权限组管理页面

**Files:**

- Create: `frontend/components/admin/GroupList.tsx`
- Create: `frontend/components/admin/GroupDialog.tsx`
- Create: `frontend/app/[locale]/(admin)/admin/groups/page.tsx`

- [ ] **Step 1: 创建 GroupList 组件**

权限组列表：

- 卡片或表格，显示：组名、描述、权限数、用户数
- 系统预置组显示"系统"标识，不显示删除按钮
- 点击编辑打开 GroupDialog
- "新建权限组"按钮打开 GroupDialog
- 调用 `GET /api/groups`

- [ ] **Step 2: 创建 GroupDialog 组件**

权限组创建/编辑弹窗：

- 表单：组名 + 描述 + 权限勾选列表
- 权限列表通过 `GET /api/permissions` 获取
- 创建模式调用 `POST /api/groups`
- 编辑模式调用 `PATCH /api/groups/{id}`
- 系统组的名称字段只读

- [ ] **Step 3: 创建权限组管理页面**

创建 `frontend/app/[locale]/(admin)/admin/groups/page.tsx`：

- 渲染 GroupList 组件

- [ ] **Step 4: Commit**

```bash
git add frontend/components/admin/ frontend/app/
git commit -m "feat: 前端管理后台权限组管理页面"
```

---

## Task 13: i18n 翻译

**Files:**

- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: 添加翻译键**

在四个语言文件中添加以下命名空间的翻译：

- `Profile` — 用户中心相关（基本信息、修改密码、修改手机号、2FA 管理）
- `AdminUsers` — 用户管理相关（表格列标题、操作按钮、筛选选项）
- `AdminGroups` — 权限组管理相关（列表、弹窗表单、权限勾选）
- `Permissions` — 9 个权限的展示名称和描述
- 更新 `Admin` — 侧边栏新增"权限组管理"菜单项
- 更新 `User` — 用户类型标签等

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/
git commit -m "feat: i18n 翻译增加 RBAC 和用户管理相关文本"
```

---

## Task 14: 端到端验证与清理

- [ ] **Step 1: 重启所有服务**

```bash
docker compose down && docker compose up -d
```

- [ ] **Step 2: 验证初始化**

```bash
docker compose logs api --tail 30
```

确认权限、权限组、超级用户初始化成功。

- [ ] **Step 3: 验证登录 JWT**

用超级用户登录，检查 Cookie 中的 access_token JWT claims 包含 `permissions`、`user_type`、`is_superuser`。

- [ ] **Step 4: 验证用户中心**

- 访问 `/profile`，确认四个卡片正常显示
- 测试修改用户名、修改密码功能

- [ ] **Step 5: 验证管理后台**

- 访问 `/admin/users`，确认用户列表加载
- 访问 `/admin/groups`，确认权限组列表显示 4 个预置组
- 测试创建新权限组、分配权限

- [ ] **Step 6: 验证权限控制**

- 非管理权限用户不应看到"管理后台"入口
- `student:manage` 用户不应能操作 staff 用户

- [ ] **Step 7: 构建验证**

```bash
cd frontend && npx next build
```

确认无 TypeScript 错误。

- [ ] **Step 8: Commit 任何修复**

如有修复，提交：

```bash
git add -A
git commit -m "fix: 端到端验证修复"
```
