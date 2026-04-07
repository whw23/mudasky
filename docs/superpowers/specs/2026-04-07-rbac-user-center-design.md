# RBAC 权限系统 + 用户中心 + 用户管理 设计文档

## 概述

为 mudasky 教育机构 Web 应用实现完整的权限管理体系，包括：

1. **RBAC 权限系统** — Permission → PermissionGroup → User 三级模型
2. **用户中心** — 用户自服务（修改资料、密码、手机号、2FA）
3. **管理后台用户管理** — 用户列表、禁用、重置密码、分配权限组、强制下线
4. **权限组管理** — 权限组 CRUD、配置权限列表

## 权限设计

### 权限列表（9 个，模块级粒度）

| 权限代码           | 说明                                         |
|--------------------|----------------------------------------------|
| `student:manage`   | 管理学员（查看、禁用、重置密码、分配权限组） |
| `staff:manage`     | 管理内部员工（同上，对象为员工）             |
| `group:manage`     | 管理权限组 CRUD                              |
| `post:manage`      | 管理机构推文（发布/编辑/删除官网内容）       |
| `blog:manage`      | 管理所有学生博客（审核/编辑/删除）           |
| `blog:write`       | 发布/编辑自己的博客                          |
| `category:manage`  | 管理分类                                     |
| `document:manage`  | 管理所有用户文档                             |
| `document:upload`  | 上传/管理自己的文档                          |

### 预置权限组（4 个）

| 权限组             | 包含权限                                              | 说明                         |
|--------------------|-------------------------------------------------------|------------------------------|
| `global_admin`     | 全部（auto_include_all=true）                         | 全局管理员，新增权限自动包含 |
| `content_editor`   | `post:manage` + `blog:manage` + `category:manage`     | 内容编辑                     |
| `student_advisor`  | `student:manage` + `blog:manage` + `document:manage`  | 留学顾问                     |
| `student`          | `blog:write` + `document:upload`                      | 学员                         |

### 用户类型

User 模型新增 `user_type` 字段，值为 `student`（默认）或 `staff`。

- `student:manage` 只能操作 `user_type=student` 的用户
- `staff:manage` 只能操作 `user_type=staff` 的用户
- `is_superuser` 跳过所有权限检查

### 权限约束规则

- **权限组分配限制**：分配权限组时，操作者只能分配自己也拥有的权限对应的权限组，或者操作者拥有 `group:manage` 权限，或者是 superuser。防止低权限用户给他人分配高权限组
- **user_type 修改限制**：修改用户的 `user_type` 需要同时拥有 `student:manage` 和 `staff:manage`，或者是 superuser。防止单一管理权限的用户将管理对象移出自己的管辖范围
- **新用户默认权限组**：注册用户自动分配 `student` 权限组

## 数据模型

### 新增表

#### permission 表

| 字段        | 类型          | 说明           |
|-------------|---------------|----------------|
| id          | UUID          | 主键           |
| code        | VARCHAR(50)   | 权限代码，唯一 |
| description | VARCHAR(200)  | 权限描述       |

#### permission_group 表

| 字段             | 类型          | 说明                                 |
|------------------|---------------|--------------------------------------|
| id               | UUID          | 主键                                 |
| name             | VARCHAR(50)   | 组名，唯一                           |
| description      | VARCHAR(200)  | 描述                                 |
| is_system        | BOOLEAN       | 系统预置组不可删除                   |
| auto_include_all | BOOLEAN       | 自动包含所有权限（global_admin 用）  |
| created_at       | TIMESTAMP     | 创建时间                             |
| updated_at       | TIMESTAMP     | 更新时间，nullable                   |

#### group_permission 关联表

| 字段          | 类型                         | 约束               |
|---------------|------------------------------|--------------------|
| group_id      | UUID, FK → permission_group  | ON DELETE CASCADE  |
| permission_id | UUID, FK → permission        | ON DELETE CASCADE  |

联合主键 `(group_id, permission_id)`。

#### user_group 关联表

| 字段     | 类型                         | 约束               |
|----------|------------------------------|--------------------|
| user_id  | UUID, FK → user              | ON DELETE CASCADE  |
| group_id | UUID, FK → permission_group  | ON DELETE CASCADE  |

联合主键 `(user_id, group_id)`。

### user 表修改

- 新增 `user_type: VARCHAR(10)`，默认 `student`
- 删除 `role: VARCHAR(20)`（被权限组替代）

### Schema 变更

**UserResponse** — 移除 `role`，新增 `user_type: str`，`permissions: list[str]`（解析后的权限列表），保留 `group_ids: list[str]`

**UserAdminUpdate** — 移除 `role`，新增 `user_type: str | None`

## JWT Claims 与网关

### access_token claims

```json
{
  "sub": "user_id",
  "permissions": ["post:manage", "blog:manage", "category:manage"],
  "is_superuser": false,
  "is_active": true,
  "user_type": "staff",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234567890
}
```

说明：

- `permissions`：后端登录/刷新响应中返回的扁平权限列表，网关原样写入 JWT
- `is_active`：保留，网关用于拦截已禁用用户的请求
- `is_superuser`：superuser 跳过所有权限检查
- `user_type`：后端用于判断用户管理操作权限
- 移除 `group_ids`：前端通过 `/api/users/me` 获取，不放入 JWT 减少体积

### 网关注入请求头

auth.lua 验证 JWT 后注入：

- `X-User-Id` — 保持不变
- `X-User-Permissions` — 逗号分隔的权限列表（替代 `X-User-Groups`）
- `X-User-Type` — student/staff
- `X-Is-Superuser` — true/false

移除现有 `X-User-Groups` 和 `X-User-Role` 头。保留 `is_active` 校验逻辑（已禁用用户返回 401）。

### 网关 JWT 生成

auth_proxy.lua 和 refresh_proxy.lua 从后端响应中读取用户信息写入 JWT claims：

- `user.permissions` → JWT `permissions`（扁平权限列表，后端已从权限组解析）
- `user.is_superuser` → JWT `is_superuser`
- `user.is_active` → JWT `is_active`
- `user.user_type` → JWT `user_type`

### 后端 AuthResponse 变更

后端登录/刷新响应必须返回完整的用户信息供网关构建 JWT：

```json
{
  "user": {
    "id": "uuid",
    "permissions": ["post:manage", "blog:manage"],
    "is_superuser": false,
    "is_active": true,
    "user_type": "staff",
    "group_ids": ["uuid1", "uuid2"]
  }
}
```

`permissions` 由后端从用户所属权限组解析（考虑 `auto_include_all` 组），网关不做权限解析。

### 后端 dependencies.py

```python
CurrentUserId       # 从 X-User-Id
CurrentPermissions  # 从 X-User-Permissions，解析为 list[str]
CurrentUserType     # 从 X-User-Type
IsSuperuser         # 从 X-Is-Superuser

def require_permission(*perms):
    """校验权限，superuser 跳过"""
```

替代现有 `get_current_user_role` 和 `require_role`。

### 权限变更生效时机

权限变更（分配/移除权限组）后，用户的 JWT 仍包含旧权限直到 access_token 过期（15 分钟）。如需立即生效，管理员可使用"强制下线"功能清除用户的 refresh token，用户下次刷新时将获取更新后的权限。

## 后端 API

### RBAC 领域（新增 `backend/shared/src/app/rbac/`）

| 方法   | 路径               | 权限           | 说明                         |
|--------|--------------------|----------------|------------------------------|
| GET    | `/api/permissions` | `group:manage` | 获取所有权限列表             |
| GET    | `/api/groups`      | `group:manage` | 权限组列表                   |
| POST   | `/api/groups`      | `group:manage` | 创建权限组                   |
| GET    | `/api/groups/{id}` | `group:manage` | 权限组详情（含权限列表）     |
| PATCH  | `/api/groups/{id}` | `group:manage` | 编辑权限组                   |
| DELETE | `/api/groups/{id}` | `group:manage` | 删除权限组（系统预置不可删） |

### 用户管理（改造 admin 路由）

| 方法   | 路径                             | 权限                                | 说明                                                 |
|--------|----------------------------------|-------------------------------------|------------------------------------------------------|
| GET    | `/api/admin/users`               | `student:manage` 或 `staff:manage`  | 用户列表（按 user_type 过滤，只返回有权管理的用户）  |
| GET    | `/api/admin/users/{id}`          | `student:manage` 或 `staff:manage`  | 用户详情                                             |
| PATCH  | `/api/admin/users/{id}`          | `student:manage` 或 `staff:manage`  | 编辑用户（禁用/启用、调整配额）                      |
| PATCH  | `/api/admin/users/{id}/type`     | `student:manage` + `staff:manage`   | 修改 user_type（需同时拥有两个权限）                 |
| PUT    | `/api/admin/users/{id}/password` | `student:manage` 或 `staff:manage`  | 重置用户密码                                         |
| PUT    | `/api/admin/users/{id}/groups`   | `student:manage` 或 `staff:manage`  | 分配权限组（受权限约束规则限制）                     |
| DELETE | `/api/admin/users/{id}/tokens`   | `student:manage` 或 `staff:manage`  | 强制下线（清除 refresh token）                       |

操作前校验：目标用户 `user_type=student` 需要 `student:manage`，`user_type=staff` 需要 `staff:manage`。superuser 操作不受限。

### 用户中心

现有 `/api/users/me/*` 路由无需权限校验，登录即可操作自己的资料。

## 前端页面

### 用户中心 `/profile`

卡片式布局：

1. **基本信息卡片** — 用户名（可编辑）、手机号、用户类型、所属权限组（只读标签）
2. **修改密码卡片** — 旧密码 + 新密码 + 确认密码
3. **修改手机号卡片** — 新手机号 + 短信验证码
4. **二步验证卡片** — 开启显示 QR 码 + TOTP 确认；关闭需密码确认

### 管理后台 — 用户管理 `/admin/users`

1. **用户列表页** — 表格（用户名、手机号、类型、状态、权限组、注册时间）+ 搜索 + user_type 筛选 + 分页
2. **用户详情/编辑抽屉** — 禁用/启用、分配权限组、调整配额、重置密码、修改 user_type、强制下线

### 管理后台 — 权限组管理 `/admin/groups`

1. **权限组列表页** — 组名、描述、权限数、用户数。系统组标识不可删
2. **创建/编辑权限组弹窗** — 组名 + 描述 + 权限勾选列表

### 前端权限控制

- `AuthContext` 增加 `permissions` 和 `userType` 字段（从 `/api/users/me` 获取）
- 导航菜单根据权限动态显示/隐藏（无管理侧权限则不显示"管理后台"入口）
- 管理后台侧边栏菜单项按权限过滤

### i18n

所有新增文本加入 zh/en/ja/de 四语言翻译文件。

## 初始化与迁移

### 数据库迁移

一个 Alembic 迁移：

- 创建 `permission`、`permission_group`、`group_permission`、`user_group` 四张表
- `user` 表新增 `user_type` 字段（默认 `student`）
- `user` 表删除 `role` 字段

### 初始化脚本

扩展 `init_superuser.py`，启动时执行：

1. 初始化 9 个权限记录（`INSERT ON CONFLICT DO NOTHING`，幂等）
2. 创建 4 个预置权限组并关联权限（`is_system=true`）
3. 创建超级用户（`user_type=staff`）
4. 新注册用户自动分配 `student` 权限组（在 auth service 的 register 和 auto_register 流程中处理）
