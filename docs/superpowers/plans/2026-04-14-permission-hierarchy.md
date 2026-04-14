# 权限层级结构重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一文件系统、路由、权限为三位一体结构，简化权限系统，新增 students/contacts 模块。

**Architecture:** URL 路径层级化（list/detail/edit），权限码直接等于静态 URL 路径。删除 Permission 表，Role.permissions 改为 JSON 通配符数组。网关全路径提取 + 祖先匹配。portal 拆分为 profile/sessions/two-factor/documents，删除 articles/content。新增 admin/students 和 admin/contacts。

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy async, Pydantic, OpenResty Lua, pytest

**Spec:** `docs/superpowers/specs/2026-04-14-permission-hierarchy-design.md`

---

## Task 1: 前置准备

- [ ] **Step 1: 创建 feat 分支**

```bash
git checkout -b feat/permission-hierarchy
```

- [ ] **Step 2: 提交**

```bash
git commit --allow-empty -m "chore: 开始权限层级结构重构"
```

---

## Task 2: 权限系统简化 — 数据库变更

**Files:**
- Modify: `backend/shared/app/db/rbac/models.py` — Role 表新增 permissions JSON 列
- Delete: `backend/shared/app/db/rbac/tables.py` — 删除 role_permission 关联表
- Modify: `backend/shared/app/db/rbac/repository.py` — 删除 Permission 相关方法，简化 Role 查询
- Modify: `backend/shared/app/db/user/models.py` — 新增 contact_status、contact_note、advisor_id
- Create: `backend/shared/app/db/contact/__init__.py`
- Create: `backend/shared/app/db/contact/models.py` — ContactRecord 表
- Create: `backend/shared/app/db/contact/repository.py`

- [ ] **Step 1: 修改 Role model**

`backend/shared/app/db/rbac/models.py`:

```python
# 删除 Permission 类
# 删除 Role 的 permissions relationship
# 新增 permissions JSON 列：
permissions: Mapped[list] = mapped_column(JSON, default=list)
```

- [ ] **Step 2: 删除 role_permission 关联表**

```bash
rm backend/shared/app/db/rbac/tables.py
```

- [ ] **Step 3: 修改 rbac repository**

删除所有 Permission 相关函数（get_permissions_by_role、list_permissions 等）。简化 Role 查询（不再 JOIN permission）。

- [ ] **Step 4: 修改 User model**

`backend/shared/app/db/user/models.py` 新增字段：

```python
contact_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
contact_note: Mapped[str | None] = mapped_column(Text, nullable=True)
advisor_id: Mapped[str | None] = mapped_column(
    String(36), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
)
```

- [ ] **Step 5: 创建 ContactRecord model**

`backend/shared/app/db/contact/models.py`:

```python
class ContactRecord(Base):
    __tablename__ = "contact_record"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("user.id"), nullable=False, index=True)
    staff_id: Mapped[str] = mapped_column(String(36), ForeignKey("user.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 6: 创建 contact repository**

`backend/shared/app/db/contact/repository.py` — 基础 CRUD（create_record、list_by_user、list_all）。

- [ ] **Step 7: 简化 seed_rbac.py**

`backend/scripts/init/seed_rbac.py`:
- 删除 `init_permissions` 函数和 PERMISSIONS 列表
- 修改 `init_roles`：直接写 permissions JSON，不再关联 Permission 表
- 使用新角色定义（superuser、content_admin、advisor、support、student、visitor）

- [ ] **Step 8: 提交**

```bash
git add -A && git commit -m "refactor: 权限系统简化 — Role.permissions JSON 化 + 删除 Permission 表"
```

---

## Task 3: auth service 简化

**Files:**
- Modify: `backend/api/api/auth/service.py` — build_user_response 直接取 role.permissions
- Modify: `backend/api/api/auth/schemas.py` — UserResponse 中 permissions 类型不变

- [ ] **Step 1: 修改 build_user_response**

```python
async def build_user_response(self, user: User) -> UserResponse:
    role = await rbac_repo.get_role_by_id(self.session, user.role_id) if user.role_id else None
    return UserResponse(
        id=user.id,
        phone=user.phone,
        username=user.username,
        is_active=user.is_active,
        two_factor_enabled=user.two_factor_enabled,
        storage_quota=user.storage_quota,
        permissions=role.permissions if role else [],
        role_id=user.role_id,
        role_name=role.name if role else None,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
```

不再调用 `rbac_repo.get_permissions_by_role`（已删除）。

- [ ] **Step 2: 同步修改 portal/user/service.py 和 admin/user/service.py 中类似的 build_user_response 逻辑**

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "refactor: auth service 简化 — 直接取 role.permissions JSON"
```

---

## Task 4: admin/roles — 角色合并 + 改权限踢下线

**Files:**
- Modify: `backend/api/api/admin/rbac/service.py` — 新增 merge 逻辑、改权限踢下线
- Modify: `backend/api/api/admin/rbac/schemas.py` — RoleCreate 新增 merge_from
- Modify: `backend/api/api/admin/rbac/router.py` — 路径改为 meta 层级

- [ ] **Step 1: 修改 RoleCreate schema**

```python
class RoleCreate(BaseModel):
    name: str = Field(..., max_length=50)
    description: str = Field("", max_length=200)
    permissions: list[str] | None = None
    merge_from: list[str] | None = None
```

- [ ] **Step 2: 实现角色合并逻辑**

在 service 中：如果 `merge_from` 不为空，查出这些角色的 permissions 合并去重。如果同时传了 `permissions`，以 `permissions` 为准。

- [ ] **Step 3: 实现改权限踢下线**

修改 `update_role` 方法：更新 role.permissions 后，查出 role_id = 该角色的所有 user_id，删除这些用户的 refresh_token。

- [ ] **Step 4: 路由路径改为 meta 层级**

```
/admin/roles/meta                    → GET 前置数据（权限树）
/admin/roles/meta/list               → GET 角色列表
/admin/roles/meta/list/create        → POST 创建角色
/admin/roles/meta/list/detail        → GET 角色详情 (?role_id=xxx)
/admin/roles/meta/list/detail/edit   → POST 编辑角色
/admin/roles/meta/list/detail/delete → POST 删除角色
/admin/roles/meta/list/reorder       → POST 角色排序
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 角色合并 + 改权限踢下线 + roles 路径层级化"
```

---

## Task 5: 权限树生成 + meta 接口

**Files:**
- Create: `backend/api/api/core/permission_tree.py` — 权限树生成逻辑
- Modify: `backend/api/api/admin/rbac/router.py` — meta 接口返回权限树

- [ ] **Step 1: 实现 permission_tree.py**

两步生成：扫描 `__init__.py` 的 description 构建文件夹层级 + 从 OpenAPI spec 提取端点 summary 补全叶子节点。参考 spec 中的完整代码。

- [ ] **Step 2: 在 main.py 启动时缓存权限树**

```python
from api.core.permission_tree import build_permission_tree

@asynccontextmanager
async def lifespan(_app: FastAPI):
    _app.state.permission_tree = build_permission_tree(api)
    yield
```

- [ ] **Step 3: meta 接口返回权限树**

```python
@router.get("/meta", summary="获取前置数据")
async def get_roles_meta(request: Request) -> dict:
    return {"permission_tree": request.app.state.permission_tree}
```

- [ ] **Step 4: 删除旧的 _filter_openapi_spec 和 openapi.json 端点**

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 权限树生成 + meta 接口"
```

---

## Task 6: URL 路径层级化 — admin 面板

**Files:**
- Modify: `backend/api/api/admin/user/router.py` — 路径改为 list/detail/edit 层级
- Modify: `backend/api/api/admin/content/router.py`
- Modify: `backend/api/api/admin/case/router.py`
- Modify: `backend/api/api/admin/university/router.py`
- Modify: `backend/api/api/admin/config/router.py`（general-settings + web-settings）

对每个 admin 域的 router.py，将路径从扁平结构改为层级依赖结构：

- [ ] **Step 1: admin/users 路径改为层级结构**

```
/list           → GET 用户列表
/list/detail    → GET 用户详情 (?user_id=xxx)
/list/detail/edit            → POST
/list/detail/reset-password  → POST
/list/detail/assign-role     → POST
/list/detail/force-logout    → POST
```

所有 `{id}` 参数从 path 移到 query param（GET）或 body（POST）。

- [ ] **Step 2: admin/articles 路径层级化**

```
/list                   → GET
/list/create            → POST
/list/detail/edit       → POST
/list/detail/delete     → POST
```

- [ ] **Step 3: admin/categories、cases、universities 同样处理**

- [ ] **Step 4: admin/general-settings、web-settings 路径层级化**

```
/list           → GET
/list/edit      → POST
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "refactor: admin 路由路径层级化"
```

---

## Task 7: portal 拆分 + 路径层级化

**Files:**
- Delete: `backend/api/api/portal/content/` — 删除 portal 文章模块
- Create: `backend/api/api/portal/profile/` — 个人资料
- Create: `backend/api/api/portal/profile/sessions/` — 会话管理
- Create: `backend/api/api/portal/profile/two_factor/` — 双因素认证
- Modify: `backend/api/api/portal/documents/router.py` — 路径层级化
- Modify: `backend/api/api/portal/__init__.py` — 重新组装

- [ ] **Step 1: 删除 portal/content**

```bash
rm -rf backend/api/api/portal/content
```

- [ ] **Step 2: 将 portal/user 拆分为 profile + sessions + two-factor**

从 `portal/user/router.py` 拆分为：
- `portal/profile/router.py` — meta/list, meta/list/edit, password, phone, delete-account
- `portal/profile/sessions/router.py` — list, list/revoke, list/revoke-all
- `portal/profile/two_factor/router.py` — enable-totp, confirm-totp, enable-sms, disable

相应 service 和 schemas 也拆分。

- [ ] **Step 3: 每个目录创建 __init__.py 带 description**

```python
# portal/profile/__init__.py
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

- [ ] **Step 4: portal/documents 路径层级化**

```
/list                       → GET
/list/upload                → POST
/list/detail                → GET (?doc_id=xxx)
/list/detail/download       → GET (?doc_id=xxx)
/list/detail/delete         → POST
```

- [ ] **Step 5: 删除旧的 portal/user 目录**

```bash
rm -rf backend/api/api/portal/user
```

- [ ] **Step 6: 更新 portal/__init__.py**

```python
from fastapi import APIRouter
from .profile import router as profile_router
from .documents import router as documents_router

description = "用户面板"

router = APIRouter(prefix="/portal")
router.include_router(profile_router)
router.include_router(documents_router)

__all__ = ["router", "description"]
```

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "refactor: portal 拆分 + 路径层级化"
```

---

## Task 8: 所有 __init__.py 补充 description

**Files:**
- Modify: 所有 admin、portal、auth、public 下的 `__init__.py`

- [ ] **Step 1: 为每个模块的 __init__.py 添加 description 导出**

auth: `description = "认证"`
public: `description = "公开接口"`
public/config: `description = "配置查询"`
public/content: `description = "内容展示"`
public/case: `description = "成功案例"`
public/university: `description = "合作院校"`
admin: `description = "管理后台"`
admin/user: `description = "用户管理"`
admin/rbac: `description = "角色管理"`
admin/config: `description = "系统设置"`
admin/content: `description = "内容管理"`
admin/case: `description = "案例管理"`
admin/university: `description = "院校管理"`

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: 所有 __init__.py 补充 description"
```

---

## Task 9: 新增 admin/students 模块

**Files:**
- Create: `backend/api/api/admin/students/__init__.py`
- Create: `backend/api/api/admin/students/router.py`
- Create: `backend/api/api/admin/students/service.py`
- Create: `backend/api/api/admin/students/schemas.py`
- Modify: `backend/api/api/admin/__init__.py` — 挂载 students router

- [ ] **Step 1: 创建 students 模块**

router.py 端点：
```
/list                                → GET 学生列表（默认筛选当前顾问，可按 advisor_id 或全部）
/list/detail                         → GET 学生详情 (?user_id=xxx)
/list/detail/edit                    → POST 编辑学生信息
/list/detail/assign-advisor          → POST 指定负责顾问
/list/detail/downgrade               → POST 降为 visitor
/list/detail/documents/list          → GET 学生文件列表
/list/detail/documents/list/detail   → GET 文件详情 (?doc_id=xxx)
/list/detail/documents/list/detail/download → GET 下载文件 (?doc_id=xxx)
```

service.py：StudentService — 查询只返回 role.name = "student" 的用户，默认按 advisor_id = current_user_id 筛选。

- [ ] **Step 2: 挂载到 admin/__init__.py**

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: 新增 admin/students 模块"
```

---

## Task 10: 新增 admin/contacts 模块

**Files:**
- Create: `backend/api/api/admin/contacts/__init__.py`
- Create: `backend/api/api/admin/contacts/router.py`
- Create: `backend/api/api/admin/contacts/service.py`
- Create: `backend/api/api/admin/contacts/schemas.py`
- Modify: `backend/api/api/admin/__init__.py` — 挂载 contacts router

- [ ] **Step 1: 创建 contacts 模块**

router.py 端点：
```
/list                    → GET 访客联系列表（只含 visitor 角色）
/list/detail             → GET 联系详情 (?user_id=xxx)
/list/detail/mark        → POST 标记联系状态
/list/detail/note        → POST 添加备注
/list/detail/history     → GET 联系历史记录
/list/detail/upgrade     → POST 升为 student
```

service.py：ContactService — 查询只返回 role.name = "visitor" 的用户，标记/备注同时写入 User 表和 contact_record 表。upgrade 时修改用户角色为 student。

- [ ] **Step 2: 挂载到 admin/__init__.py**

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: 新增 admin/contacts 模块"
```

---

## Task 11: 更新 main.py

**Files:**
- Modify: `backend/api/api/main.py` — 权限树缓存、model import 更新

- [ ] **Step 1: 更新 model import（新增 ContactRecord）**

- [ ] **Step 2: lifespan 中缓存权限树**

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "refactor: main.py 更新 — 权限树缓存 + model import"
```

---

## Task 12: 网关重写

**Files:**
- Modify: `gateway/lua/auth.lua` — extract_permission 改全路径 + has_permission 支持通配符/精确/祖先匹配

- [ ] **Step 1: 重写 extract_permission**

```lua
local function extract_permission(uri)
  local path = string.match(uri, "^/api/(.+)$")
  return path
end
```

- [ ] **Step 2: 重写 has_permission**

支持三种格式：`*` 全匹配、`path/*` 通配符（子路径 + 祖先）、其他精确匹配（节点 + 祖先）。参考 spec 中的完整 Lua 代码。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "refactor: 网关权限提取改全路径 + 通配符/祖先匹配"
```

---

## Task 13: 清空数据库重建

- [ ] **Step 1: 停止容器并清除数据卷**

```bash
docker compose down -v
```

- [ ] **Step 2: 重新启动（自动建表 + 种子数据）**

```bash
docker compose up -d
```

- [ ] **Step 3: 验证基本连通性**

```bash
curl http://localhost/api/health
curl http://localhost:8000/api/health
```

---

## Task 14: 测试重写

**Files:**
- 所有 `backend/api/tests/` 下的测试文件

- [ ] **Step 1: 删除旧的 portal/content 测试**

```bash
rm -rf backend/api/tests/portal/content
```

- [ ] **Step 2: 拆分 portal/user 测试为 profile + sessions + two-factor**

- [ ] **Step 3: 更新所有 admin 测试的 URL 路径（list/detail/edit 层级）**

- [ ] **Step 4: 更新所有 mock patch 路径**

- [ ] **Step 5: 新增 admin/students 测试**

创建 `backend/api/tests/admin/students/` — test_router.py + test_service.py

- [ ] **Step 6: 新增 admin/contacts 测试**

创建 `backend/api/tests/admin/contacts/` — test_router.py + test_service.py

- [ ] **Step 7: 新增权限匹配逻辑边界测试**

- [ ] **Step 8: 新增角色合并和踢下线测试**

- [ ] **Step 9: 运行单元测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/ --ignore=backend/api/tests/e2e -v
```

- [ ] **Step 10: 运行覆盖率**

```bash
uv run --project backend/api python -m pytest backend/api/tests/ --ignore=backend/api/tests/e2e --cov=api --cov-report=term-missing
```

Expected: >= 90%

- [ ] **Step 11: 提交**

```bash
git add -A && git commit -m "test: 测试重写适配权限层级结构"
```

---

## Task 15: E2E 测试更新

**Files:**
- Modify: `backend/api/tests/e2e/` — 所有 URL 路径更新
- 新增 students 和 contacts 的 E2E 测试

- [ ] **Step 1: 更新所有 E2E 测试 URL 路径**

- [ ] **Step 2: 新增 students E2E 测试**

- [ ] **Step 3: 新增 contacts E2E 测试**

- [ ] **Step 4: 新增权限拦截 E2E 测试（不同角色访问不同路径）**

- [ ] **Step 5: 运行 E2E 测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
```

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "test: E2E 测试更新 + students/contacts E2E"
```

---

## Task 16: Rules 更新 + 清理

**Files:**
- Modify: `.claude/rules/architecture.md`
- Modify: `.claude/rules/code-style.md`
- Modify: `.claude/rules/testing.md`

- [ ] **Step 1: 更新 architecture.md**

- 权限系统：删除 Permission 表说明，改为 Role.permissions JSON
- 角色列表更新为 6 个角色
- 权限匹配规则（通配符 + 精确 + 祖先）

- [ ] **Step 2: 更新 code-style.md**

- API 路由规范：层级依赖结构（list/detail/edit）
- 参数传递：GET 用 query param，POST 用 body，URL 不含动态参数

- [ ] **Step 3: 更新 testing.md**

- portal 测试目录更新（profile/sessions/two-factor 替代 user）
- 新增 admin/students、admin/contacts 测试目录

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "docs: 更新 rules 反映权限层级结构"
```

---

## Task 17: 合并到 dev

- [ ] **Step 1: 最终验证**

```bash
# 单元测试
uv run --project backend/api python -m pytest backend/api/tests/ --ignore=backend/api/tests/e2e -v

# 覆盖率
uv run --project backend/api python -m pytest backend/api/tests/ --ignore=backend/api/tests/e2e --cov=api

# E2E
uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
```

- [ ] **Step 2: 合并**

```bash
git checkout dev
git merge feat/permission-hierarchy
```
