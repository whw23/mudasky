# Plan 1: 基础设施 — 规范更新 + 后端 RPC 重构 + 网关鉴权

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将后端 API 从 RESTful 改为 RPC 风格，网关从路径自动推导权限并全权鉴权，后端移除所有权限校验代码，前端更新所有 API 调用路径。

**Architecture:** 后端 router 路径改为 `/api/{panel}/{resource}/{action}` 格式，网关 auth.lua 从路径提取权限字符串与 JWT claims 匹配，后端移除 `require_permission` 依赖，前端 API 调用路径同步更新。

**Tech Stack:** FastAPI (Python), OpenResty (Lua), Next.js + axios (TypeScript), pytest, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-11-panel-unification-design.md`

---

## 完整路径映射表

以下是所有 API 端点的新旧路径映射，后续 task 按此表改造。

### 认证路由（/api/auth/* — 不变，无需鉴权）

| 旧路径 | 新路径 | HTTP |
| --- | --- | --- |
| `/api/auth/public-key` | `/api/auth/public-key` | GET |
| `/api/auth/sms-code` | `/api/auth/sms-code` | POST |
| `/api/auth/register` | `/api/auth/register` | POST |
| `/api/auth/login` | `/api/auth/login` | POST |
| `/api/auth/refresh` | `/api/auth/refresh` | POST |
| `/api/auth/refresh-token-hash` | `/api/auth/refresh-token-hash` | POST |

### 公开路由（/api/public/* — 无需鉴权）

| 旧路径 | 新路径 | HTTP |
| --- | --- | --- |
| `GET /api/config/{key}` | `GET /api/public/config/{key}` | GET |
| `GET /api/content/categories` | `GET /api/public/content/categories` | GET |
| `GET /api/content/articles` | `GET /api/public/content/articles` | GET |
| `GET /api/content/articles/{id}` | `GET /api/public/content/article/{id}` | GET |
| `GET /api/cases` | `GET /api/public/case/list` | GET |
| `GET /api/cases/{id}` | `GET /api/public/case/detail/{id}` | GET |
| `GET /api/universities` | `GET /api/public/university/list` | GET |
| `GET /api/universities/countries` | `GET /api/public/university/countries` | GET |
| `GET /api/universities/{id}` | `GET /api/public/university/detail/{id}` | GET |
| `GET /api/health` | `GET /api/health` | GET |

### 管理后台路由（/api/admin/* — 需 admin.* 权限）

| 旧路径 | 新路径 | HTTP | 推导权限 |
| --- | --- | --- | --- |
| `GET /api/admin/users` | `GET /api/admin/user/list` | GET | `admin.user.list` |
| `GET /api/admin/users/{id}` | `GET /api/admin/user/detail/{id}` | GET | `admin.user.detail` |
| `PATCH /api/admin/users/{id}` | `POST /api/admin/user/edit/{id}` | POST | `admin.user.edit` |
| `PUT /api/admin/users/{id}/password` | `POST /api/admin/user/reset-password/{id}` | POST | `admin.user.reset-password` |
| `PUT /api/admin/users/{id}/role` | `POST /api/admin/user/assign-role/{id}` | POST | `admin.user.assign-role` |
| `DELETE /api/admin/users/{id}/tokens` | `POST /api/admin/user/force-logout/{id}` | POST | `admin.user.force-logout` |
| `GET /api/admin/config` | `GET /api/admin/settings/list` | GET | `admin.settings.list` |
| `PUT /api/admin/config/{key}` | `POST /api/admin/settings/edit/{key}` | POST | `admin.settings.edit` |
| `GET /api/permissions` | `GET /api/admin/role/permissions` | GET | `admin.role.permissions` |
| `GET /api/roles` | `GET /api/admin/role/list` | GET | `admin.role.list` |
| `GET /api/roles/{id}` | `GET /api/admin/role/detail/{id}` | GET | `admin.role.detail` |
| `POST /api/roles` | `POST /api/admin/role/create` | POST | `admin.role.create` |
| `PATCH /api/roles/{id}` | `POST /api/admin/role/edit/{id}` | POST | `admin.role.edit` |
| `PATCH /api/roles/reorder` | `POST /api/admin/role/reorder` | POST | `admin.role.reorder` |
| `DELETE /api/roles/{id}` | `POST /api/admin/role/delete/{id}` | POST | `admin.role.delete` |
| `GET /api/admin/content/categories` | `GET /api/admin/category/list` | GET | `admin.category.list` |
| `POST /api/admin/content/categories` | `POST /api/admin/category/create` | POST | `admin.category.create` |
| `PATCH /api/admin/content/categories/{id}` | `POST /api/admin/category/edit/{id}` | POST | `admin.category.edit` |
| `DELETE /api/admin/content/categories/{id}` | `POST /api/admin/category/delete/{id}` | POST | `admin.category.delete` |
| `GET /api/admin/content/articles` | `GET /api/admin/content/list` | GET | `admin.content.list` |
| `POST /api/admin/content/articles` | `POST /api/admin/content/create` | POST | `admin.content.create` |
| `PATCH /api/admin/content/articles/{id}` | `POST /api/admin/content/edit/{id}` | POST | `admin.content.edit` |
| `DELETE /api/admin/content/articles/{id}` | `POST /api/admin/content/delete/{id}` | POST | `admin.content.delete` |
| `GET /api/admin/cases` | `GET /api/admin/case/list` | GET | `admin.case.list` |
| `POST /api/admin/cases` | `POST /api/admin/case/create` | POST | `admin.case.create` |
| `PATCH /api/admin/cases/{id}` | `POST /api/admin/case/edit/{id}` | POST | `admin.case.edit` |
| `DELETE /api/admin/cases/{id}` | `POST /api/admin/case/delete/{id}` | POST | `admin.case.delete` |
| `GET /api/admin/universities` | `GET /api/admin/university/list` | GET | `admin.university.list` |
| `POST /api/admin/universities` | `POST /api/admin/university/create` | POST | `admin.university.create` |
| `PATCH /api/admin/universities/{id}` | `POST /api/admin/university/edit/{id}` | POST | `admin.university.edit` |
| `DELETE /api/admin/universities/{id}` | `POST /api/admin/university/delete/{id}` | POST | `admin.university.delete` |

### 用户面板路由（/api/portal/* — 需 portal.* 权限）

| 旧路径 | 新路径 | HTTP | 推导权限 |
| --- | --- | --- | --- |
| `GET /api/users/me` | `GET /api/portal/profile/view` | GET | `portal.profile.view` |
| `PATCH /api/users/me` | `POST /api/portal/profile/edit` | POST | `portal.profile.edit` |
| `PUT /api/users/me/password` | `POST /api/portal/profile/password` | POST | `portal.profile.password` |
| `PUT /api/users/me/phone` | `POST /api/portal/profile/phone` | POST | `portal.profile.phone` |
| `POST /api/users/me/2fa/enable-totp` | `POST /api/portal/profile/2fa-enable-totp` | POST | `portal.profile.2fa-enable-totp` |
| `POST /api/users/me/2fa/confirm-totp` | `POST /api/portal/profile/2fa-confirm-totp` | POST | `portal.profile.2fa-confirm-totp` |
| `POST /api/users/me/2fa/enable-sms` | `POST /api/portal/profile/2fa-enable-sms` | POST | `portal.profile.2fa-enable-sms` |
| `POST /api/users/me/2fa/disable` | `POST /api/portal/profile/2fa-disable` | POST | `portal.profile.2fa-disable` |
| `GET /api/content/my` | `GET /api/portal/article/list` | GET | `portal.article.list` |
| `POST /api/content/articles` | `POST /api/portal/article/create` | POST | `portal.article.create` |
| `PATCH /api/content/articles/{id}` | `POST /api/portal/article/edit/{id}` | POST | `portal.article.edit` |
| `DELETE /api/content/articles/{id}` | `POST /api/portal/article/delete/{id}` | POST | `portal.article.delete` |
| `POST /api/documents/upload` | `POST /api/portal/document/upload` | POST | `portal.document.upload` |
| `GET /api/documents` | `GET /api/portal/document/list` | GET | `portal.document.list` |
| `GET /api/documents/{id}` | `GET /api/portal/document/detail/{id}` | GET | `portal.document.detail` |
| `GET /api/documents/{id}/download` | `GET /api/portal/document/download/{id}` | GET | `portal.document.download` |
| `DELETE /api/documents/{id}` | `POST /api/portal/document/delete/{id}` | POST | `portal.document.delete` |

---

## Task 清单

### Task 1: 更新 code-style 规范

**Files:**
- Modify: `.claude/rules/code-style.md`

- [ ] **Step 1: 更新 API Route 规范**

在 `.claude/rules/code-style.md` 中，将 API Route 部分从：

```markdown
### API Route

- URL path: kebab-case `/user-profile`
- RESTful 风格，通过 HTTP method 区分操作
- 用 HTTP status code 表达结果，禁止在 200 响应体里自定义错误码
- `GET` 查询、`POST` 创建、`PUT` 全量更新、`PATCH` 部分更新、`DELETE` 删除
```

改为：

```markdown
### API Route

- RPC 风格，action-in-URL：`/api/{panel}/{resource}/{action}`
- 四类路径前缀：`/api/auth/*`（认证）、`/api/public/*`（公开）、`/api/admin/*`（管理）、`/api/portal/*`（用户面板）
- 读操作用 `GET`，写操作用 `POST`
- URL path: kebab-case
- 用 HTTP status code 表达结果，禁止在 200 响应体里自定义错误码
- 权限由网关从路径自动推导，后端不做权限校验
```

- [ ] **Step 2: 提交**

```bash
git add .claude/rules/code-style.md
git commit -m "docs: API 风格从 RESTful 改为 RPC"
```

---

### Task 2: 后端权限重命名 — user_center → portal

**Files:**
- Modify: `backend/api/scripts/init/seed_rbac.py`

- [ ] **Step 1: 替换所有 user_center 为 portal**

在 `seed_rbac.py` 中：
1. 所有 `"user_center.` 替换为 `"portal.`
2. 所有 `permission.user_center.` 替换为 `permission.portal.`
3. 注释"用户中心"保持不变（中文注释不影响）
4. 新增权限：

```python
# 管理后台 - 仪表盘
("admin.dashboard.view", "permission.admin.dashboard.view", "查看管理仪表盘"),
# 用户面板 - 概览
("portal.overview.view", "permission.portal.overview.view", "查看个人概览"),
# 管理后台 - 面板配置
("admin.panel.view", "permission.admin.panel.view", "查看面板配置"),
("admin.panel.edit", "permission.admin.panel.edit", "编辑面板配置"),
```

5. 新增通配符权限：

```python
("admin.dashboard.*", "permission.admin.dashboard.all", "所有仪表盘权限"),
("portal.overview.*", "permission.portal.overview.all", "所有概览权限"),
("admin.panel.*", "permission.admin.panel.all", "所有面板配置权限"),
```

6. ROLES 中更新：`"user_center.*"` → `"portal.*"`

- [ ] **Step 2: 更新数据库权限数据**

```bash
docker compose exec db psql -U mudasky -d mudasky -c "
UPDATE permission SET code = REPLACE(code, 'user_center.', 'portal.'), name_key = REPLACE(name_key, 'user_center.', 'portal.') WHERE code LIKE 'user_center.%';
"
```

- [ ] **Step 3: 提交**

```bash
git add backend/api/scripts/init/seed_rbac.py
git commit -m "refactor: 权限前缀 user_center → portal + 新增 dashboard/overview/panel 权限"
```

---

### Task 3: 后端 Router 改 RPC 风格 — 公开路由

**Files:**
- Modify: `backend/shared/src/app/config/router.py`
- Modify: `backend/shared/src/app/content/router.py`
- Modify: `backend/shared/src/app/case/router.py`
- Modify: `backend/shared/src/app/university/router.py`

- [ ] **Step 1: 改造 config router 公开部分**

`config/router.py` 中 `get_config` 端点路径从 `/config/{key}` 改为 `/public/config/{key}`：

```python
router = APIRouter(tags=["config"])

@router.get("/public/config/{key}")
async def get_config(key: str, session: DbSession, response: Response, if_none_match: str | None = Header(None)) -> ConfigResponse:
    ...
```

- [ ] **Step 2: 改造 content router 公开部分**

`content/router.py` 中公开端点路径改为 `/public/content/` 前缀：

```python
# 公开路由
router = APIRouter(tags=["content"])

@router.get("/public/content/articles")
async def list_published_articles(...):

@router.get("/public/content/article/{article_id}")
async def get_published_article(...):

@router.get("/public/content/categories")
async def list_categories(...):
```

用户自己的文章路由移到 portal 前缀（Task 4 处理）。

- [ ] **Step 3: 改造 case router 公开部分**

`case/router.py` 中公开端点路径改为 `/public/case/` 前缀：

```python
router = APIRouter(tags=["cases"])

@router.get("/public/case/list")
async def list_cases(...):

@router.get("/public/case/detail/{case_id}")
async def get_case(...):
```

- [ ] **Step 4: 改造 university router 公开部分**

`university/router.py` 中 `public_router` 路径改为 `/public/university/` 前缀：

```python
public_router = APIRouter(tags=["universities"])

@public_router.get("/public/university/list")
async def list_universities(...):

@public_router.get("/public/university/countries")
async def list_countries(...):

@public_router.get("/public/university/detail/{university_id}")
async def get_university(...):
```

- [ ] **Step 5: 提交**

```bash
git add backend/shared/src/app/config/router.py backend/shared/src/app/content/router.py backend/shared/src/app/case/router.py backend/shared/src/app/university/router.py
git commit -m "refactor: 公开路由统一 /api/public/ 前缀"
```

---

### Task 4: 后端 Router 改 RPC 风格 — admin 路由

**Files:**
- Modify: `backend/shared/src/app/admin/router.py`
- Modify: `backend/shared/src/app/config/router.py`（admin 部分）
- Modify: `backend/shared/src/app/content/admin_router.py`
- Modify: `backend/shared/src/app/case/admin_router.py`
- Modify: `backend/shared/src/app/rbac/router.py`
- Modify: `backend/shared/src/app/university/router.py`（admin 部分）

所有 admin 路由：
1. 路径改为 `/admin/{resource}/{action}` 格式
2. 写操作 HTTP method 统一改 POST
3. 移除所有 `Depends(require_permission(...))` 依赖（网关鉴权）

- [ ] **Step 1: 改造 admin/router.py（用户管理）**

```python
router = APIRouter(prefix="/admin/user", tags=["admin-user"])

@router.get("/list")
async def list_users(session: DbSession, search: str | None = None, offset: int = 0, limit: int = 20):

@router.get("/detail/{user_id}")
async def get_user(user_id: str, session: DbSession):

@router.post("/edit/{user_id}")
async def update_user(user_id: str, data: AdminUserUpdate, session: DbSession):

@router.post("/reset-password/{user_id}")
async def reset_password(user_id: str, data: PasswordResetRequest, session: DbSession):

@router.post("/assign-role/{user_id}")
async def assign_role(user_id: str, data: RoleAssignRequest, session: DbSession):

@router.post("/force-logout/{user_id}")
async def force_logout(user_id: str, session: DbSession):
```

移除所有 `dependencies=[Depends(require_permission(...))]`。

- [ ] **Step 2: 改造 config/router.py（admin 部分）**

```python
@router.get("/admin/settings/list")
async def list_configs(session: DbSession):

@router.post("/admin/settings/edit/{key}")
async def update_config(key: str, data: ConfigUpdateRequest, session: DbSession):
```

- [ ] **Step 3: 改造 rbac/router.py**

```python
router = APIRouter(prefix="/admin/role", tags=["admin-role"])

@router.get("/permissions")
async def list_permissions(session: DbSession):

@router.get("/list")
async def list_roles(session: DbSession):

@router.get("/detail/{role_id}")
async def get_role(role_id: str, session: DbSession):

@router.post("/create")
async def create_role(data: RoleCreate, session: DbSession):

@router.post("/edit/{role_id}")
async def update_role(role_id: str, data: RoleUpdate, session: DbSession):

@router.post("/reorder")
async def reorder_roles(data: RoleReorderRequest, session: DbSession):

@router.post("/delete/{role_id}")
async def delete_role(role_id: str, session: DbSession):
```

- [ ] **Step 4: 改造 content/admin_router.py**

```python
# 分类管理
category_router = APIRouter(prefix="/admin/category", tags=["admin-category"])

@category_router.get("/list")
async def admin_list_categories(session: DbSession):

@category_router.post("/create")
async def admin_create_category(data: CategoryCreate, session: DbSession):

@category_router.post("/edit/{category_id}")
async def admin_update_category(category_id: str, data: CategoryUpdate, session: DbSession):

@category_router.post("/delete/{category_id}")
async def admin_delete_category(category_id: str, session: DbSession):

# 文章管理
article_router = APIRouter(prefix="/admin/content", tags=["admin-content"])

@article_router.get("/list")
async def admin_list_articles(session: DbSession, ...):

@article_router.post("/create")
async def admin_create_article(data: ArticleCreate, session: DbSession):

@article_router.post("/edit/{article_id}")
async def admin_update_article(article_id: str, data: ArticleUpdate, session: DbSession):

@article_router.post("/delete/{article_id}")
async def admin_delete_article(article_id: str, session: DbSession):
```

- [ ] **Step 5: 改造 case/admin_router.py**

```python
router = APIRouter(prefix="/admin/case", tags=["admin-case"])

@router.get("/list")
async def admin_list_cases(session: DbSession, ...):

@router.post("/create")
async def admin_create_case(data: CaseCreate, session: DbSession):

@router.post("/edit/{case_id}")
async def admin_update_case(case_id: str, data: CaseUpdate, session: DbSession):

@router.post("/delete/{case_id}")
async def admin_delete_case(case_id: str, session: DbSession):
```

- [ ] **Step 6: 改造 university/router.py（admin 部分）**

```python
admin_router = APIRouter(prefix="/admin/university", tags=["admin-university"])

@admin_router.get("/list")
async def admin_list_universities(session: DbSession, ...):

@admin_router.post("/create")
async def admin_create_university(data: UniversityCreate, session: DbSession):

@admin_router.post("/edit/{university_id}")
async def admin_update_university(university_id: str, data: UniversityUpdate, session: DbSession):

@admin_router.post("/delete/{university_id}")
async def admin_delete_university(university_id: str, session: DbSession):
```

- [ ] **Step 7: 提交**

```bash
git add backend/shared/src/app/
git commit -m "refactor: admin 路由统一 RPC 风格 + 移除 require_permission"
```

---

### Task 5: 后端 Router 改 RPC 风格 — portal 路由

**Files:**
- Modify: `backend/shared/src/app/user/router.py`
- Modify: `backend/shared/src/app/document/router.py`
- Modify: `backend/shared/src/app/content/router.py`（用户文章部分）

- [ ] **Step 1: 改造 user/router.py → portal/profile**

```python
router = APIRouter(prefix="/portal/profile", tags=["portal-profile"])

@router.get("/view")
async def get_me(user_id: CurrentUserId, session: DbSession):

@router.post("/edit")
async def update_me(data: UserUpdate, user_id: CurrentUserId, session: DbSession):

@router.post("/password")
async def change_password(data: PasswordChange, user_id: CurrentUserId, session: DbSession):

@router.post("/phone")
async def change_phone(data: PhoneChange, user_id: CurrentUserId, session: DbSession):

@router.post("/2fa-enable-totp")
async def enable_2fa_totp(user_id: CurrentUserId, session: DbSession):

@router.post("/2fa-confirm-totp")
async def confirm_2fa_totp(data: TotpCodeBody, user_id: CurrentUserId, session: DbSession):

@router.post("/2fa-enable-sms")
async def enable_2fa_sms(data: Sms2faBody, user_id: CurrentUserId, session: DbSession):

@router.post("/2fa-disable")
async def disable_2fa(data: Sms2faBody, user_id: CurrentUserId, session: DbSession):
```

- [ ] **Step 2: 改造 document/router.py → portal/document**

```python
router = APIRouter(prefix="/portal/document", tags=["portal-document"])

@router.post("/upload")
async def upload_document(file: UploadFile, user_id: CurrentUserId, session: DbSession):

@router.get("/list")
async def list_documents(user_id: CurrentUserId, session: DbSession, ...):

@router.get("/detail/{doc_id}")
async def get_document(doc_id: str, user_id: CurrentUserId, session: DbSession):

@router.get("/download/{doc_id}")
async def download_document(doc_id: str, user_id: CurrentUserId, session: DbSession):

@router.post("/delete/{doc_id}")
async def delete_document(doc_id: str, user_id: CurrentUserId, session: DbSession):
```

- [ ] **Step 3: 改造 content/router.py 用户文章部分 → portal/article**

从 content/router.py 中拆出用户文章路由，移到新的 portal 前缀：

```python
# 在 content/router.py 中新增或拆分
portal_article_router = APIRouter(prefix="/portal/article", tags=["portal-article"])

@portal_article_router.get("/list")
async def list_my_articles(user_id: CurrentUserId, session: DbSession, ...):

@portal_article_router.post("/create")
async def create_article(data: ArticleCreate, user_id: CurrentUserId, session: DbSession):

@portal_article_router.post("/edit/{article_id}")
async def update_own_article(article_id: str, user_id: CurrentUserId, session: DbSession, ...):

@portal_article_router.post("/delete/{article_id}")
async def delete_own_article(article_id: str, user_id: CurrentUserId, session: DbSession):
```

- [ ] **Step 4: 提交**

```bash
git add backend/shared/src/app/
git commit -m "refactor: portal 路由统一 RPC 风格"
```

---

### Task 6: 更新 main.py router 挂载

**Files:**
- Modify: `backend/api/src/api/main.py`

- [ ] **Step 1: 更新 router 导入和挂载**

根据 Task 3-5 的 router 改造，更新 main.py 中的导入和 `include_router` 调用。注意：

1. config_router 现在有公开路由（`/public/config/`）和 admin 路由（`/admin/settings/`），都在同一个 router
2. content 拆成三个 router：公开（`/public/content/`）、admin（`/admin/content/` + `/admin/category/`）、portal（`/portal/article/`）
3. rbac_router prefix 改为 `/admin/role`
4. university 拆成两个 router：公开和 admin
5. 移除 prefix 参数（prefix 已在各 router 内部定义）

- [ ] **Step 2: 运行后端验证**

```bash
cd backend/api && uv run python -c "from api.main import app; print('Router mount OK')"
```

- [ ] **Step 3: 提交**

```bash
git add backend/api/src/api/main.py
git commit -m "refactor: 更新 router 挂载适配 RPC 路径"
```

---

### Task 7: 网关鉴权重写 — 路径推导权限

**Files:**
- Modify: `gateway/lua/auth.lua`
- Modify: `gateway/lua/init.lua`

- [ ] **Step 1: 更新公开路由白名单 (init.lua)**

```lua
local public_routes = {
  { method = "POST", prefix = "/api/auth/" },
  { method = "GET", prefix = "/api/auth/" },
  { method = "GET", prefix = "/api/public/" },
  { method = "GET", prefix = "/api/health" },
}

function _M.is_public(method, uri)
  for _, r in ipairs(public_routes) do
    if method == r.method and string.find(uri, r.prefix, 1, true) == 1 then
      return true
    end
  end
  return false
end
```

- [ ] **Step 2: 添加权限提取和匹配函数 (auth.lua)**

在 auth.lua 的用户信息注入部分之后（第 97 行后），添加权限校验：

```lua
-- 从路径提取权限字符串
-- /api/admin/user/list/xxx → admin.user.list
local function extract_permission(uri)
  -- 去掉 /api/ 前缀
  local path = string.match(uri, "^/api/(.+)$")
  if not path then return nil end

  -- 取前三段，用 . 拼接
  local segments = {}
  for seg in string.gmatch(path, "[^/]+") do
    table.insert(segments, seg)
    if #segments == 3 then break end
  end

  if #segments < 3 then return nil end
  -- kebab-case 转 snake_case（权限用下划线）
  local perm = table.concat(segments, ".")
  perm = string.gsub(perm, "-", "_")
  return perm
end

-- 检查用户是否拥有指定权限
local function has_permission(user_perms, required)
  for _, p in ipairs(user_perms) do
    if p == "*" then return true end
    if p == required then return true end
    -- 通配符匹配：admin.* 匹配 admin.user.list
    if string.sub(p, -2) == ".*" then
      local prefix = string.sub(p, 1, -3)
      if string.find(required, prefix, 1, true) == 1 then
        return true
      end
    end
  end
  return false
end

-- 对 /api/admin/* 和 /api/portal/* 做权限校验
if string.find(uri, "^/api/admin/") or string.find(uri, "^/api/portal/") then
  local required_perm = extract_permission(uri)
  if required_perm then
    local perms = payload.permissions or {}
    if not has_permission(perms, required_perm) then
      reject(403, "FORBIDDEN")
    end
  end
end
```

- [ ] **Step 3: 移除 X-User-Permissions 请求头注入**

网关不再需要把 permissions 透传给后端（后端不做权限校验了）。删除 auth.lua 中的：

```lua
-- 删除这两行
local perms = payload.permissions or {}
ngx.req.set_header("X-User-Permissions", table.concat(perms, ","))
```

- [ ] **Step 4: 更新 nginx location 路由 (server.conf)**

检查 `gateway/conf.d/server.conf`，确保 `/api/` 的 location block 能正确匹配新路径。当前配置 `location /api/` 已经是前缀匹配，不需要改。

- [ ] **Step 5: 提交**

```bash
git add gateway/lua/auth.lua gateway/lua/init.lua
git commit -m "refactor: 网关从路径自动推导权限并校验"
```

---

### Task 8: 后端清理 — 移除权限依赖代码

**Files:**
- Modify: `backend/shared/src/app/core/dependencies.py`

- [ ] **Step 1: 移除 require_permission 相关代码**

从 `dependencies.py` 中删除：
- `CurrentPermissions` 类型别名
- `get_current_permissions` 函数
- `require_permission` 函数
- `require_any_permission` 函数

保留 `CurrentUserId`、`DbSession`、`get_current_user_id` 等。

- [ ] **Step 2: 确认所有 router 中已无 require_permission 引用**

```bash
grep -rn "require_permission\|require_any_permission\|CurrentPermissions" backend/shared/src/app/
```

预期输出为空。如有残留，删除。

- [ ] **Step 3: 提交**

```bash
git add backend/shared/src/app/core/dependencies.py
git commit -m "refactor: 移除后端权限校验代码（网关全权鉴权）"
```

---

### Task 9: 前端 API 调用路径更新

**Files:**
- Modify: `frontend/lib/content-api.ts`
- Modify: `frontend/contexts/ConfigContext.tsx`
- Modify: `frontend/contexts/AuthContext.tsx`
- Modify: `frontend/lib/crypto.ts`
- Modify: `frontend/components/auth/*.tsx`
- Modify: `frontend/components/user/*.tsx`
- Modify: `frontend/components/admin/*.tsx`
- Modify: `frontend/components/admin/web-settings/*.tsx`
- Modify: `frontend/app/[locale]/(admin)/admin/*/page.tsx`
- Modify: `frontend/app/[locale]/(user)/user-center/dashboard/page.tsx`
- Modify: `frontend/app/[locale]/(public)/cases/page.tsx`

- [ ] **Step 1: 更新 API 工具文件**

`lib/content-api.ts`：
- `${baseUrl}/api/content/categories` → `${baseUrl}/api/public/content/categories`
- `${baseUrl}/api/content/articles?...` → `${baseUrl}/api/public/content/articles?...`
- `${baseUrl}/api/content/articles/${id}` → `${baseUrl}/api/public/content/article/${id}`

`contexts/ConfigContext.tsx`：
- `/config/phone_country_codes` → `/public/config/phone_country_codes`
- `/config/contact_info` → `/public/config/contact_info`
- `/config/site_info` → `/public/config/site_info`
- `/config/homepage_stats` → `/public/config/homepage_stats`
- `/config/about_info` → `/public/config/about_info`

`contexts/AuthContext.tsx`：
- `/users/me` → `/portal/profile/view`

- [ ] **Step 2: 更新认证组件（不变，只确认）**

`/auth/login`、`/auth/register`、`/auth/sms-code`、`/auth/public-key` 路径不变。

- [ ] **Step 3: 更新用户组件**

`components/user/ProfileInfo.tsx`：
- `api.patch('/users/me', ...)` → `api.post('/portal/profile/edit', ...)`
- `api.put('/users/me/password', ...)` → `api.post('/portal/profile/password', ...)`
- `api.put('/users/me/phone', ...)` → `api.post('/portal/profile/phone', ...)`
- `api.post('/users/me/2fa/enable-totp', ...)` → `api.post('/portal/profile/2fa-enable-totp', ...)`
- `api.post('/users/me/2fa/confirm-totp', ...)` → `api.post('/portal/profile/2fa-confirm-totp', ...)`
- `api.post('/users/me/2fa/enable-sms', ...)` → `api.post('/portal/profile/2fa-enable-sms', ...)`
- `api.post('/users/me/2fa/disable', ...)` → `api.post('/portal/profile/2fa-disable', ...)`

`components/user/ChangePassword.tsx`：
- `api.put('/users/me/password', ...)` → `api.post('/portal/profile/password', ...)`

`components/user/ChangePhone.tsx`：
- `api.put('/users/me/phone', ...)` → `api.post('/portal/profile/phone', ...)`

`components/user/TwoFactorSettings.tsx`：
- 所有 2fa 路径同上

`components/user/DocumentList.tsx`：
- `api.get("/documents", ...)` → `api.get("/portal/document/list", ...)`
- `api.delete(\`/documents/${id}\`)` → `api.post(\`/portal/document/delete/${id}\`)`

`components/user/DocumentUpload.tsx`：
- `api.post("/documents/upload", ...)` → `api.post("/portal/document/upload", ...)`

`components/user/ArticleList.tsx`：
- `api.get("/content/my", ...)` → `api.get("/portal/article/list", ...)`
- `api.delete(\`/content/articles/${id}\`)` → `api.post(\`/portal/article/delete/${id}\`)`

`components/user/ArticleEditor.tsx`：
- `api.get("/content/categories")` → `api.get("/public/content/categories")`
- `api.patch(\`/admin/content/articles/${id}\`, ...)` → `api.post(\`/portal/article/edit/${id}\`, ...)`
- `api.post("/admin/content/articles", ...)` → `api.post("/portal/article/create", ...)`

- [ ] **Step 4: 更新 admin 组件**

`components/admin/UserTable.tsx`：
- `api.get("/admin/users", ...)` → `api.get("/admin/user/list", ...)`

`components/admin/UserDrawer.tsx`：
- `api.get(\`/admin/users/${id}\`)` → `api.get(\`/admin/user/detail/${id}\`)`
- `api.get("/roles")` → `api.get("/admin/role/list")`
- `api.patch(\`/admin/users/${id}\`, ...)` → `api.post(\`/admin/user/edit/${id}\`, ...)`
- `api.put(\`/admin/users/${id}/role\`, ...)` → `api.post(\`/admin/user/assign-role/${id}\`, ...)`
- `api.put(\`/admin/users/${id}/password\`, ...)` → `api.post(\`/admin/user/reset-password/${id}\`, ...)`
- `api.delete(\`/admin/users/${id}/tokens\`)` → `api.post(\`/admin/user/force-logout/${id}\`)`

`components/admin/RoleList.tsx`：
- `api.get("/roles")` → `api.get("/admin/role/list")`
- `api.patch("/roles/reorder", ...)` → `api.post("/admin/role/reorder", ...)`
- `api.delete(\`/roles/${id}\`)` → `api.post(\`/admin/role/delete/${id}\`)`

`components/admin/RoleDialog.tsx`：
- `api.get("/permissions")` → `api.get("/admin/role/permissions")`
- `api.patch(\`/roles/${id}\`, ...)` → `api.post(\`/admin/role/edit/${id}\`, ...)`
- `api.post("/roles", ...)` → `api.post("/admin/role/create", ...)`

`components/admin/ArticleTable.tsx`：
- `api.get("/admin/content/articles", ...)` → `api.get("/admin/content/list", ...)`
- `api.patch(\`/admin/content/articles/${id}\`, ...)` → `api.post(\`/admin/content/edit/${id}\`, ...)`
- `api.delete(\`/admin/content/articles/${id}\`)` → `api.post(\`/admin/content/delete/${id}\`)`

`components/admin/CategoryTable.tsx`：
- `api.get("/admin/content/categories")` → `api.get("/admin/category/list")`
- `api.delete(\`/admin/content/categories/${id}\`)` → `api.post(\`/admin/category/delete/${id}\`)`

`components/admin/CategoryDialog.tsx`：
- `api.patch(\`/admin/content/categories/${id}\`, ...)` → `api.post(\`/admin/category/edit/${id}\`, ...)`
- `api.post("/admin/content/categories", ...)` → `api.post("/admin/category/create", ...)`

`components/admin/CaseTable.tsx`：
- `api.get("/admin/cases", ...)` → `api.get("/admin/case/list", ...)`
- `api.patch(\`/admin/cases/${id}\`, ...)` → `api.post(\`/admin/case/edit/${id}\`, ...)`
- `api.delete(\`/admin/cases/${id}\`)` → `api.post(\`/admin/case/delete/${id}\`)`

`components/admin/CaseDialog.tsx`：
- `api.patch(\`/admin/cases/${id}\`, ...)` → `api.post(\`/admin/case/edit/${id}\`, ...)`
- `api.post("/admin/cases", ...)` → `api.post("/admin/case/create", ...)`

`components/admin/UniversityTable.tsx`：
- `api.get("/admin/universities", ...)` → `api.get("/admin/university/list", ...)`
- `api.delete(\`/admin/universities/${id}\`)` → `api.post(\`/admin/university/delete/${id}\`)`

`components/admin/UniversityDialog.tsx`：
- `api.patch(\`/admin/universities/${id}\`, ...)` → `api.post(\`/admin/university/edit/${id}\`, ...)`
- `api.post("/admin/universities", ...)` → `api.post("/admin/university/create", ...)`

`components/admin/CountryCodeEditor.tsx`：
- `api.get('/admin/config')` → `api.get('/admin/settings/list')`
- `api.put('/admin/config/phone_country_codes', ...)` → `api.post('/admin/settings/edit/phone_country_codes', ...)`

`components/admin/ConfigEditDialog.tsx`：
- `api.post("/documents/upload", ...)` → `api.post("/portal/document/upload", ...)`

- [ ] **Step 5: 更新 admin 页面**

`app/[locale]/(admin)/admin/web-settings/page.tsx`：
- `api.get('/admin/config')` → `api.get('/admin/settings/list')`
- `api.put(\`/admin/config/${key}\`, ...)` → `api.post(\`/admin/settings/edit/${key}\`, ...)`

`app/[locale]/(admin)/admin/general-settings/page.tsx`：
- 同上

`app/[locale]/(admin)/admin/dashboard/page.tsx`：
- `api.get("/admin/users", ...)` → `api.get("/admin/user/list", ...)`
- `api.get("/admin/content/articles", ...)` → `api.get("/admin/content/list", ...)`
- `api.get("/admin/content/categories")` → `api.get("/admin/category/list")`

- [ ] **Step 6: 更新 portal 页面**

`app/[locale]/(user)/user-center/dashboard/page.tsx`：
- `api.get("/documents", ...)` → `api.get("/portal/document/list", ...)`

- [ ] **Step 7: 更新 web-settings 预览组件**

`components/admin/web-settings/CasesPreview.tsx`：
- `api.get("/cases?page_size=6")` → `api.get("/public/case/list?page_size=6")`

`components/admin/web-settings/NewsPreview.tsx`：
- `api.get("/content/categories")` → `api.get("/public/content/categories")`
- `api.get("/content/articles?page_size=6")` → `api.get("/public/content/articles?page_size=6")`

- [ ] **Step 8: 更新公开页面 server-side fetch**

`app/[locale]/(public)/cases/page.tsx`：
- `${baseUrl}/api/cases?page_size=100` → `${baseUrl}/api/public/case/list?page_size=100`

- [ ] **Step 9: 提交**

```bash
git add frontend/
git commit -m "refactor: 前端所有 API 调用路径更新为 RPC 风格"
```

---

### Task 10: 后端测试更新

**Files:**
- Modify: `backend/api/tests/` 下所有测试文件

- [ ] **Step 1: 更新 httpx E2E 测试路径**

`tests/e2e/` 下所有测试文件的 API 路径按映射表更新：
- `/api/admin/users` → `/api/admin/user/list`
- `/api/roles` → `/api/admin/role/list`
- 等等

同时更新 HTTP method：`PATCH` → `POST`，`PUT` → `POST`，`DELETE` → `POST`。

- [ ] **Step 2: 更新单元测试中的 mock 路径**

删除所有 `require_permission` 相关的 mock。更新 router 测试中的路径。

- [ ] **Step 3: 运行后端全部测试**

```bash
cd backend/api && uv run pytest tests/ -m "not e2e" --tb=short -q
```

- [ ] **Step 4: 提交**

```bash
git add backend/api/tests/
git commit -m "test: 后端测试路径更新适配 RPC 风格"
```

---

### Task 11: 前端测试更新

**Files:**
- Modify: `frontend/tests/` 下相关测试文件
- Modify: `frontend/e2e/` 下所有测试文件

- [ ] **Step 1: 更新 Vitest 单元测试**

检查 `frontend/tests/` 中引用旧 API 路径的测试，更新为新路径。

- [ ] **Step 2: 更新 Playwright E2E 测试**

`frontend/e2e/` 下的测试文件路径不受 API 路径变更影响（E2E 测试的是页面，不是 API），但 global-teardown.ts 中的清理 API 调用需要更新：

- `api/roles` → `api/admin/role/list`
- `api/roles/${id}` → `api/admin/role/delete/${id}`

- [ ] **Step 3: 运行前端全部测试**

```bash
cd frontend && npx vitest run && npx playwright test --config=e2e/playwright.config.ts
```

- [ ] **Step 4: 提交**

```bash
git add frontend/tests/ frontend/e2e/
git commit -m "test: 前端测试路径更新适配 RPC 风格"
```

---

### Task 12: 集成验证

- [ ] **Step 1: 重建 dev 环境**

```bash
docker compose down -v && docker compose up -d --build
```

- [ ] **Step 2: 验证公开接口**

```bash
curl -s http://localhost/api/public/config/site_info | head -1
curl -s http://localhost/api/public/case/list | head -1
curl -s http://localhost/api/public/university/list | head -1
curl -s http://localhost/api/public/content/categories | head -1
curl -s http://localhost/api/health | head -1
```

- [ ] **Step 3: 验证权限拦截**

```bash
# 未登录访问 admin 接口应返回 401
curl -s -o /dev/null -w "%{http_code}" http://localhost/api/admin/user/list

# 未登录访问 portal 接口应返回 401
curl -s -o /dev/null -w "%{http_code}" http://localhost/api/portal/profile/view
```

- [ ] **Step 4: 运行所有测试**

```bash
cd backend/api && uv run pytest tests/ --tb=short -q
cd frontend && npx vitest run
cd frontend && npx playwright test --config=e2e/playwright.config.ts
```

- [ ] **Step 5: 最终提交（如有修复）**

```bash
git add -A
git commit -m "fix: 集成验证修复"
```
