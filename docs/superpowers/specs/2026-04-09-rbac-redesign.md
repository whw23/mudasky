# RBAC 权限系统重构设计

## 背景

现有 RBAC 系统存在以下问题：

- 权限码扁平（如 `member:manage`），无法对应前端页面层级结构
- `is_superuser` 和 `is_system` 标记位导致角色不平等，逻辑分叉多
- `auto_include_all` 是特殊逻辑，新增权限时容易遗漏
- PermissionGroup 命名与实际"角色"概念不匹配

## 目标

- 角色平等：superuser、website_admin、student 等全部是普通角色，无特殊标记
- 权限树形化：点分权限码（`admin.user.list`）表达层级，当前 3 层，设计支持 N 层
- 通配符：`*`、`admin.*`、`admin.user.*` 支持批量授权
- 前端树形复选框分配权限，支持多级联动和一键勾选
- 前后端同时控制：权限码既控制 API 访问，也控制前端 UI 显示

## 数据模型

### Permission 表

```
Permission
├── id: UUID (PK)
├── code: str (唯一索引，点分层级，如 "admin.user.list")
├── name_key: str (i18n key，如 "permission.admin.user.list")
└── description: str
```

层级关系由 `code` 的点分结构表达，不需要 `parent_id`。前端通过 `code.split('.')` 构建树。

### Role 表（替代 PermissionGroup）

```
Role
├── id: UUID (PK)
├── name: str (唯一索引，如 "superuser")
├── description: str
├── created_at: datetime
├── updated_at: datetime
└── permissions: [Permission] (多对多，通过 role_permission 关联表)
```

去掉 `is_system`、`auto_include_all`。所有角色平等。

**内置角色保护**：`superuser` 和 `visitor` 角色禁止删除（按名称硬编码保护），防止锁定所有用户。

### role_permission 关联表

```
role_permission
├── role_id: UUID (FK → Role)
└── permission_id: UUID (FK → Permission)
```

**特殊权限码**：通配符（如 `*`、`admin.*`）也作为 Permission 记录存储在表中，在检查时动态匹配。

### User 表变更

```
变更：
- group_id → role_id (FK → Role，nullable，SET NULL on delete)
- 删除 is_superuser 字段
- 删除 user_type 字段（由 role 替代，角色名即用户类型）
- two_factor_method 等其他字段不变
```

**角色删除行为**：删除角色时，受影响用户自动分配 `visitor` 角色（而非 SET NULL），确保用户始终有基本访问权限。

用户注册时默认分配 `visitor` 角色。

### user_type 移除说明

`user_type`（student/staff/guest）被角色完全替代。影响的消费方：

- **Gateway `auth.lua`**：去掉 `X-User-Type` header 注入
- **Gateway `auth_proxy.lua`**：JWT payload 去掉 `user_type` 字段
- **Backend `dependencies.py`**：删除 `get_current_user_type` 依赖
- **Backend `admin/router.py`**：`change_user_type` 端点删除（由 `assign_role` 替代）
- **Frontend**：所有 `user.user_type` 引用改为 `user.role_name`

## 权限树结构

```
user_center                              # 用户中心
├── user_center.profile                  # 个人资料
│   ├── user_center.profile.view         # 查看个人信息
│   ├── user_center.profile.edit         # 编辑个人信息
│   ├── user_center.profile.password     # 修改密码
│   └── user_center.profile.phone        # 修改手机号
├── user_center.two_factor               # 两步验证
│   ├── user_center.two_factor.totp      # 启用 TOTP
│   ├── user_center.two_factor.sms       # 启用短信验证
│   └── user_center.two_factor.disable   # 关闭两步验证
├── user_center.document                 # 文档管理
│   ├── user_center.document.upload      # 上传文档
│   ├── user_center.document.list        # 查看文档列表
│   └── user_center.document.delete      # 删除文档
└── user_center.article                  # 文章投稿
    ├── user_center.article.create       # 发布文章
    ├── user_center.article.edit         # 编辑自己的文章
    └── user_center.article.delete       # 删除自己的文章

admin                                    # 管理后台
├── admin.user                           # 用户管理
│   ├── admin.user.list                  # 查看用户列表
│   ├── admin.user.edit                  # 编辑用户信息
│   ├── admin.user.toggle_active         # 禁用/启用用户
│   ├── admin.user.reset_password        # 重置密码
│   └── admin.user.assign_role           # 分配角色
├── admin.content                        # 文章管理
│   ├── admin.content.list               # 查看所有文章
│   ├── admin.content.edit               # 编辑任意文章
│   └── admin.content.delete             # 删除任意文章
├── admin.category                       # 分类管理
│   ├── admin.category.create            # 创建分类
│   ├── admin.category.edit              # 编辑分类
│   └── admin.category.delete            # 删除分类
├── admin.case                           # 案例管理
│   ├── admin.case.create                # 创建案例
│   ├── admin.case.edit                  # 编辑案例
│   └── admin.case.delete                # 删除案例
├── admin.university                     # 院校管理
│   ├── admin.university.create          # 创建院校
│   ├── admin.university.edit            # 编辑院校
│   └── admin.university.delete          # 删除院校
├── admin.role                           # 权限管理
│   ├── admin.role.list                  # 查看角色列表
│   ├── admin.role.create                # 创建角色
│   ├── admin.role.edit                  # 编辑角色权限
│   └── admin.role.delete                # 删除角色
└── admin.settings                       # 系统设置
    ├── admin.settings.view              # 查看配置
    └── admin.settings.edit              # 修改配置
```

### 中间节点说明

`user_center`、`admin`、`admin.user` 等中间节点**不存储为 Permission 记录**，它们是纯前端虚拟树节点。数据库中只存储叶子权限码和通配符权限码。

`require_permission()` 只能用叶子码或通配符，**禁止**用中间码（如 `admin.user`）。

## JWT 权限传递

JWT payload 中 `permissions` 数组存储角色关联的权限码原样（含通配符）：
- superuser 的 JWT：`permissions: ["*"]`
- website_admin：`permissions: ["admin.*", "user_center.*"]`
- 自定义角色：`permissions: ["admin.user.list", "admin.user.edit", "user_center.*"]`

不展开通配符，保持 JWT 体积小。

去掉 JWT 中的 `is_superuser` 和 `user_type` 字段。

## 通配符权限

通配符也作为 Permission 记录存储，在权限检查时动态匹配：

```python
def has_permission(user_perms: list[str], required: str) -> bool:
    for perm in user_perms:
        if perm == "*":
            return True
        if perm.endswith(".*"):
            prefix = perm[:-1]  # "admin.*" → "admin."
            if required.startswith(prefix):
                return True
        if perm == required:
            return True
    return False
```

通配符权限码列表（存储在 Permission 表中）：

```
*                        # 全局通配（superuser 用）
admin.*                  # 管理后台全部
admin.user.*             # 用户管理全部
admin.content.*          # 文章管理全部
admin.category.*         # 分类管理全部
admin.case.*             # 案例管理全部
admin.university.*       # 院校管理全部
admin.role.*             # 权限管理全部
admin.settings.*         # 系统设置全部
user_center.*            # 用户中心全部
user_center.profile.*    # 个人资料全部
user_center.two_factor.* # 两步验证全部
user_center.document.*   # 文档管理全部
user_center.article.*    # 文章投稿全部
```

角色分配通配符时，等同于勾选该节点下所有子权限。

## 预置角色

| 角色 | 描述 | 分配的权限 |
|------|------|-----------|
| superuser | 超级管理员 | `*` |
| website_admin | 网站管理员 | `admin.*`, `user_center.*` |
| student_advisor | 留学顾问 | `admin.user.*`, `admin.content.*`, `admin.case.*`, `user_center.*` |
| student | 学生用户 | `user_center.*` |
| visitor | 访客 | `user_center.profile.view` |

## 权限检查流程

### Gateway 层

不变：从 JWT payload 读取 `permissions` 数组，注入 `X-User-Permissions` header。

JWT payload 中 `is_superuser` 字段去掉，改为检查权限列表中是否包含 `*`。

### 后端 API 层

```python
# core/dependencies.py

def require_permission(*perms: str):
    """要求用户拥有所有指定权限。"""
    def checker(permissions: CurrentPermissions):
        for p in perms:
            if not has_permission(permissions, p):
                raise ForbiddenException(message="权限不足")
    return Depends(checker)

def require_any_permission(*perms: str):
    """要求用户拥有任一指定权限。"""
    def checker(permissions: CurrentPermissions):
        if not any(has_permission(permissions, p) for p in perms):
            raise ForbiddenException(message="权限不足")
    return Depends(checker)
```

各 router 的权限检查从旧权限码迁移到新的点分码：

| 旧 | 新 |
|----|-----|
| `member:manage` | `admin.user.*` 或具体叶子 |
| `staff:manage` | `admin.user.change_type` |
| `post:manage` | `admin.content.*` |
| `blog:manage` | `admin.content.*` |
| `blog:write` | `user_center.article.create` |
| `category:manage` | `admin.category.*` |
| `document:manage` | `admin.user.*`（管理他人文档） |
| `document:upload` | `user_center.document.upload` |
| `group:manage` | `admin.role.*` |
| `require_superuser()` | `admin.settings.view` / `admin.settings.edit` |

### 前端

```typescript
// hooks/use-permissions.ts
function hasPermission(perm: string): boolean {
  if (!user?.permissions) return false
  for (const p of user.permissions) {
    if (p === "*") return true
    if (p.endsWith(".*") && perm.startsWith(p.slice(0, -1))) return true
    if (p === perm) return true
  }
  return false
}
```

侧边栏、页面、按钮根据权限码过滤显示。

## 前端权限树 UI

### 角色编辑页面

后端返回扁平的权限码列表，前端通过 `code.split('.')` 动态构建树：

```
GET /api/permissions → [
  { code: "admin.user.list", name_key: "permission.admin.user.list" },
  { code: "admin.user.edit", name_key: "permission.admin.user.edit" },
  ...
]
```

前端将其组装为嵌套树结构，渲染为树形复选框。

### 联动规则

- **勾叶子** → 自动勾所有祖先节点（递归向上）
- **一键勾选** → 点击某节点的全选按钮，勾选所有子孙节点
- **取消节点** → 如果取消的是叶子，检查兄弟是否全空，是则取消父节点（递归向上）
- **显示规则** → 某节点的所有子节点都未勾选，则不显示该节点（前端 UI 隐藏用）

### 通配符与树形勾选的关系

在角色编辑保存时：
- 如果某节点下所有叶子都勾选了，保存为该节点的通配符（如 `admin.user.*`）而非逐个叶子
- 如果部分叶子勾选，保存具体的叶子权限码
- 前端加载角色权限时，通配符展开显示为所有子节点勾选

## API 变更

### 新端点（替代旧 RBAC 端点）

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/permissions` | GET | `admin.role.list` | 获取所有权限码（扁平列表） |
| `/api/roles` | GET | `admin.role.list` | 获取所有角色列表 |
| `/api/roles` | POST | `admin.role.create` | 创建角色 |
| `/api/roles/{id}` | GET | `admin.role.list` | 获取角色详情（含权限列表） |
| `/api/roles/{id}` | PATCH | `admin.role.edit` | 更新角色（名称、描述、权限） |
| `/api/roles/{id}` | DELETE | `admin.role.delete` | 删除角色 |

### 用户管理变更

- `PUT /api/admin/users/{id}/groups` → `PUT /api/admin/users/{id}/role`
- 请求体：`{ "role_id": "xxx" }`
- 权限：`admin.user.assign_role`

### 用户信息响应变更

UserResponse 中：
- `group_id` → `role_id`
- `group_name` → `role_name`
- `is_superuser` 删除
- `permissions` 保持不变（权限码列表）

## 数据库迁移

**迁移前必须备份数据库。**

1. Permission 表新增 `name_key` 列
2. 重命名 `permission_group` → `role`
3. 重命名 `group_permission` → `role_permission`
4. User 表 `group_id` → `role_id`，删除 `user_type` 列
5. Role 表删除 `is_system`、`auto_include_all` 字段
6. User 表删除 `is_superuser` 字段
7. 更新所有 Permission 记录的 `code` 为新的点分格式，填充 `name_key`
8. 新增通配符权限记录（`*`、`admin.*` 等）
9. 迁移现有角色的权限映射（旧码 → 新码）
10. 新增 `visitor` 角色，将 `role_id` 为 NULL 的用户分配到 `visitor`

## 影响范围

### 后端

| 文件 | 变更 |
|------|------|
| `rbac/models.py` | PermissionGroup → Role，去掉 is_system/auto_include_all |
| `rbac/tables.py` | group_permission → role_permission |
| `rbac/schemas.py` | 全部重写，新权限码和角色 schema |
| `rbac/service.py` | 全部重写，适配新模型 |
| `rbac/repository.py` | 全部重写 |
| `rbac/router.py` | /groups → /roles，新权限码 |
| `user/models.py` | group_id → role_id，去掉 is_superuser |
| `user/service.py` | 适配新字段 |
| `user/schemas.py` | 响应字段变更 |
| `admin/router.py` | 新权限码，assign_role |
| `admin/service.py` | 适配新模型 |
| `auth/service.py` | 注册时分配 visitor 角色 |
| `core/dependencies.py` | has_permission 通配符匹配，删除 require_superuser/get_current_user_type |
| `config/router.py` | require_superuser() → require_permission("admin.settings.*") |
| `init_superuser.py` | 新权限码和角色初始化 |
| 所有 router | 权限码迁移 |

### 网关

| 文件 | 变更 |
|------|------|
| `auth_proxy.lua` | JWT payload 去掉 is_superuser 和 user_type |
| `auth.lua` | 去掉 X-Is-Superuser 和 X-User-Type header 注入 |
| `init.lua` | 公开路由不变 |

### 前端

| 文件 | 变更 |
|------|------|
| `hooks/use-permissions.ts` | hasPermission 支持通配符 |
| `contexts/AuthContext.tsx` | 去掉 is_superuser 判断 |
| `components/layout/AdminSidebar.tsx` | 新权限码过滤 |
| `components/admin/GroupList.tsx` → `RoleList.tsx` | 角色列表重写 |
| `components/admin/GroupDialog.tsx` → `RoleDialog.tsx` | 树形复选框 |
| `components/admin/UserDrawer.tsx` | 角色分配改为单选 |
| `types/index.ts` | 类型定义更新 |
| `i18n` 文件 | 新增权限名称翻译 |

### 测试

所有涉及权限检查的单元测试和 e2e 测试需要适配新权限码。
