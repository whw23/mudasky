# 权限层级结构重构设计

## 目标

统一文件系统结构、路由结构、权限结构为一体。URL 层级表达权限依赖关系，简化权限系统。

## 核心规则

### 三位一体

```text
文件夹结构 = 路由层级 = 权限节点
```

- 每个文件夹对应一个路由段
- 每个 `__init__.py` 声明该层的 `description`（中文名称）
- 权限码 = URL 路径去掉 `/api/` 前缀和动态参数段

### URL 层级表达依赖

子路径依赖父路径。要到达子页面必须经过父页面。

以 admin/users 为例：

```text
/api/admin                                → admin 面板入口
/api/admin/users                          → 用户管理入口
/api/admin/users/list                     → 用户列表页
/api/admin/users/list/detail              → 用户详情页（必须先看列表）
/api/admin/users/list/detail/edit         → 编辑用户（必须先看详情）
/api/admin/users/list/detail/reset-password → 重置密码（必须先看详情）
```

### 权限格式

两种形式：

| 格式 | 含义 | 示例 |
| ---- | ---- | ---- |
| `{path}/*` | 通配符：该节点所有子路径 + 所有祖先路径 | `admin/users/*`、`*`（等价于 `/*`，全部权限） |
| 其他 | 精确匹配：到该节点为止 + 所有祖先路径 | `portal/profile/list` |

`*` 是 `/*` 的简写，省略了开头的 `/`。结尾有无 `/` 不影响，只要不是 `/*` 结尾就视为精确匹配。

### 匹配规则详解

#### 精确匹配示例

权限：`admin/users/list/detail`

| 请求路径 | 提取权限码 | 匹配结果 | 原因 |
| ---- | ---- | ---- | ---- |
| `/api/admin` | `admin` | ✅ | 祖先路径 |
| `/api/admin/users` | `admin/users` | ✅ | 祖先路径 |
| `/api/admin/users/list` | `admin/users/list` | ✅ | 祖先路径 |
| `/api/admin/users/list/detail` | `admin/users/list/detail` | ✅ | 精确匹配 |
| `/api/admin/users/list/detail/edit` | `admin/users/list/detail/edit` | ❌ | 子路径，精确匹配不含子路径 |
| `/api/admin/roles/list` | `admin/roles/list` | ❌ | 不在祖先链上 |

#### 通配符匹配示例

权限：`admin/users/list/detail/*`

| 请求路径 | 提取权限码 | 匹配结果 | 原因 |
| ---- | ---- | ---- | ---- |
| `/api/admin` | `admin` | ✅ | 祖先路径 |
| `/api/admin/users` | `admin/users` | ✅ | 祖先路径 |
| `/api/admin/users/list` | `admin/users/list` | ✅ | 祖先路径 |
| `/api/admin/users/list/detail` | `admin/users/list/detail` | ✅ | 祖先路径 |
| `/api/admin/users/list/detail/edit` | `admin/users/list/detail/edit` | ✅ | 子路径匹配 |
| `/api/admin/users/list/detail/reset-password` | `admin/users/list/detail/reset-password` | ✅ | 子路径匹配 |
| `/api/admin/users/list/create` | `admin/users/list/create` | ❌ | 不在 detail 子树下 |
| `/api/admin/roles/list` | `admin/roles/list` | ❌ | 不在祖先链上 |

#### 多权限组合示例

权限：`["admin/users/list/detail/*", "admin/articles/list/*"]`

| 请求路径 | 匹配结果 | 命中的权限 |
| ---- | ---- | ---- |
| `/api/admin` | ✅ | 两条权限的共同祖先 |
| `/api/admin/users/list` | ✅ | 第一条的祖先 |
| `/api/admin/users/list/detail/edit` | ✅ | 第一条的子路径 |
| `/api/admin/articles/list/create` | ✅ | 第二条的子路径 |
| `/api/admin/roles/list` | ❌ | 都不匹配 |

#### 参数传递规则

URL 路径完全静态，不包含动态参数（ID、key 等）。权限码直接等于 URL 路径去掉 `/api/` 前缀：

| HTTP 方法 | 参数传递方式 | 示例 |
| ---- | ---- | ---- |
| GET | query param | `GET /api/admin/users/list/detail?user_id=xxx` |
| POST | request body | `POST /api/admin/users/list/detail/edit` body: `{"user_id": "xxx"}` |

权限码提取极其简单：

```lua
local function extract_permission(uri)
  local path = string.match(uri, "^/api/(.+)$")
  return path
end
```

### 前置数据的 meta 模式

页面需要的前置数据（配置、元信息等）放在 `meta` 路径下，`meta` 作为实际操作的父路径：

```text
/admin/roles/meta                         → 获取前置数据（权限树、openapi）
/admin/roles/meta/list                    → 角色列表
/admin/roles/meta/list/create             → 创建角色
/admin/roles/meta/list/detail             → 角色详情
```

有 `admin/roles/meta/list` 权限 → 祖先匹配自动能访问 `admin/roles/meta`（前置数据）。

不是所有模块都需要 meta。只有确实需要前置数据的模块才加。当前需要 meta 的模块：

| 模块 | meta 返回内容 |
| ---- | ---- |
| `admin/roles/meta` | 权限树、API 路由 |
| `portal/profile/meta` | 个人概览数据 |

## 完整 URL 路径映射

### auth（不做权限检查，路径不变）

| 旧路径 | 新路径 | 说明 |
| ---- | ---- | ---- |
| `/api/auth/public-key` | 不变 | 获取 RSA 公钥 |
| `/api/auth/sms-code` | 不变 | 发送验证码 |
| `/api/auth/register` | 不变 | 注册 |
| `/api/auth/login` | 不变 | 登录 |
| `/api/auth/refresh` | 不变 | 刷新令牌 |
| `/api/auth/logout` | 不变 | 登出 |
| `/api/auth/refresh-token-hash` | 不变 | 保存令牌哈希（内部） |

### public（不做权限检查，参数改为 query param）

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/public/config/{key}` | `/api/public/config/detail?key=xxx` | GET | 获取配置 |
| `/api/public/panel-config` | `/api/public/config/panel` | GET | 面板配置 |
| `/api/public/content/articles` | `/api/public/content/articles/list` | GET | 文章列表 |
| `/api/public/content/article/{id}` | `/api/public/content/articles/detail?article_id=xxx` | GET | 文章详情 |
| `/api/public/content/categories` | `/api/public/content/categories/list` | GET | 分类列表 |
| `/api/public/cases/list` | `/api/public/cases/list` | GET | 案例列表 |
| `/api/public/cases/detail/{id}` | `/api/public/cases/detail?case_id=xxx` | GET | 案例详情 |
| `/api/public/universities/list` | `/api/public/universities/list` | GET | 院校列表 |
| `/api/public/universities/countries` | `/api/public/universities/countries` | GET | 国家列表 |
| `/api/public/universities/provinces` | `/api/public/universities/provinces` | GET | 省份列表 |
| `/api/public/universities/cities` | `/api/public/universities/cities` | GET | 城市列表 |
| `/api/public/universities/detail/{id}` | `/api/public/universities/detail?university_id=xxx` | GET | 院校详情 |

### admin/users

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/users/list` | `/api/admin/users/list` | GET | 用户列表 |
| `/api/admin/users/detail/{id}` | `/api/admin/users/list/detail?user_id=xxx` | GET | 用户详情 |
| `/api/admin/users/edit/{id}` | `/api/admin/users/list/detail/edit` | POST | 编辑用户 |
| `/api/admin/users/reset-password/{id}` | `/api/admin/users/list/detail/reset-password` | POST | 重置密码 |
| `/api/admin/users/assign-role/{id}` | `/api/admin/users/list/detail/assign-role` | POST | 分配角色 |
| `/api/admin/users/force-logout/{id}` | `/api/admin/users/list/detail/force-logout` | POST | 强制下线 |

### admin/roles（含 meta 前置数据）

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| — | `/api/admin/roles/meta` | GET | 前置数据（权限树，启动时缓存） |
| `/api/admin/roles/list/openapi.json` | 删除 | — | 功能融合到权限树中 |
| `/api/admin/roles/list` | `/api/admin/roles/meta/list` | GET | 角色列表 |
| `/api/admin/roles/create` | `/api/admin/roles/meta/list/create` | POST | 创建角色 |
| `/api/admin/roles/detail/{id}` | `/api/admin/roles/meta/list/detail?role_id=xxx` | GET | 角色详情 |
| `/api/admin/roles/edit/{id}` | `/api/admin/roles/meta/list/detail/edit` | POST | 编辑角色 |
| `/api/admin/roles/delete/{id}` | `/api/admin/roles/meta/list/detail/delete` | POST | 删除角色 |
| `/api/admin/roles/reorder` | `/api/admin/roles/meta/list/reorder` | POST | 角色排序 |

### admin/articles

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/articles/list` | `/api/admin/articles/list` | GET | 文章列表 |
| `/api/admin/articles/create` | `/api/admin/articles/list/create` | POST | 创建文章 |
| `/api/admin/articles/edit/{id}` | `/api/admin/articles/list/detail/edit` | POST | 编辑文章 |
| `/api/admin/articles/delete/{id}` | `/api/admin/articles/list/detail/delete` | POST | 删除文章 |

### admin/categories

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/categories/list` | `/api/admin/categories/list` | GET | 分类列表 |
| `/api/admin/categories/create` | `/api/admin/categories/list/create` | POST | 创建分类 |
| `/api/admin/categories/edit/{id}` | `/api/admin/categories/list/detail/edit` | POST | 编辑分类 |
| `/api/admin/categories/delete/{id}` | `/api/admin/categories/list/detail/delete` | POST | 删除分类 |

### admin/cases

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/cases/list` | `/api/admin/cases/list` | GET | 案例列表 |
| `/api/admin/cases/create` | `/api/admin/cases/list/create` | POST | 创建案例 |
| `/api/admin/cases/edit/{id}` | `/api/admin/cases/list/detail/edit` | POST | 编辑案例 |
| `/api/admin/cases/delete/{id}` | `/api/admin/cases/list/detail/delete` | POST | 删除案例 |

### admin/universities

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/universities/list` | `/api/admin/universities/list` | GET | 院校列表 |
| `/api/admin/universities/create` | `/api/admin/universities/list/create` | POST | 创建院校 |
| `/api/admin/universities/edit/{id}` | `/api/admin/universities/list/detail/edit` | POST | 编辑院校 |
| `/api/admin/universities/delete/{id}` | `/api/admin/universities/list/detail/delete` | POST | 删除院校 |

### admin/general-settings

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/general-settings/list` | `/api/admin/general-settings/list` | GET | 设置列表 |
| `/api/admin/general-settings/edit/{key}` | `/api/admin/general-settings/list/edit` | POST | 编辑设置 |

### admin/web-settings

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/admin/web-settings/list` | `/api/admin/web-settings/list` | GET | 设置列表 |
| `/api/admin/web-settings/edit/{key}` | `/api/admin/web-settings/list/edit` | POST | 编辑设置 |

### portal/profile

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| — | `/api/portal/profile/meta` | GET | 前置数据（个人概览） |
| `/api/portal/profile/view` | `/api/portal/profile/meta/list` | GET | 查看个人资料 |
| `/api/portal/profile/edit` | `/api/portal/profile/meta/list/edit` | POST | 编辑个人资料 |
| `/api/portal/profile/password` | `/api/portal/profile/password` | POST | 修改密码 |
| `/api/portal/profile/phone` | `/api/portal/profile/phone` | POST | 修改手机号 |
| `/api/portal/profile/delete-account` | `/api/portal/profile/delete-account` | POST | 注销账号 |

### portal/profile/sessions

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/portal/profile/sessions` | `/api/portal/profile/sessions/list` | GET | 会话列表 |
| `/api/portal/profile/sessions/revoke/{id}` | `/api/portal/profile/sessions/list/revoke` | POST | 撤销指定会话 |
| `/api/portal/profile/sessions/revoke-all` | `/api/portal/profile/sessions/list/revoke-all` | POST | 撤销所有其他会话 |

### portal/profile/two-factor

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/portal/profile/2fa-enable-totp` | `/api/portal/profile/two-factor/enable-totp` | POST | 启用 TOTP |
| `/api/portal/profile/2fa-confirm-totp` | `/api/portal/profile/two-factor/confirm-totp` | POST | 确认 TOTP |
| `/api/portal/profile/2fa-enable-sms` | `/api/portal/profile/two-factor/enable-sms` | POST | 启用短信 2FA |
| `/api/portal/profile/2fa-disable` | `/api/portal/profile/two-factor/disable` | POST | 关闭 2FA |

### portal/documents

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| `/api/portal/documents/list` | `/api/portal/documents/list` | GET | 文档列表 |
| `/api/portal/documents/upload` | `/api/portal/documents/list/upload` | POST | 上传文件 |
| `/api/portal/documents/detail/{id}` | `/api/portal/documents/list/detail?doc_id=xxx` | GET | 文档详情 |
| `/api/portal/documents/download/{id}` | `/api/portal/documents/list/detail/download?doc_id=xxx` | GET | 下载文件 |
| `/api/portal/documents/delete/{id}` | `/api/portal/documents/list/detail/delete` | POST | 删除文件 |

### admin/students（新增）

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| — | `/api/admin/students/list` | GET | 学生列表（只含 student 角色，默认筛选当前顾问的学生，可按 advisor_id 筛选或取消筛选看全部） |
| — | `/api/admin/students/list/detail` | GET | 学生详情（?user_id=xxx） |
| — | `/api/admin/students/list/detail/edit` | POST | 编辑学生信息 |
| — | `/api/admin/students/list/detail/assign-advisor` | POST | 指定负责顾问 |
| — | `/api/admin/students/list/detail/downgrade` | POST | 降为 visitor |
| — | `/api/admin/students/list/detail/documents/list` | GET | 该学生的文件列表 |
| — | `/api/admin/students/list/detail/documents/list/detail` | GET | 文件详情（?doc_id=xxx） |
| — | `/api/admin/students/list/detail/documents/list/detail/download` | GET | 下载文件（?doc_id=xxx） |

### admin/contacts（新增）

| 旧路径 | 新路径 | HTTP | 说明 |
| ---- | ---- | ---- | ---- |
| — | `/api/admin/contacts/list` | GET | 访客联系列表（只含 visitor 角色） |
| — | `/api/admin/contacts/list/detail` | GET | 联系详情（?user_id=xxx） |
| — | `/api/admin/contacts/list/detail/mark` | POST | 标记联系状态 |
| — | `/api/admin/contacts/list/detail/note` | POST | 添加备注 |
| — | `/api/admin/contacts/list/detail/history` | GET | 联系历史记录 |
| — | `/api/admin/contacts/list/detail/upgrade` | POST | 升为 student |

## portal 目录结构变更

### 重构前

```text
portal/
├── __init__.py
├── user/                                    # 13 个端点混在一起
│   ├── router.py
│   ├── service.py
│   └── schemas.py
├── document/
│   ├── router.py
│   ├── service.py
│   └── schemas.py
└── content/
    ├── router.py
    ├── service.py
    └── schemas.py
```

### 重构后

```text
portal/                                      # /portal
├── __init__.py                              # description="用户面板"，组装 profile + documents
├── profile/                                 # /portal/profile
│   ├── __init__.py                          # description="个人资料"，组装 router + sessions + two-factor
│   ├── router.py                            # list, list/edit, password, phone, delete-account
│   ├── service.py                           # ProfileService
│   ├── schemas.py                           # UserUpdate, PasswordChange, PhoneChange, UserResponse
│   ├── sessions/                            # /portal/profile/sessions
│   │   ├── __init__.py                      # description="会话管理"，导出 router
│   │   ├── router.py                        # list, list/revoke, list/revoke-all
│   │   ├── service.py                       # SessionService
│   │   └── schemas.py                       # SessionResponse
│   └── two-factor/                          # /portal/profile/two-factor
│       ├── __init__.py                      # description="双因素认证"，导出 router
│       ├── router.py                        # enable-totp, confirm-totp, enable-sms, disable
│       ├── service.py                       # TwoFactorService
│       └── schemas.py
└── documents/                               # /portal/documents
    ├── __init__.py                          # description="文档管理"，导出 router
    ├── router.py                            # list, list/upload, list/detail, list/detail/download, list/detail/delete
    ├── service.py                           # DocumentService
    └── schemas.py                           # DocumentResponse, DocumentListResponse
```

admin 和 public 面板文件结构不变，只在 `__init__.py` 中补充 description。

## __init__.py 规范

### 叶子节点（无子路由）

```python
"""会话管理模块。"""

from .router import router

description = "会话管理"

__all__ = ["router", "description"]
```

### 中间节点（有子路由）

```python
"""个人资料模块。"""

from fastapi import APIRouter

from .router import router as _router
from .sessions import router as sessions_router
from .two_factor import router as two_factor_router

description = "个人资料"

router = APIRouter(prefix="/profile")
router.include_router(_router)
router.include_router(sessions_router)
router.include_router(two_factor_router)

__all__ = ["router", "description"]
```

### 面板节点

```python
"""用户面板。"""

from fastapi import APIRouter

from .profile import router as profile_router
from .documents import router as documents_router

description = "用户面板"

router = APIRouter(prefix="/portal")
router.include_router(profile_router)
router.include_router(documents_router)

__all__ = ["router", "description"]
```

### 规则

- 每个 `__init__.py` 必须导出 `router` 和 `description`
- `description` 是字符串，中文名称
- `description` 同时用于：前端权限树 UI 的节点名称 + OpenAPI 文档的 tag 描述
- 子路由使用相对导入（`from .xxx import`）

## 权限系统简化

### 数据库变更

| 操作 | 说明 |
| ---- | ---- |
| 删除 `permission` 表 | 不再需要，权限码从 URL 路径自动推导 |
| 删除 `role_permission` 关联表 | 不再需要 |
| 删除 `Role.permissions` 关系字段 | 改为 JSON 列 |
| Role 表新增 `permissions` 列 | `JSON` 类型，存权限通配符数组 |

### Role 表新结构

```python
class Role(Base):
    __tablename__ = "role"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str] = mapped_column(String(200), default="")
    permissions: Mapped[list] = mapped_column(JSON, default=list)  # ["*"] 或 ["portal/*"]
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
```

### 预设角色

```python
ROLES = [
    ("superuser", "超级管理员", ["*"]),
    ("content_admin", "内容运营", [
        "admin/dashboard",
        "admin/articles/*",
        "admin/categories/*",
        "admin/cases/*",
        "admin/universities/*",
        "admin/general-settings/*",
        "admin/web-settings/*",
        "portal/profile/*",
    ]),
    ("advisor", "留学顾问", [
        "admin/dashboard",
        "admin/students/*",
        "admin/contacts/*",
        "portal/profile/*",
    ]),
    ("support", "客服", [
        "admin/dashboard",
        "admin/contacts/*",
        "portal/profile/*",
    ]),
    ("student", "学员", [
        "portal/overview",
        "portal/profile/*",
        "portal/documents/*",
    ]),
    ("visitor", "访客", [
        "portal/profile/*",
    ]),
]
```

### 角色合并（自定义角色）

管理员可以从预设角色合并创建自定义角色：

```text
POST /api/admin/roles/meta/list/create
body: {
    "name": "全能顾问",
    "description": "留学顾问 + 内容运营",
    "merge_from": ["advisor", "content_admin"],
    "permissions": null
}
```

- `merge_from` 指定合并来源角色，后端自动合并去重权限列表
- 如果同时传了 `permissions`，以 `permissions` 为准（手动微调覆盖合并结果）
- 自定义角色 `is_builtin = False`，可删除；预设角色 `is_builtin = True`，不可删除

### 登录流程变更

```text
重构前：登录 → 查 User → 查 Role → JOIN role_permission → JOIN permission → 取 permission.code 列表 → 写入 JWT
重构后：登录 → 查 User → 查 Role → 取 role.permissions (JSON) → 直接写入 JWT
```

JWT claims 示例：

```json
{
  "user_id": "xxx",
  "permissions": ["portal/*"],
  "is_active": true
}
```

### 改权限踢下线

```text
1. 管理员修改 Role.permissions
2. 查出 User 表中 role_id = 该角色 ID 的所有用户
3. 删除这些用户的 refresh_token 记录
4. 返回成功
5. 用户的 access token 自然过期（15-30 分钟），之后无法续签，被迫重新登录
6. 重新登录时获取新的 permissions
```

## 网关变更

### 权限提取

从固定 3 层改为全路径提取。URL 路径完全静态，无需跳过动态参数：

```lua
--- 从路径提取权限码。
-- /api/admin/users/list/detail/edit → admin/users/list/detail/edit
local function extract_permission(uri)
  local path = string.match(uri, "^/api/(.+)$")
  return path
end
```

### 权限匹配

```lua
--- 检查用户是否拥有指定权限。
-- 支持三种格式：* 全匹配、path/* 通配符、其他精确匹配。
-- 通配符和精确匹配都包含祖先路径。
local function has_permission(user_perms, required)
  for _, p in ipairs(user_perms) do
    -- 全部权限
    if p == "*" then return true end

    if string.sub(p, -2) == "/*" then
      -- 通配符：path/* 格式
      local prefix = string.sub(p, 1, -2)  -- 去掉 *，保留 /

      -- 子路径匹配：required 在权限前缀之下
      if string.find(required, prefix, 1, true) == 1 then
        return true
      end

      -- 祖先匹配：权限前缀在 required 之下（required 是祖先）
      if string.find(prefix, required .. "/", 1, true) == 1 then
        return true
      end

    else
      -- 精确匹配（去掉可能的尾部斜杠）
      local target = p
      if string.sub(target, -1) == "/" then
        target = string.sub(target, 1, -2)
      end

      -- 精确匹配当前节点
      if required == target then
        return true
      end

      -- 祖先匹配：target 路径在 required 之下（required 是祖先）
      if string.find(target, required .. "/", 1, true) == 1 then
        return true
      end
    end
  end
  return false
end
```

### 权限检查范围

不变，仅对 `/api/admin/*` 和 `/api/portal/*` 做权限检查：

```lua
if string.find(uri, "^/api/admin/") or string.find(uri, "^/api/portal/") then
  local required_perm = extract_permission(uri)
  local perms = payload.permissions or {}
  if not required_perm or not has_permission(perms, required_perm) then
    reject(403, "FORBIDDEN")
  end
end
```

## 权限树接口

权限树数据作为 `GET /api/admin/roles/meta` 响应体的一部分返回，不设独立端点。

### 生成逻辑

应用启动时两步生成权限树，缓存在内存中：

**第一步**：扫描 `api/api/` 下 `admin/` 和 `portal/` 的 `__init__.py`，用 `description` 属性构建文件夹层级骨架。

**第二步**：从 FastAPI app 的 OpenAPI spec 提取 `/admin/*` 和 `/portal/*` 的端点，用 endpoint 的 `summary` 作为 description，按路径插入到骨架中，补全叶子节点。

```python
import importlib
import pkgutil
from typing import Any


def _build_folder_tree(package_name: str) -> dict:
    """递归扫描包，用 __init__.py 的 description 构建文件夹层级。"""
    tree = {}
    pkg = importlib.import_module(package_name)

    for _importer, name, is_pkg in pkgutil.iter_modules(pkg.__path__):
        if not is_pkg:
            continue
        sub_module = importlib.import_module(f"{package_name}.{name}")
        desc = getattr(sub_module, "description", name)
        node: dict[str, Any] = {"description": desc}
        children = _build_folder_tree(f"{package_name}.{name}")
        if children:
            node["children"] = children
        tree[name] = node

    return tree


def _insert_endpoint(tree: dict, segments: list[str], summary: str) -> None:
    """将端点按路径段逐层插入到权限树中。"""
    if not segments:
        return
    key = segments[0]
    if key not in tree:
        tree[key] = {"description": summary if len(segments) == 1 else key}
    node = tree[key]
    if len(segments) == 1:
        node["description"] = summary
    else:
        if "children" not in node:
            node["children"] = {}
        _insert_endpoint(node["children"], segments[1:], summary)


def build_permission_tree(app: Any) -> dict:
    """构建完整权限树（文件夹层级 + 端点层级）。"""
    # 第一步：文件夹骨架
    tree = {}
    for panel in ("admin", "portal"):
        tree[panel] = _build_folder_tree(f"api.{panel}")

    # 第二步：从 OpenAPI 补全叶子端点
    openapi = app.openapi()
    for path, methods in (openapi.get("paths") or {}).items():
        for method_info in methods.values():
            summary = method_info.get("summary", "")
            # 去掉 /api/ 前缀
            clean = path.lstrip("/")
            if clean.startswith("api/"):
                clean = clean[4:]
            # 只处理 admin 和 portal
            if not (clean.startswith("admin/") or clean.startswith("portal/")):
                continue
            segments = clean.split("/")
            if len(segments) >= 2:
                panel = segments[0]
                if panel in tree:
                    _insert_endpoint(
                        tree[panel].setdefault("children", {}),
                        segments[1:],
                        summary,
                    )

    return tree
```

权限树只生成一次，缓存在模块级变量中。`meta` 接口直接返回缓存。

### 返回格式

```json
{
  "admin": {
    "description": "管理后台",
    "children": {
      "dashboard": { "description": "仪表盘" },
      "users": {
        "description": "用户管理",
        "children": {
          "list": {
            "description": "用户列表",
            "children": {
              "detail": {
                "description": "用户详情",
                "children": {
                  "edit": { "description": "编辑用户" },
                  "reset-password": { "description": "重置密码" },
                  "assign-role": { "description": "分配角色" },
                  "force-logout": { "description": "强制下线" }
                }
              }
            }
          }
        }
      },
      "roles": {
        "description": "角色管理",
        "children": { "meta": { "description": "前置数据", "children": { "list": { "description": "角色列表" } } } }
      },
      "students": {
        "description": "学生管理",
        "children": {
          "list": {
            "description": "学生列表",
            "children": {
              "detail": {
                "description": "学生详情",
                "children": {
                  "edit": { "description": "编辑学生" },
                  "assign-advisor": { "description": "指定顾问" },
                  "downgrade": { "description": "降为访客" },
                  "documents": { "description": "学生文件" }
                }
              }
            }
          }
        }
      },
      "contacts": {
        "description": "访客联系",
        "children": {
          "list": {
            "description": "联系列表",
            "children": {
              "detail": {
                "description": "联系详情",
                "children": {
                  "mark": { "description": "标记状态" },
                  "note": { "description": "添加备注" },
                  "history": { "description": "联系历史" },
                  "upgrade": { "description": "升为学员" }
                }
              }
            }
          }
        }
      },
      "articles": { "description": "文章管理" },
      "categories": { "description": "分类管理" },
      "cases": { "description": "案例管理" },
      "universities": { "description": "院校管理" },
      "general-settings": { "description": "通用设置" },
      "web-settings": { "description": "网站设置" }
    }
  },
  "portal": {
    "description": "用户面板",
    "children": {
      "overview": { "description": "个人概览" },
      "profile": {
        "description": "个人资料",
        "children": {
          "sessions": { "description": "会话管理" },
          "two-factor": { "description": "双因素认证" }
        }
      },
      "documents": { "description": "文档管理" }
    }
  }
}
```

### 缓存

权限树在应用启动时生成一次，缓存在内存中。权限树不会变化（除非部署新代码增加路由），不需要动态刷新。

## 数据库处理

未上生产，直接清空数据库重建：

User 表新增字段：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `contact_status` | `String(20)` | 联系状态：pending / contacted / following |
| `contact_note` | `Text` | 最新备注 |
| `advisor_id` | `String(36), FK → User.id` | 负责的留学顾问（nullable） |

新增 contact_record 表：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | `String(36), PK` | 记录 ID |
| `user_id` | `String(36), FK → User.id` | 被联系的用户 |
| `staff_id` | `String(36), FK → User.id` | 操作的客服/顾问 |
| `action` | `String(20)` | 操作类型：mark_contacted / add_note / follow_up / upgrade / downgrade |
| `note` | `Text` | 备注内容 |
| `created_at` | `DateTime` | 操作时间 |

数据库处理步骤：

1. 删除所有表（`docker compose down -v` 清除数据卷）
2. 删除 ORM 中的 `Permission` model 和 `role_permission` 关联表
3. `Role` model 新增 `permissions` JSON 列，删除 permissions 关系字段
4. 重新启动容器，`create_tables` 自动建表
5. `seed_rbac.py` 中删除 `init_permissions`，`init_roles` 直接写 JSON 权限

## 影响范围

### 后端

- portal/user 拆分为 profile/ + profile/sessions/ + profile/two-factor/
- portal/content 和 portal/articles 删除（文章管理只在 admin）
- 新增 admin/students（学生管理，含文件查看子路径）
- 新增 admin/contacts（访客联系功能：User 新增字段 + contact_record 表）
- 所有 admin 和 portal 的路由路径改为层级依赖结构（URL 变更）
- 所有 `__init__.py` 补充 `description` 导出
- 删除 Permission model、role_permission 表、相关 repository 方法
- Role model 新增 `permissions` JSON 列
- seed_rbac.py 简化（删除 init_permissions，简化 init_roles）
- auth service 中 build_user_response 简化（直接取 role.permissions）
- 新增权限树生成逻辑（启动时缓存）和 meta 接口
- 删除 `openapi.json` 独立接口，`_filter_openapi_spec` 逻辑融合到权限树生成中（从 OpenAPI spec 提取端点 summary 作为叶子节点 description）

### 网关

- `auth.lua` 中 `extract_permission` 改为全路径提取
- `has_permission` 支持精确匹配 + 通配符 + 祖先匹配
- 改权限踢下线逻辑（可选，后端实现）

### 前端

本次不涉及，后续单独处理。

### 测试

**单元测试（mock）：**

- 所有 router/service 测试的 URL 路径更新（list/detail/edit 层级结构）
- portal/user 测试拆分为 profile/ + sessions/ + two-factor/ 对应的测试
- portal/content 测试删除
- 新增 admin/students 测试（列表、详情、编辑、指定顾问、降级、文件查看）
- 新增 admin/contacts 测试（列表、详情、标记、备注、历史、升级）
- 权限匹配逻辑的边界测试（通配符、精确匹配、祖先匹配、多权限组合）
- 改权限踢下线逻辑测试
- 角色合并（merge_from）测试
- 权限树生成逻辑测试

**接口测试（直连 :8000）：**

- 所有 admin/portal 端点路径更新
- 新增 admin/students、admin/contacts 接口测试
- 不同角色权限的接口访问测试（验证通配符和精确匹配行为）
- meta 接口返回权限树的测试

**网关集成测试（:80）：**

- 所有 admin/portal 端点路径更新
- 权限拦截测试（不同角色访问不同路径，验证 403/200）
- 改权限后踢下线的完整流程测试
- 祖先路径自动放行测试

**覆盖率要求：**

- 代码覆盖率 >= 90%
- 接口覆盖率 100%（每个端点正向 + 反向测试）

### Rules 更新

- `.claude/rules/architecture.md` — 更新权限系统设计（删除 Permission 表、通配符规则、角色列表）
- `.claude/rules/code-style.md` — 更新 API 路由规范（层级依赖结构、参数传递规则）
- `.claude/rules/testing.md` — 更新测试目录结构（portal 拆分、新增 students/contacts）
- `CLAUDE.md` — 如有路径引用需同步更新
