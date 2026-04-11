# 统一面板重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 admin 和 user-center 两套独立面板统一为 `[panel]` 动态路由，前后端路径对齐，权限格式简化为 URL 路径。

**Architecture:** 前端用 Next.js 动态路由 `[panel]` 替代 `(admin)` 和 `(user)` 两个 route group，统一 PanelSidebar 由数据库配置驱动。后端 router prefix 从单数改复数并与前端页面路径对齐。网关权限从点分隔改为斜线分隔（直接截取 URL 路径）。

**Tech Stack:** Next.js, React, TypeScript, FastAPI, SQLAlchemy, OpenResty/Lua, Playwright

**Spec:** `docs/superpowers/specs/2026-04-12-panel-unification-v2-design.md`

---

## Task 1: 网关权限格式迁移

**Files:**
- Modify: `gateway/lua/auth.lua:11-22` (extract_permission)
- Modify: `gateway/lua/auth.lua:26-37` (has_permission)

- [ ] **Step 1: 修改 `extract_permission` 函数**

将点分隔改为斜线分隔，去掉连字符转下划线逻辑：

```lua
--- 从路径提取权限字符串。
-- /api/admin/users/list/xxx → admin/users/list
local function extract_permission(uri)
  local path = string.match(uri, "^/api/(.+)$")
  if not path then return nil end
  local segments = {}
  for seg in string.gmatch(path, "[^/]+") do
    table.insert(segments, seg)
    if #segments == 3 then break end
  end
  if #segments < 3 then return nil end
  return table.concat(segments, "/")
end
```

- [ ] **Step 2: 修改 `has_permission` 函数**

将通配符匹配从 `.*` 改为 `/*`：

```lua
--- 检查用户是否拥有指定权限。
local function has_permission(user_perms, required)
  for _, p in ipairs(user_perms) do
    if p == "*" then return true end
    if p == required then return true end
    if string.sub(p, -2) == "/*" then
      local prefix = string.sub(p, 1, -2)
      if string.find(required, prefix, 1, true) == 1 then
        return true
      end
    end
  end
  return false
end
```

- [ ] **Step 3: 更新注释**

将文件头部的注释示例更新：

```lua
--- 从路径提取权限字符串。
-- /api/admin/users/list/xxx → admin/users/list
```

- [ ] **Step 4: Commit**

```bash
git add gateway/lua/auth.lua
git commit -m "refactor: 网关权限格式从点分隔改为斜线分隔"
```

---

## Task 2: 后端 RBAC 种子数据迁移

**Files:**
- Modify: `backend/api/scripts/init/seed_rbac.py`

- [ ] **Step 1: 更新 PERMISSIONS 列表**

将所有权限 code 从点分隔改为斜线分隔，资源名改复数：

```python
PERMISSIONS = [
    # 用户面板 - 个人资料
    ("portal/profile/view", "permission.portal.profile.view", "查看个人资料"),
    ("portal/profile/edit", "permission.portal.profile.edit", "编辑个人资料"),
    ("portal/profile/password", "permission.portal.profile.password", "修改密码"),
    ("portal/profile/phone", "permission.portal.profile.phone", "修改手机号"),
    # 用户面板 - 双因素认证
    ("portal/profile/2fa-enable-totp", "permission.portal.profile.2fa-enable-totp", "TOTP 双因素认证"),
    ("portal/profile/2fa-enable-sms", "permission.portal.profile.2fa-enable-sms", "短信双因素认证"),
    ("portal/profile/2fa-disable", "permission.portal.profile.2fa-disable", "关闭双因素认证"),
    # 用户面板 - 文档
    ("portal/documents/upload", "permission.portal.documents.upload", "上传文档"),
    ("portal/documents/list", "permission.portal.documents.list", "查看文档列表"),
    ("portal/documents/delete", "permission.portal.documents.delete", "删除文档"),
    # 用户面板 - 文章
    ("portal/articles/create", "permission.portal.articles.create", "创建文章"),
    ("portal/articles/edit", "permission.portal.articles.edit", "编辑文章"),
    ("portal/articles/delete", "permission.portal.articles.delete", "删除文章"),
    # 管理后台 - 用户管理
    ("admin/users/list", "permission.admin.users.list", "查看用户列表"),
    ("admin/users/edit", "permission.admin.users.edit", "编辑用户"),
    ("admin/users/reset-password", "permission.admin.users.reset-password", "重置用户密码"),
    ("admin/users/assign-role", "permission.admin.users.assign-role", "分配用户角色"),
    ("admin/users/force-logout", "permission.admin.users.force-logout", "强制下线用户"),
    # 管理后台 - 内容管理
    ("admin/content/list", "permission.admin.content.list", "查看内容列表"),
    ("admin/content/edit", "permission.admin.content.edit", "编辑内容"),
    ("admin/content/delete", "permission.admin.content.delete", "删除内容"),
    # 管理后台 - 分类管理
    ("admin/categories/create", "permission.admin.categories.create", "创建分类"),
    ("admin/categories/edit", "permission.admin.categories.edit", "编辑分类"),
    ("admin/categories/delete", "permission.admin.categories.delete", "删除分类"),
    # 管理后台 - 案例管理
    ("admin/cases/create", "permission.admin.cases.create", "创建成功案例"),
    ("admin/cases/edit", "permission.admin.cases.edit", "编辑成功案例"),
    ("admin/cases/delete", "permission.admin.cases.delete", "删除成功案例"),
    # 管理后台 - 院校管理
    ("admin/universities/create", "permission.admin.universities.create", "创建合作院校"),
    ("admin/universities/edit", "permission.admin.universities.edit", "编辑合作院校"),
    ("admin/universities/delete", "permission.admin.universities.delete", "删除合作院校"),
    # 管理后台 - 角色管理
    ("admin/roles/list", "permission.admin.roles.list", "查看角色列表"),
    ("admin/roles/create", "permission.admin.roles.create", "创建角色"),
    ("admin/roles/edit", "permission.admin.roles.edit", "编辑角色"),
    ("admin/roles/delete", "permission.admin.roles.delete", "删除角色"),
    # 管理后台 - 系统设置
    ("admin/general-settings/list", "permission.admin.general-settings.list", "查看通用设置"),
    ("admin/general-settings/edit", "permission.admin.general-settings.edit", "编辑通用设置"),
    ("admin/web-settings/list", "permission.admin.web-settings.list", "查看网站设置"),
    ("admin/web-settings/edit", "permission.admin.web-settings.edit", "编辑网站设置"),
    # 管理后台 - 仪表盘
    ("admin/dashboard/stats", "permission.admin.dashboard.stats", "查看管理仪表盘"),
    # 用户面板 - 概览
    ("portal/overview/stats", "permission.portal.overview.stats", "查看个人概览"),
    # 管理后台 - 面板配置
    ("admin/panel-settings/view", "permission.admin.panel-settings.view", "查看面板配置"),
    ("admin/panel-settings/edit", "permission.admin.panel-settings.edit", "编辑面板配置"),
    # 通配符权限
    ("*", "permission.all", "所有权限"),
    ("admin/*", "permission.admin.all", "所有管理后台权限"),
    ("portal/*", "permission.portal.all", "所有用户面板权限"),
    ("admin/users/*", "permission.admin.users.all", "所有用户管理权限"),
    ("admin/content/*", "permission.admin.content.all", "所有内容管理权限"),
    ("admin/categories/*", "permission.admin.categories.all", "所有分类管理权限"),
    ("admin/cases/*", "permission.admin.cases.all", "所有案例管理权限"),
    ("admin/universities/*", "permission.admin.universities.all", "所有院校管理权限"),
    ("admin/roles/*", "permission.admin.roles.all", "所有角色管理权限"),
    ("admin/general-settings/*", "permission.admin.general-settings.all", "所有通用设置权限"),
    ("admin/web-settings/*", "permission.admin.web-settings.all", "所有网站设置权限"),
    ("admin/dashboard/*", "permission.admin.dashboard.all", "所有仪表盘权限"),
    ("admin/panel-settings/*", "permission.admin.panel-settings.all", "所有面板配置权限"),
    ("portal/overview/*", "permission.portal.overview.all", "所有概览权限"),
    ("portal/profile/*", "permission.portal.profile.all", "所有个人资料权限"),
    ("portal/documents/*", "permission.portal.documents.all", "所有文档权限"),
    ("portal/articles/*", "permission.portal.articles.all", "所有文章权限"),
]
```

- [ ] **Step 2: 更新 ROLES 定义**

```python
ROLES = [
    ("superuser", "超级管理员", ["*"], 0),
    ("website_admin", "网站管理员", ["admin/*", "portal/*"], 1),
    ("student_advisor", "留学顾问", ["admin/users/*", "admin/content/*", "admin/cases/*", "portal/*"], 2),
    ("student", "学员", ["portal/*"], 3),
    ("visitor", "访客", ["portal/profile/view"], 4),
]
```

- [ ] **Step 3: Commit**

```bash
git add backend/api/scripts/init/seed_rbac.py
git commit -m "refactor: RBAC 权限和角色定义迁移至斜线分隔格式"
```

---

## Task 3: 后端 router prefix 迁移（资源名改复数）

**Files:**
- Modify: `backend/shared/src/app/admin/router.py:18-21` — prefix `/admin/user` → `/admin/users`
- Modify: `backend/shared/src/app/rbac/router.py` — prefix `/admin/role` → `/admin/roles`
- Modify: `backend/shared/src/app/config/router.py:12-13` — prefix `/admin/settings` → 拆为两个 router
- Modify: `backend/shared/src/app/document/router.py` — prefix `/portal/document` → `/portal/documents`
- Modify: `backend/shared/src/app/content/router.py` — portal article prefix `/portal/article` → `/portal/articles`
- Modify: `backend/shared/src/app/content/admin_router.py` — admin category `/admin/category` → `/admin/categories`, admin content 保持 `/admin/content`
- Modify: `backend/shared/src/app/case/router.py` — 保持 `/public/case`
- Modify: `backend/shared/src/app/case/admin_router.py` — prefix `/admin/case` → `/admin/cases`
- Modify: `backend/shared/src/app/university/router.py` — admin prefix `/admin/university` → `/admin/universities`

注意：`/admin/content` 保持不变（因为 content 在语境中既可以作单复数），`/public/*` 路径保持不变（无权限校验，不需要对齐）。

- [ ] **Step 1: 修改 admin/router.py**

将 `prefix="/admin/user"` 改为 `prefix="/admin/users"`：

```python
router = APIRouter(
    prefix="/admin/users",
    tags=["admin"],
)
```

- [ ] **Step 2: 修改 rbac/router.py**

将 `prefix="/admin/role"` 改为 `prefix="/admin/roles"`：

```python
router = APIRouter(
    prefix="/admin/roles",
    tags=["admin-roles"],
)
```

- [ ] **Step 3: 修改 config/router.py — 拆分 settings router**

将 `admin_settings_router` 拆为两个 router，分别对应 general-settings 和 web-settings 页面。两个 router 共用同一个 ConfigService，只是路径不同：

```python
admin_general_settings_router = APIRouter(
    prefix="/admin/general-settings", tags=["admin-general-settings"]
)

admin_web_settings_router = APIRouter(
    prefix="/admin/web-settings", tags=["admin-web-settings"]
)


@admin_general_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
)
async def list_general_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有配置。"""
    svc = ConfigService(session)
    return await svc.list_all()


@admin_general_settings_router.post(
    "/edit/{key}",
    response_model=ConfigResponse,
)
async def update_general_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新配置值。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)


@admin_web_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
)
async def list_web_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有配置（网站设置页面用）。"""
    svc = ConfigService(session)
    return await svc.list_all()


@admin_web_settings_router.post(
    "/edit/{key}",
    response_model=ConfigResponse,
)
async def update_web_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新配置值（网站设置页面用）。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)
```

- [ ] **Step 4: 修改 document/router.py**

将 `prefix="/portal/document"` 改为 `prefix="/portal/documents"`。

- [ ] **Step 5: 修改 content/router.py**

将 portal article 的 APIRouter prefix 从 `/portal/article` 改为 `/portal/articles`。public content router 保持不变。

- [ ] **Step 6: 修改 content/admin_router.py**

将 `admin_category_router` prefix 从 `/admin/category` 改为 `/admin/categories`。`admin_content_router` 保持 `/admin/content` 不变。

- [ ] **Step 7: 修改 case/admin_router.py**

将 prefix 从 `/admin/case` 改为 `/admin/cases`。

- [ ] **Step 8: 修改 university/router.py**

将 admin_router prefix 从 `/admin/university` 改为 `/admin/universities`。public_router 保持不变。

- [ ] **Step 9: 修改 main.py — 更新 import 和 router 挂载**

更新 `backend/api/src/api/main.py`：
- import `admin_general_settings_router, admin_web_settings_router`（替代 `admin_settings_router`）
- 替换 `api.include_router(admin_settings_router)` 为两行：

```python
api.include_router(admin_general_settings_router)
api.include_router(admin_web_settings_router)
```

- [ ] **Step 10: Commit**

```bash
git add backend/shared/src/app/admin/router.py \
       backend/shared/src/app/rbac/router.py \
       backend/shared/src/app/config/router.py \
       backend/shared/src/app/document/router.py \
       backend/shared/src/app/content/router.py \
       backend/shared/src/app/content/admin_router.py \
       backend/shared/src/app/case/admin_router.py \
       backend/shared/src/app/university/router.py \
       backend/api/src/api/main.py
git commit -m "refactor: 后端 router prefix 统一改复数，对齐前端页面路径"
```

---

## Task 4: 后端测试路径更新

**Files:**
- Modify: `backend/api/tests/test_admin_router.py` — `/admin/user/` → `/admin/users/`
- Modify: `backend/api/tests/test_rbac_router.py` — `/admin/role/` → `/admin/roles/`
- Modify: `backend/api/tests/test_config_router.py` — `/admin/settings/` → `/admin/general-settings/`
- Modify: `backend/api/tests/test_document_router.py` — `/portal/document/` → `/portal/documents/`
- Modify: `backend/api/tests/test_user_router.py` — `/portal/profile/` 保持不变
- Modify: `backend/api/tests/test_content_router.py` — `/portal/article/` → `/portal/articles/`
- Modify: `backend/api/tests/e2e/test_admin.py` — `/admin/user/` → `/admin/users/`
- Modify: `backend/api/tests/e2e/test_rbac.py` — `/admin/role/` → `/admin/roles/`
- Modify: `backend/api/tests/e2e/test_config.py` — `/admin/settings/` → `/admin/general-settings/`
- Modify: `backend/api/tests/e2e/test_document.py` — `/portal/document/` → `/portal/documents/`
- Modify: `backend/api/tests/e2e/test_content.py` — portal article 路径更新
- Modify: `backend/api/tests/e2e/test_case.py` — `/admin/case/` → `/admin/cases/`
- Modify: `backend/api/tests/e2e/test_university.py` — `/admin/university/` → `/admin/universities/`

- [ ] **Step 1: 批量替换 router 测试路径**

每个 test 文件中用全局查找替换：

| 文件 | 旧路径 | 新路径 |
|---|---|---|
| `test_admin_router.py` | `/admin/user/` | `/admin/users/` |
| `test_rbac_router.py` | `/admin/role/` | `/admin/roles/` |
| `test_config_router.py` | `/admin/settings/` | `/admin/general-settings/` |
| `test_document_router.py` | `/portal/document/` | `/portal/documents/` |
| `test_content_router.py` | `/portal/article/` | `/portal/articles/` |

注意：`test_config_router.py` 中同时存在 `admin_settings_router` 的 import，需更新为 `admin_general_settings_router`。

- [ ] **Step 2: 批量替换 E2E 测试路径**

| 文件 | 旧路径 | 新路径 |
|---|---|---|
| `test_admin.py` | `/api/admin/user/` | `/api/admin/users/` |
| `test_rbac.py` | `/api/admin/role/` | `/api/admin/roles/` |
| `test_config.py` | `/api/admin/settings/` | `/api/admin/general-settings/` |
| `test_document.py` | `/api/portal/document/` | `/api/portal/documents/` |
| `test_content.py` | portal article 路径 | `/api/portal/articles/` |
| `test_case.py` | `/api/admin/case/` | `/api/admin/cases/` |
| `test_university.py` | `/api/admin/university/` | `/api/admin/universities/` |

- [ ] **Step 3: 运行后端测试验证**

```bash
cd backend/api && uv run pytest tests/ -x -q
```

Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
git add backend/api/tests/
git commit -m "test: 后端测试路径更新适配复数 resource 名"
```

---

## Task 5: 前端权限 hook 迁移

**Files:**
- Modify: `frontend/hooks/use-permissions.ts` — 通配符匹配从 `.*` 改为 `/*`
- Modify: `frontend/tests/hooks/use-permissions.test.ts` — 测试用例更新

- [ ] **Step 1: 更新测试用例（TDD - 先写测试）**

```ts
describe('权限检查逻辑', () => {
  const normalUser: Partial<User> = {
    permissions: ['admin/content/edit', 'admin/content/list'],
  }

  const wildcardUser: Partial<User> = {
    permissions: ['*'],
  }

  const adminWildcardUser: Partial<User> = {
    permissions: ['admin/*'],
  }

  describe('hasPermission', () => {
    it('拥有该权限时返回 true', () => {
      expect(hasPermission(normalUser, 'admin/content/edit')).toBe(true)
    })

    it('没有该权限时返回 false', () => {
      expect(hasPermission(normalUser, 'admin/users/list')).toBe(false)
    })

    it('通配符 * 匹配所有权限', () => {
      expect(hasPermission(wildcardUser, 'admin/users/list')).toBe(true)
    })

    it('admin/* 匹配 admin 下所有权限', () => {
      expect(hasPermission(adminWildcardUser, 'admin/users/list')).toBe(true)
      expect(hasPermission(adminWildcardUser, 'admin/content/edit')).toBe(true)
    })

    it('admin/* 不匹配非 admin 权限', () => {
      expect(hasPermission(adminWildcardUser, 'portal/profile/view')).toBe(false)
    })

    it('user 为 null 时返回 false', () => {
      expect(hasPermission(null, 'admin/content/edit')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('拥有其中一个权限时返回 true', () => {
      expect(hasAnyPermission(normalUser, 'admin/users/list', 'admin/content/edit')).toBe(true)
    })

    it('没有任何权限时返回 false', () => {
      expect(hasAnyPermission(normalUser, 'admin/users/list', 'admin/roles/list')).toBe(false)
    })

    it('通配符 * 匹配所有权限', () => {
      expect(hasAnyPermission(wildcardUser, 'admin/users/list')).toBe(true)
    })

    it('user 为 null 时返回 false', () => {
      expect(hasAnyPermission(null, 'admin/content/edit')).toBe(false)
    })
  })
})
```

同时更新测试文件中的 `hasPermission` 模拟函数，将 `.*` 逻辑改为 `/*`：

```ts
function hasPermission(user: Partial<User> | null, perm: string): boolean {
  if (!user?.permissions) return false
  for (const p of user.permissions) {
    if (p === "*") return true
    if (p.endsWith("/*") && perm.startsWith(p.slice(0, -1))) return true
    if (p === perm) return true
  }
  return false
}
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd frontend && pnpm vitest run tests/hooks/use-permissions.test.ts
```

Expected: FAIL（因为 `use-permissions.ts` 还没改）

- [ ] **Step 3: 更新 `use-permissions.ts`**

```ts
/** 检查是否拥有指定权限（支持通配符） */
const hasPermission = (perm: string): boolean => {
  if (!user?.permissions) return false
  for (const p of user.permissions) {
    if (p === "*") return true
    if (p.endsWith("/*") && perm.startsWith(p.slice(0, -1))) return true
    if (p === perm) return true
  }
  return false
}
```

同时更新 `isAdmin`：

```ts
const isAdmin = hasAnyPermission("admin/*")
```

- [ ] **Step 4: 运行测试验证通过**

```bash
cd frontend && pnpm vitest run tests/hooks/use-permissions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/hooks/use-permissions.ts frontend/tests/hooks/use-permissions.test.ts
git commit -m "refactor: 前端权限通配符从点分隔改为斜线分隔"
```

---

## Task 6: 前端 admin 组件 API 路径更新

**Files:**
- Modify: `frontend/components/admin/UserTable.tsx` — `/admin/user/` → `/admin/users/`
- Modify: `frontend/components/admin/UserDrawer.tsx` — `/admin/user/` → `/admin/users/`
- Modify: `frontend/components/admin/RoleList.tsx` — `/admin/role/` → `/admin/roles/`
- Modify: `frontend/components/admin/RoleDialog.tsx` — `/admin/role/` → `/admin/roles/`
- Modify: `frontend/components/admin/CategoryTable.tsx` — `/admin/category/` → `/admin/categories/`
- Modify: `frontend/components/admin/CategoryDialog.tsx` — `/admin/category/` → `/admin/categories/`
- Modify: `frontend/components/admin/CaseTable.tsx` — `/admin/case/` → `/admin/cases/`
- Modify: `frontend/components/admin/CaseDialog.tsx` — `/admin/case/` → `/admin/cases/`
- Modify: `frontend/components/admin/UniversityTable.tsx` — `/admin/university/` → `/admin/universities/`
- Modify: `frontend/components/admin/UniversityDialog.tsx` — `/admin/university/` → `/admin/universities/`
- Modify: `frontend/components/admin/ArticleTable.tsx` — `/admin/content/` 保持不变
- Modify: `frontend/components/admin/CountryCodeEditor.tsx` — `/admin/settings/` → `/admin/general-settings/`
- Modify: `frontend/components/admin/ConfigEditDialog.tsx` — `/portal/document/upload` → `/portal/documents/upload`

- [ ] **Step 1: 批量替换 admin 组件中的 API 路径**

每个文件的替换规则：

| 文件 | 旧 | 新 |
|---|---|---|
| `UserTable.tsx` | `/admin/user/list` | `/admin/users/list` |
| `UserDrawer.tsx` | `/admin/user/edit/` | `/admin/users/edit/` |
| `UserDrawer.tsx` | `/admin/user/assign-role/` | `/admin/users/assign-role/` |
| `UserDrawer.tsx` | `/admin/user/reset-password/` | `/admin/users/reset-password/` |
| `UserDrawer.tsx` | `/admin/user/force-logout/` | `/admin/users/force-logout/` |
| `RoleList.tsx` | `/admin/role/list` | `/admin/roles/list` |
| `RoleList.tsx` | `/admin/role/reorder` | `/admin/roles/reorder` |
| `RoleList.tsx` | `/admin/role/delete/` | `/admin/roles/delete/` |
| `RoleDialog.tsx` | `/admin/role/edit/` | `/admin/roles/edit/` |
| `RoleDialog.tsx` | `/admin/role/create` | `/admin/roles/create` |
| `CategoryTable.tsx` | `/admin/category/delete/` | `/admin/categories/delete/` |
| `CategoryDialog.tsx` | `/admin/category/edit/` | `/admin/categories/edit/` |
| `CategoryDialog.tsx` | `/admin/category/create` | `/admin/categories/create` |
| `CaseTable.tsx` | `/admin/case/edit/` | `/admin/cases/edit/` |
| `CaseTable.tsx` | `/admin/case/delete/` | `/admin/cases/delete/` |
| `CaseDialog.tsx` | `/admin/case/edit/` | `/admin/cases/edit/` |
| `CaseDialog.tsx` | `/admin/case/create` | `/admin/cases/create` |
| `UniversityTable.tsx` | `/admin/university/delete/` | `/admin/universities/delete/` |
| `UniversityDialog.tsx` | `/admin/university/edit/` | `/admin/universities/edit/` |
| `UniversityDialog.tsx` | `/admin/university/create` | `/admin/universities/create` |
| `CountryCodeEditor.tsx` | `/admin/settings/list` | `/admin/general-settings/list` |
| `CountryCodeEditor.tsx` | `/admin/settings/edit/` | `/admin/general-settings/edit/` |
| `ConfigEditDialog.tsx` | `/portal/document/upload` | `/portal/documents/upload` |

- [ ] **Step 2: Commit**

```bash
git add frontend/components/admin/
git commit -m "refactor: 前端 admin 组件 API 路径更新为复数形式"
```

---

## Task 7: 前端 user 组件 API 路径更新

**Files:**
- Modify: `frontend/components/user/DocumentList.tsx` — `/portal/document/` → `/portal/documents/`
- Modify: `frontend/components/user/DocumentUpload.tsx` — `/portal/document/` → `/portal/documents/`
- Modify: `frontend/components/user/ArticleList.tsx` — `/portal/article/` → `/portal/articles/`
- Modify: `frontend/components/user/ArticleEditor.tsx` — `/portal/article/` → `/portal/articles/`
- Modify: `frontend/components/user/ProfileInfo.tsx` — `/portal/profile/` 保持不变
- Modify: `frontend/components/user/ChangePassword.tsx` — `/portal/profile/` 保持不变
- Modify: `frontend/components/user/ChangePhone.tsx` — `/portal/profile/` 保持不变
- Modify: `frontend/components/user/TwoFactorSettings.tsx` — `/portal/profile/` 保持不变

- [ ] **Step 1: 批量替换 user 组件中的 API 路径**

| 文件 | 旧 | 新 |
|---|---|---|
| `DocumentList.tsx` | `/portal/document/list` | `/portal/documents/list` |
| `DocumentList.tsx` | `/portal/document/delete/` | `/portal/documents/delete/` |
| `DocumentUpload.tsx` | `/portal/document/upload` | `/portal/documents/upload` |
| `ArticleList.tsx` | `/portal/article/list` | `/portal/articles/list` |
| `ArticleList.tsx` | `/portal/article/delete/` | `/portal/articles/delete/` |
| `ArticleEditor.tsx` | `/portal/article/edit/` | `/portal/articles/edit/` |
| `ArticleEditor.tsx` | `/portal/article/create` | `/portal/articles/create` |

`/portal/profile/*` 路径不变。

- [ ] **Step 2: Commit**

```bash
git add frontend/components/user/
git commit -m "refactor: 前端 user 组件 API 路径更新为复数形式"
```

---

## Task 8: 前端 admin 页面 API 路径更新

**Files:**
- Modify: `frontend/app/[locale]/(admin)/admin/dashboard/page.tsx`
- Modify: `frontend/app/[locale]/(admin)/admin/general-settings/page.tsx`
- Modify: `frontend/app/[locale]/(admin)/admin/web-settings/page.tsx`
- Modify: `frontend/app/[locale]/(user)/user-center/dashboard/page.tsx`

- [ ] **Step 1: 更新 admin dashboard 页面**

```
/admin/user/list → /admin/users/list
/admin/content/list → 保持不变
/admin/category/list → /admin/categories/list
```

- [ ] **Step 2: 更新 general-settings 页面**

```
/admin/settings/list → /admin/general-settings/list
/admin/settings/edit/ → /admin/general-settings/edit/
```

- [ ] **Step 3: 更新 web-settings 页面**

```
/admin/settings/list → /admin/web-settings/list
/admin/settings/edit/ → /admin/web-settings/edit/
```

- [ ] **Step 4: 更新 user-center dashboard 页面**

```
/portal/document/list → /portal/documents/list
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/
git commit -m "refactor: 前端页面 API 路径更新为复数形式"
```

---

## Task 9: 前端 AdminSidebar 权限名更新

**Files:**
- Modify: `frontend/components/layout/AdminSidebar.tsx:30-36`

- [ ] **Step 1: 更新权限检查字符串**

```ts
const MENU_KEYS: MenuItem[] = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "userManagement", href: "/admin/users", icon: Users, permissions: ["admin/users/*"] },
  { key: "roleManagement", href: "/admin/roles", icon: Shield, permissions: ["admin/roles/*"] },
  { key: "generalSettings", href: "/admin/general-settings", icon: Wrench, permissions: ["admin/general-settings/*"] },
  { key: "webSettings", href: "/admin/web-settings", icon: Settings, permissions: ["admin/web-settings/*"] },
]
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/layout/AdminSidebar.tsx
git commit -m "refactor: AdminSidebar 权限检查更新为斜线分隔格式"
```

---

## Task 10: 前端 Header 链接更新

**Files:**
- Modify: `frontend/components/layout/Header.tsx:157,164,302`

- [ ] **Step 1: 更新 user-center 链接**

```
/user-center/dashboard → /portal/dashboard
/admin/dashboard → 保持不变
```

Header.tsx 中的链接：
- Line 157: `/user-center/dashboard` → `/portal/dashboard`

admin 链接保持不变。

- [ ] **Step 2: Commit**

```bash
git add frontend/components/layout/Header.tsx
git commit -m "refactor: Header 用户中心链接从 /user-center/ 改为 /portal/"
```

---

## Task 11: 前端路由迁移 — 创建 `[panel]` 动态路由

**Files:**
- Create: `frontend/app/[locale]/[panel]/layout.tsx`
- Move: `(admin)/admin/dashboard/page.tsx` → `[panel]/dashboard/page.tsx`
- Move: `(admin)/admin/users/page.tsx` → `[panel]/users/page.tsx`
- Move: `(admin)/admin/roles/page.tsx` → `[panel]/roles/page.tsx`
- Move: `(admin)/admin/general-settings/page.tsx` → `[panel]/general-settings/page.tsx`
- Move: `(admin)/admin/web-settings/page.tsx` → `[panel]/web-settings/page.tsx`
- Move: `(user)/user-center/dashboard/page.tsx` → `[panel]/overview/page.tsx`（重命名）
- Move: `(user)/user-center/profile/page.tsx` → `[panel]/profile/page.tsx`
- Move: `(user)/user-center/documents/page.tsx` → `[panel]/documents/page.tsx`
- Move: `(user)/user-center/articles/page.tsx` → `[panel]/articles/page.tsx`
- Delete: `frontend/app/[locale]/(admin)/` — 整个 route group
- Delete: `frontend/app/[locale]/(user)/` — 整个 route group

- [ ] **Step 1: 创建 `[panel]/layout.tsx`**

```tsx
import { SidebarShell } from "@/components/layout/SidebarShell"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { UserSidebar } from "@/components/layout/UserSidebar"

/** 统一面板布局 */
export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ panel: string }>
}) {
  const { panel } = await params

  const isAdmin = panel === "admin"

  return (
    <SidebarShell
      sidebar={isAdmin ? <AdminSidebar /> : <UserSidebar />}
      sidebarClass={isAdmin ? "bg-gray-900 text-gray-300" : "bg-gray-50"}
    >
      {children}
    </SidebarShell>
  )
}
```

- [ ] **Step 2: 移动 admin 页面**

```bash
mkdir -p frontend/app/\[locale\]/\[panel\]/dashboard
mkdir -p frontend/app/\[locale\]/\[panel\]/users
mkdir -p frontend/app/\[locale\]/\[panel\]/roles
mkdir -p frontend/app/\[locale\]/\[panel\]/general-settings
mkdir -p frontend/app/\[locale\]/\[panel\]/web-settings

mv frontend/app/\[locale\]/\(admin\)/admin/dashboard/page.tsx frontend/app/\[locale\]/\[panel\]/dashboard/page.tsx
mv frontend/app/\[locale\]/\(admin\)/admin/users/page.tsx frontend/app/\[locale\]/\[panel\]/users/page.tsx
mv frontend/app/\[locale\]/\(admin\)/admin/roles/page.tsx frontend/app/\[locale\]/\[panel\]/roles/page.tsx
mv frontend/app/\[locale\]/\(admin\)/admin/general-settings/page.tsx frontend/app/\[locale\]/\[panel\]/general-settings/page.tsx
mv frontend/app/\[locale\]/\(admin\)/admin/web-settings/page.tsx frontend/app/\[locale\]/\[panel\]/web-settings/page.tsx
```

- [ ] **Step 3: 移动 user-center 页面**

```bash
mkdir -p frontend/app/\[locale\]/\[panel\]/overview
mkdir -p frontend/app/\[locale\]/\[panel\]/profile
mkdir -p frontend/app/\[locale\]/\[panel\]/documents
mkdir -p frontend/app/\[locale\]/\[panel\]/articles

mv frontend/app/\[locale\]/\(user\)/user-center/dashboard/page.tsx frontend/app/\[locale\]/\[panel\]/overview/page.tsx
mv frontend/app/\[locale\]/\(user\)/user-center/profile/page.tsx frontend/app/\[locale\]/\[panel\]/profile/page.tsx
mv frontend/app/\[locale\]/\(user\)/user-center/documents/page.tsx frontend/app/\[locale\]/\[panel\]/documents/page.tsx
mv frontend/app/\[locale\]/\(user\)/user-center/articles/page.tsx frontend/app/\[locale\]/\[panel\]/articles/page.tsx
```

- [ ] **Step 4: 删除旧 route group**

```bash
rm -rf frontend/app/\[locale\]/\(admin\)
rm -rf frontend/app/\[locale\]/\(user\)
```

- [ ] **Step 5: 更新 user-center dashboard 页面中的导航链接**

`overview/page.tsx`（原 user-center/dashboard）中的链接更新：

```
/user-center/documents → /portal/documents
/user-center/profile → /portal/profile
```

- [ ] **Step 6: Commit**

```bash
git add -A frontend/app/\[locale\]/
git commit -m "refactor: 前端路由从 (admin)/(user) 迁移至 [panel] 动态路由"
```

---

## Task 12: 前端 UserSidebar 路径更新

**Files:**
- Modify: `frontend/components/layout/UserSidebar.tsx:13-17`

- [ ] **Step 1: 更新菜单路径**

```ts
const MENU_KEYS = [
  { key: "overview", href: "/portal/overview", icon: LayoutDashboard },
  { key: "profile", href: "/portal/profile", icon: User },
  { key: "documents", href: "/portal/documents", icon: FileText },
] as const
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/layout/UserSidebar.tsx
git commit -m "refactor: UserSidebar 路径从 /user-center/ 改为 /portal/"
```

---

## Task 13: 前端 ConfigContext 新增 panel-config

**Files:**
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 新增 PanelConfig 类型和数据**

在 ConfigContext 中新增 `panelConfig` 类型定义和获取逻辑：

```ts
/** 面板页面配置项 */
interface PanelPage {
  key: string
  icon: string
  permissions?: string[]
}

/** 面板配置 */
interface PanelConfig {
  admin: PanelPage[]
  portal: PanelPage[]
}
```

- [ ] **Step 2: 在 ConfigContextType 中新增 panelConfig**

```ts
interface ConfigContextType {
  countryCodes: CountryCode[]
  contactInfo: ContactInfo
  siteInfo: SiteInfo
  homepageStats: HomepageStat[]
  aboutInfo: AboutInfo
  panelConfig: PanelConfig
}
```

- [ ] **Step 3: 新增 DEFAULT_PANEL_CONFIG 并在 fetchConfig 中获取**

```ts
const DEFAULT_PANEL_CONFIG: PanelConfig = {
  admin: [],
  portal: [],
}
```

在 `useEffect` 的 `fetchConfig` 中新增：

```ts
api.get("/public/panel-config").then(res => setPanelConfig(res.data)).catch(() => {})
```

- [ ] **Step 4: Commit**

```bash
git add frontend/contexts/ConfigContext.tsx
git commit -m "feat: ConfigContext 新增 panelConfig 获取和类型定义"
```

---

## Task 14: 后端 panel-config 接口

**Files:**
- Modify: `backend/shared/src/app/config/router.py` — 新增 `GET /public/panel-config`
- Modify: `backend/api/scripts/init/seed_config.py` — 新增 `panel_pages` 种子数据

- [ ] **Step 1: 在 seed_config.py 中新增 panel_pages**

在 `CONFIG_ITEMS` 列表末尾新增：

```python
{
    "key": "panel_pages",
    "value": {
        "admin": [
            {"key": "dashboard", "icon": "LayoutDashboard"},
            {"key": "users", "icon": "Users", "permissions": ["admin/users/*"]},
            {"key": "roles", "icon": "Shield", "permissions": ["admin/roles/*"]},
            {"key": "general-settings", "icon": "Wrench", "permissions": ["admin/general-settings/*"]},
            {"key": "web-settings", "icon": "Settings", "permissions": ["admin/web-settings/*"]},
        ],
        "portal": [
            {"key": "overview", "icon": "LayoutDashboard"},
            {"key": "profile", "icon": "User"},
            {"key": "documents", "icon": "FileText"},
            {"key": "articles", "icon": "FileEdit"},
        ],
    },
    "description": "面板页面配置",
},
```

- [ ] **Step 2: 在 config/router.py 新增 public panel-config 端点**

```python
@public_config_router.get("/public/panel-config")
async def get_panel_config(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> ConfigResponse:
    """获取面板页面配置（公开接口，支持 ETag 缓存）。"""
    svc = ConfigService(session)
    config, updated_at = await svc.get_value_with_timestamp("panel_pages")

    if set_cache_headers(
        response, f"panel_pages:{updated_at.isoformat()}", 3600, if_none_match
    ):
        return response  # type: ignore[return-value]

    return config
```

- [ ] **Step 3: Commit**

```bash
git add backend/shared/src/app/config/router.py backend/api/scripts/init/seed_config.py
git commit -m "feat: 新增 panel-config 公开接口和种子数据"
```

---

## Task 15: 前端 E2E 测试路径更新

**Files:**
- Modify: `frontend/e2e/admin/users.spec.ts` — `/admin/users` 保持不变
- Modify: `frontend/e2e/admin/dashboard.spec.ts` — `/admin/dashboard` 保持不变
- Modify: `frontend/e2e/admin/roles.spec.ts` — `/admin/roles` 保持不变
- Modify: `frontend/e2e/user/dashboard.spec.ts` — `/user-center/dashboard` → `/portal/overview`
- Modify: `frontend/e2e/user/documents.spec.ts` — `/user-center/documents` → `/portal/documents`
- Modify: `frontend/e2e/user/articles.spec.ts` — `/user-center/articles` → `/portal/articles`
- Modify: `frontend/e2e/user/profile.spec.ts` — `/user-center/profile` → `/portal/profile`
- Modify: `frontend/e2e/global-setup.ts` — 预加载路径更新
- Modify: `frontend/e2e/global-teardown.ts` — `/api/admin/role/` → `/api/admin/roles/`

- [ ] **Step 1: 更新 user E2E 测试路径**

| 文件 | 旧 | 新 |
|---|---|---|
| `user/dashboard.spec.ts` | `/user-center/dashboard` | `/portal/overview` |
| `user/documents.spec.ts` | `/user-center/documents` | `/portal/documents` |
| `user/articles.spec.ts` | `/user-center/articles` | `/portal/articles` |
| `user/profile.spec.ts` | `/user-center/profile` | `/portal/profile` |

- [ ] **Step 2: 更新 global-setup.ts 和 global-teardown.ts**

global-setup.ts 中预加载路径更新（如有）。

global-teardown.ts 中 API 路径：
- `/api/admin/role/list` → `/api/admin/roles/list`
- `/api/admin/role/delete/` → `/api/admin/roles/delete/`

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/
git commit -m "test: 前端 E2E 测试路径更新适配 panel 统一路由"
```

---

## Task 16: 前端 AuthContext 路径更新

**Files:**
- Modify: `frontend/contexts/AuthContext.tsx` — 检查是否有 `/portal/profile/view` 调用

- [ ] **Step 1: 检查 AuthContext 中的 API 路径**

AuthContext 中 `fetchUser` 使用 `/api/portal/profile/view`，此路径不变（profile 保持单数，路径已正确）。

无需修改。跳过。

---

## Task 17: 前端单元测试路径更新

**Files:**
- Modify: `frontend/tests/contexts/ConfigContext.test.tsx` — 如有 mock 路径
- Modify: 其他引用旧权限格式的测试文件

- [ ] **Step 1: 检查并更新所有前端测试中的旧路径**

搜索前端测试中所有 `admin.user`, `admin.role`, `admin.settings`, `user_center`, `portal.document`, `portal.article` 等旧格式权限名，更新为新格式。

- [ ] **Step 2: 运行前端测试**

```bash
cd frontend && pnpm vitest run
```

Expected: 全部通过

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/
git commit -m "test: 前端测试路径和权限格式更新"
```

---

## Task 18: 最终验证

- [ ] **Step 1: 运行后端全部测试**

```bash
cd backend/api && uv run pytest tests/ -x -q
```

Expected: 全部通过

- [ ] **Step 2: 运行前端全部测试**

```bash
cd frontend && pnpm vitest run
```

Expected: 全部通过

- [ ] **Step 3: TypeScript 类型检查**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 启动开发环境验证**

```bash
docker compose up
```

手动验证：
1. 访问 `/admin/dashboard` — 应正常加载
2. 访问 `/admin/users` — 应正常加载用户列表
3. 访问 `/portal/overview` — 应正常加载用户概览
4. 访问 `/portal/profile` — 应正常加载个人资料
5. 访问 `/portal/documents` — 应正常加载文档列表

- [ ] **Step 5: 最终 Commit（如有遗漏修改）**

```bash
git add -A
git commit -m "chore: panel 统一重构最终调整"
```
