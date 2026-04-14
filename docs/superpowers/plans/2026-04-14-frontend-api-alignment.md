# 前端面板 API 路径对齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 前端所有 API 调用路径与重构后的后端完全对齐，新增 students/contacts 页面，并编写全量 Playwright E2E 测试。

**Architecture:** 修改所有前端组件的 API 调用路径（ID 从 URL 移到 query param/body），新增两个 admin 页面（表格+展开面板模式），更新配套设施（types、sidebar、guard），最后编写覆盖所有端点和交互的 E2E 测试。

**Tech Stack:** Next.js, React, TypeScript, axios, Playwright, next-intl, shadcn/ui, Tailwind CSS

**Design spec:** `docs/superpowers/specs/2026-04-14-frontend-api-alignment-design.md`

---

## 文件结构

### 修改的文件

| 文件 | 职责 |
|---|---|
| `frontend/types/index.ts` | 类型定义：删除 Permission，修改 Role，新增 Student/ContactRecord |
| `frontend/lib/permission-config.ts` | 页面配置：新增 students/contacts |
| `frontend/components/layout/AdminSidebar.tsx` | 侧边栏：新增菜单项 |
| `frontend/components/layout/PanelGuard.tsx` | 路由守卫：新增合法路由 |
| `frontend/contexts/AuthContext.tsx` | 认证上下文：修正 API 路径 |
| `frontend/components/admin/UserTable.tsx` | 用户列表：路径不变 |
| `frontend/components/admin/UserExpandPanel.tsx` | 用户操作：修正所有 API 路径 |
| `frontend/components/admin/RoleList.tsx` | 角色列表：修正路径 |
| `frontend/components/admin/RoleDialog.tsx` | 角色弹窗：修正路径 |
| `frontend/components/admin/CategoryTable.tsx` | 分类表格：修正路径 |
| `frontend/components/admin/CategoryDialog.tsx` | 分类弹窗：修正路径 |
| `frontend/components/admin/ArticleTable.tsx` | 文章表格：修正路径 |
| `frontend/components/admin/CaseTable.tsx` | 案例表格：修正路径 |
| `frontend/components/admin/CaseDialog.tsx` | 案例弹窗：修正路径 |
| `frontend/components/admin/UniversityTable.tsx` | 院校表格：修正路径 |
| `frontend/components/admin/UniversityDialog.tsx` | 院校弹窗：修正路径 |
| `frontend/components/admin/CountryCodeEditor.tsx` | 国家代码编辑：修正路径 |
| `frontend/components/admin/web-settings/*.tsx` | 网站设置预览：修正路径 |
| `frontend/components/user/ProfileInfo.tsx` | 个人资料：修正所有 API 路径 |
| `frontend/components/user/TwoFactorSettings.tsx` | 双因素设置：修正路径 |
| `frontend/components/user/SessionManagement.tsx` | 会话管理：修正路径 |
| `frontend/components/user/DocumentList.tsx` | 文档列表：修正路径，新增详情/下载 |
| `frontend/components/user/DocumentUpload.tsx` | 文档上传：修正路径 |
| `frontend/components/admin/ConfigEditDialog.tsx` | 配置编辑弹窗：修正路径 |
| `frontend/app/[locale]/[panel]/dashboard/page.tsx` | 仪表盘：修正路径 |
| `frontend/app/[locale]/[panel]/general-settings/page.tsx` | 通用设置：修正路径 |
| `frontend/app/[locale]/[panel]/web-settings/page.tsx` | 网站设置：修正路径 |
| `frontend/app/[locale]/[panel]/overview/page.tsx` | 用户概览 |
| `frontend/messages/zh.json` | 中文翻译：新增键 |
| `frontend/messages/en.json` | 英文翻译：新增键 |

### 新增的文件

| 文件 | 职责 |
|---|---|
| `frontend/app/[locale]/[panel]/students/page.tsx` | 学生管理页面 |
| `frontend/app/[locale]/[panel]/contacts/page.tsx` | 联系人管理页面 |
| `frontend/components/admin/StudentTable.tsx` | 学生列表表格 |
| `frontend/components/admin/StudentExpandPanel.tsx` | 学生展开面板 |
| `frontend/components/admin/ContactTable.tsx` | 联系人列表表格 |
| `frontend/components/admin/ContactExpandPanel.tsx` | 联系人展开面板 |
| `frontend/e2e/admin/students.spec.ts` | 学生管理 E2E 测试 |
| `frontend/e2e/admin/contacts.spec.ts` | 联系人管理 E2E 测试 |
| `frontend/e2e/admin/users-api.spec.ts` | 用户管理端点覆盖 E2E |
| `frontend/e2e/admin/roles-api.spec.ts` | 角色管理端点覆盖 E2E |
| `frontend/e2e/admin/categories-api.spec.ts` | 分类管理端点覆盖 E2E |
| `frontend/e2e/admin/articles-api.spec.ts` | 文章管理端点覆盖 E2E |
| `frontend/e2e/admin/cases-api.spec.ts` | 案例管理端点覆盖 E2E |
| `frontend/e2e/admin/universities-api.spec.ts` | 院校管理端点覆盖 E2E |
| `frontend/e2e/admin/settings-api.spec.ts` | 设置管理端点覆盖 E2E |
| `frontend/e2e/portal/profile-api.spec.ts` | 个人资料端点覆盖 E2E |
| `frontend/e2e/portal/sessions-api.spec.ts` | 会话管理端点覆盖 E2E |
| `frontend/e2e/portal/documents-api.spec.ts` | 文档管理端点覆盖 E2E |
| `frontend/e2e/cross-navigation.spec.ts` | 路径交叉测试 |
| `frontend/e2e/permission-guard.spec.ts` | 权限拦截测试 |

### 删除的文件

| 文件 | 原因 |
|---|---|
| `frontend/components/user/ArticleList.tsx` | portal 面板无文章功能 |
| `frontend/components/user/ArticleEditor.tsx` | portal 面板无文章功能 |

---

### Task 1: 基础设施更新（types、config、sidebar、guard、i18n）

**Files:**
- Modify: `frontend/types/index.ts`
- Modify: `frontend/lib/permission-config.ts`
- Modify: `frontend/components/layout/AdminSidebar.tsx`
- Modify: `frontend/components/layout/PanelGuard.tsx`
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`

- [ ] **Step 1: 更新类型定义**

修改 `frontend/types/index.ts`：

1. 删除 `Permission` 接口
2. 修改 `Role.permissions` 从 `Permission[]` 改为 `string[]`
3. 新增 `Student` 和 `ContactRecord` 接口

```typescript
// 删除这个接口
// export interface Permission { ... }

// 修改 Role
export interface Role {
  id: string
  name: string
  description: string
  is_builtin: boolean
  sort_order: number
  permissions: string[]  // 从 Permission[] 改为 string[]
  user_count: number
  created_at: string
  updated_at: string | null
}

// 新增 Student
export interface Student {
  id: string
  phone: string | null
  username: string | null
  is_active: boolean
  contact_status: string | null
  contact_note: string | null
  advisor_id: string | null
  storage_quota: number
  created_at: string
  updated_at: string | null
}

// 新增 ContactRecord
export interface ContactRecord {
  id: string
  user_id: string
  staff_id: string
  action: string
  note: string | null
  created_at: string
}
```

- [ ] **Step 2: 更新 permission-config.ts**

在 `ADMIN_PAGES` 数组末尾新增两项：

```typescript
{ key: "studentManagement", href: "/admin/students", apiPrefix: "admin/students" },
{ key: "contactManagement", href: "/admin/contacts", apiPrefix: "admin/contacts" },
```

- [ ] **Step 3: 更新 AdminSidebar.tsx**

在 `MENU_KEYS` 数组中新增（import `BookUser` 和 `Contact` from lucide-react）：

```typescript
{ key: "studentManagement", href: "/admin/students", icon: BookUser, permissions: ["admin/students/*"] },
{ key: "contactManagement", href: "/admin/contacts", icon: Contact, permissions: ["admin/contacts/*"] },
```

- [ ] **Step 4: 更新 PanelGuard.tsx**

在 `PANEL_ROUTES.admin` 数组中新增 `"students"` 和 `"contacts"`。

- [ ] **Step 5: 更新翻译文件**

在 `messages/zh.json` 的 Admin 命名空间中新增：

```json
"studentManagement": "学生管理",
"contactManagement": "联系人管理"
```

在 `messages/en.json` 的 Admin 命名空间中新增：

```json
"studentManagement": "Student Management",
"contactManagement": "Contact Management"
```

同时检查其他语言文件（ja.json、de.json）并添加对应翻译。

- [ ] **Step 6: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`
Expected: 编译成功（可能有未使用 Permission 类型的警告，后续任务处理）

- [ ] **Step 7: 提交**

```bash
git add frontend/types/index.ts frontend/lib/permission-config.ts frontend/components/layout/AdminSidebar.tsx frontend/components/layout/PanelGuard.tsx frontend/messages/
git commit -m "feat: 基础设施更新 — types、sidebar、guard、i18n 适配后端重构"
```

---

### Task 2: Admin 面板 API 路径对齐 — 用户管理

**Files:**
- Modify: `frontend/components/admin/UserExpandPanel.tsx`

- [ ] **Step 1: 修正 UserExpandPanel 所有 API 路径**

将所有 API 调用从旧路径改为新路径。需要修改的调用：

| 旧 | 新 |
|---|---|
| `api.get(\`/admin/users/detail/${userId}\`)` | `api.get("/admin/users/list/detail", { params: { user_id: userId } })` |
| `api.post(\`/admin/users/edit/${userId}\`, ...)` | `api.post("/admin/users/list/detail/edit", { user_id: userId, ... })` |
| `api.post(\`/admin/users/assign-role/${userId}\`, { role_id })` | `api.post("/admin/users/list/detail/assign-role", { user_id: userId, role_id })` |
| `api.post(\`/admin/users/reset-password/${userId}\`, payload)` | `api.post("/admin/users/list/detail/reset-password", { user_id: userId, ...payload })` |
| `api.post(\`/admin/users/force-logout/${userId}\`)` | `api.post("/admin/users/list/detail/force-logout", { user_id: userId })` |
| `api.post(\`/admin/users/delete/${userId}\`)` | `api.post("/admin/users/list/detail/delete", { user_id: userId })` |

同时修正获取角色列表的路径：
| 旧 | 新 |
|---|---|
| `api.get("/admin/roles/list")` | `api.get("/admin/roles/meta/list")` |

- [ ] **Step 2: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/UserExpandPanel.tsx
git commit -m "fix: UserExpandPanel API 路径对齐后端重构"
```

---

### Task 3: Admin 面板 API 路径对齐 — 角色管理

**Files:**
- Modify: `frontend/components/admin/RoleList.tsx`
- Modify: `frontend/components/admin/RoleDialog.tsx`

- [ ] **Step 1: 修正 RoleList 所有 API 路径**

| 旧 | 新 |
|---|---|
| `api.get("/admin/roles/list")` | `api.get("/admin/roles/meta/list")` |
| `api.post("/admin/roles/reorder", ...)` | `api.post("/admin/roles/meta/list/reorder", ...)` |
| `api.post(\`/admin/roles/delete/${role.id}\`)` | `api.post("/admin/roles/meta/list/detail/delete", { role_id: role.id })` |

- [ ] **Step 2: 修正 RoleDialog 所有 API 路径**

| 旧 | 新 |
|---|---|
| `api.get("/admin/roles/permissions")` | `api.get("/admin/roles/meta")` |
| `api.post(\`/admin/roles/edit/${role.id}\`, payload)` | `api.post("/admin/roles/meta/list/detail/edit", { role_id: role.id, ...payload })` |
| `api.post("/admin/roles/create", payload)` | `api.post("/admin/roles/meta/list/create", payload)` |

注意：`permissions` 响应结构已从 `Permission[]` 改为权限树对象，需要同步修改 RoleDialog 中对权限数据的解析逻辑（权限树结构来自 `GET /admin/roles/meta`）。

新增：编辑角色时先获取角色详情：
```typescript
// 编辑模式时获取最新角色数据
if (role) {
  const { data } = await api.get("/admin/roles/meta/list/detail", {
    params: { role_id: role.id }
  })
  // 用 data 填充表单
}
```

- [ ] **Step 3: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 4: 提交**

```bash
git add frontend/components/admin/RoleList.tsx frontend/components/admin/RoleDialog.tsx
git commit -m "fix: RoleList/RoleDialog API 路径对齐后端重构"
```

---

### Task 4: Admin 面板 API 路径对齐 — 内容管理（分类、文章）

**Files:**
- Modify: `frontend/components/admin/CategoryTable.tsx`
- Modify: `frontend/components/admin/CategoryDialog.tsx`
- Modify: `frontend/components/admin/ArticleTable.tsx`

- [ ] **Step 1: 修正 CategoryTable**

该组件已用 `usePathname()` 模式，需修正 action 后缀：

| 旧 | 新 |
|---|---|
| `api.get(\`${pathname}/list\`)` | 不变 |
| `api.post(\`${pathname}/delete/${category.id}\`)` | `api.post(\`${pathname}/list/detail/delete\`, { category_id: category.id })` |

- [ ] **Step 2: 修正 CategoryDialog**

| 旧 | 新 |
|---|---|
| `api.post(\`${pathname}/edit/${category.id}\`, payload)` | `api.post(\`${pathname}/list/detail/edit\`, { category_id: category.id, ...payload })` |
| `api.post(\`${pathname}/create\`, payload)` | `api.post(\`${pathname}/list/create\`, payload)` |

- [ ] **Step 3: 修正 ArticleTable**

该组件使用硬编码路径 `/admin/content/*`，需改为 `/admin/articles/*`：

| 旧 | 新 |
|---|---|
| `api.get("/admin/content/list", ...)` | `api.get("/admin/articles/list", ...)` |
| `api.post(\`/admin/content/edit/${article.id}\`, ...)` | `api.post("/admin/articles/list/detail/edit", { article_id: article.id, ... })` |
| `api.post(\`/admin/content/delete/${article.id}\`)` | `api.post("/admin/articles/list/detail/delete", { article_id: article.id })` |

注意 ArticleTable 中的创建文章链接也需要检查路径。

- [ ] **Step 4: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 5: 提交**

```bash
git add frontend/components/admin/CategoryTable.tsx frontend/components/admin/CategoryDialog.tsx frontend/components/admin/ArticleTable.tsx
git commit -m "fix: Category/Article 组件 API 路径对齐后端重构"
```

---

### Task 5: Admin 面板 API 路径对齐 — 案例、院校

**Files:**
- Modify: `frontend/components/admin/CaseTable.tsx`
- Modify: `frontend/components/admin/CaseDialog.tsx`
- Modify: `frontend/components/admin/UniversityTable.tsx`
- Modify: `frontend/components/admin/UniversityDialog.tsx`

- [ ] **Step 1: 修正 CaseTable**

| 旧 | 新 |
|---|---|
| `api.post(\`${pathname}/edit/${c.id}\`, ...)` | `api.post(\`${pathname}/list/detail/edit\`, { case_id: c.id, ... })` |
| `api.post(\`${pathname}/delete/${c.id}\`)` | `api.post(\`${pathname}/list/detail/delete\`, { case_id: c.id })` |

- [ ] **Step 2: 修正 CaseDialog**

| 旧 | 新 |
|---|---|
| `api.post(\`${pathname}/edit/${successCase.id}\`, payload)` | `api.post(\`${pathname}/list/detail/edit\`, { case_id: successCase.id, ...payload })` |
| `api.post(\`${pathname}/create\`, payload)` | `api.post(\`${pathname}/list/create\`, payload)` |

- [ ] **Step 3: 修正 UniversityTable**

| 旧 | 新 |
|---|---|
| `api.post(\`${pathname}/delete/${university.id}\`)` | `api.post(\`${pathname}/list/detail/delete\`, { university_id: university.id })` |

- [ ] **Step 4: 修正 UniversityDialog**

| 旧 | 新 |
|---|---|
| `api.post(\`${pathname}/edit/${university.id}\`, payload)` | `api.post(\`${pathname}/list/detail/edit\`, { university_id: university.id, ...payload })` |
| `api.post(\`${pathname}/create\`, payload)` | `api.post(\`${pathname}/list/create\`, payload)` |

- [ ] **Step 5: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 6: 提交**

```bash
git add frontend/components/admin/CaseTable.tsx frontend/components/admin/CaseDialog.tsx frontend/components/admin/UniversityTable.tsx frontend/components/admin/UniversityDialog.tsx
git commit -m "fix: Case/University 组件 API 路径对齐后端重构"
```

---

### Task 6: Admin 面板 API 路径对齐 — 设置、仪表盘、公开接口

**Files:**
- Modify: `frontend/app/[locale]/[panel]/general-settings/page.tsx`
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`
- Modify: `frontend/app/[locale]/[panel]/dashboard/page.tsx`
- Modify: `frontend/components/admin/CountryCodeEditor.tsx`
- Modify: `frontend/components/admin/ConfigEditDialog.tsx`
- Modify: `frontend/components/admin/web-settings/CasesPreview.tsx`

- [ ] **Step 1: 修正 general-settings page**

| 旧 | 新 |
|---|---|
| `api.post("/admin/general-settings/edit/site_info", { value: updated })` | `api.post("/admin/general-settings/list/edit", { key: "site_info", value: updated })` |

- [ ] **Step 2: 修正 web-settings page**

| 旧 | 新 |
|---|---|
| `api.post(\`/admin/web-settings/edit/${dialogState.configKey}\`, { value: data })` | `api.post("/admin/web-settings/list/edit", { key: dialogState.configKey, value: data })` |

- [ ] **Step 3: 修正 CountryCodeEditor**

| 旧 | 新 |
|---|---|
| `api.post('/admin/general-settings/edit/phone_country_codes', { value: payload })` | `api.post("/admin/general-settings/list/edit", { key: "phone_country_codes", value: payload })` |

- [ ] **Step 4: 修正 ConfigEditDialog**

检查 `ConfigEditDialog.tsx` 中的文件上传路径：

| 旧 | 新 |
|---|---|
| `api.post("/portal/documents/upload", formData)` | `api.post("/portal/documents/list/upload", formData)` |

- [ ] **Step 5: 修正 dashboard page**

| 旧 | 新 |
|---|---|
| `api.get("/admin/content/list", ...)` | `api.get("/admin/articles/list", ...)` |

- [ ] **Step 6: 修正 CasesPreview**

| 旧 | 新 |
|---|---|
| `api.get("/public/case/list?page_size=6")` | `api.get("/public/cases/list", { params: { page_size: 6 } })` |

- [ ] **Step 7: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 8: 提交**

```bash
git add frontend/app/[locale]/[panel]/general-settings/ frontend/app/[locale]/[panel]/web-settings/ frontend/app/[locale]/[panel]/dashboard/ frontend/components/admin/CountryCodeEditor.tsx frontend/components/admin/ConfigEditDialog.tsx frontend/components/admin/web-settings/
git commit -m "fix: 设置/仪表盘/公开接口 API 路径对齐后端重构"
```

---

### Task 7: Portal 面板 API 路径对齐

**Files:**
- Modify: `frontend/contexts/AuthContext.tsx`
- Modify: `frontend/components/user/ProfileInfo.tsx`
- Modify: `frontend/components/user/TwoFactorSettings.tsx`
- Modify: `frontend/components/user/SessionManagement.tsx`
- Modify: `frontend/components/user/DocumentList.tsx`
- Modify: `frontend/components/user/DocumentUpload.tsx`
- Modify: `frontend/components/user/ChangePassword.tsx`
- Modify: `frontend/components/user/ChangePhone.tsx`

- [ ] **Step 1: 修正 AuthContext**

| 旧 | 新 |
|---|---|
| `api.get('/portal/profile/view')` | `api.get('/portal/profile/meta/list')` |

- [ ] **Step 2: 修正 ProfileInfo**

| 旧 | 新 |
|---|---|
| `api.post('/portal/profile/edit', ...)` | `api.post('/portal/profile/meta/list/edit', ...)` |
| `api.post('/portal/profile/password', ...)` | 不变 |
| `api.post('/portal/profile/phone', ...)` | 不变 |
| `api.post('/portal/profile/delete-account', ...)` | 不变 |
| `api.post('/portal/profile/2fa-enable-totp', ...)` | `api.post('/portal/profile/two-factor/enable-totp', ...)` |
| `api.post('/portal/profile/2fa-confirm-totp', ...)` | `api.post('/portal/profile/two-factor/confirm-totp', ...)` |
| `api.post('/portal/profile/2fa-enable-sms', ...)` | `api.post('/portal/profile/two-factor/enable-sms', ...)` |
| `api.post('/portal/profile/2fa-disable', ...)` | `api.post('/portal/profile/two-factor/disable', ...)` |

- [ ] **Step 3: 修正 TwoFactorSettings**

| 旧 | 新 |
|---|---|
| `api.post('/portal/profile/2fa-enable-totp', ...)` | `api.post('/portal/profile/two-factor/enable-totp', ...)` |
| `api.post('/portal/profile/2fa-confirm-totp', ...)` | `api.post('/portal/profile/two-factor/confirm-totp', ...)` |
| `api.post('/portal/profile/2fa-disable', ...)` | `api.post('/portal/profile/two-factor/disable', ...)` |

- [ ] **Step 4: 修正 SessionManagement**

| 旧 | 新 |
|---|---|
| `api.get('/portal/profile/sessions')` | `api.get('/portal/profile/sessions/list')` |
| `api.post(\`/portal/profile/sessions/revoke/${tokenId}\`)` | `api.post('/portal/profile/sessions/list/revoke', { token_id: tokenId })` |
| `api.post('/portal/profile/sessions/revoke-all')` | `api.post('/portal/profile/sessions/list/revoke-all')` |

- [ ] **Step 5: 修正 DocumentList**

| 旧 | 新 |
|---|---|
| `api.post(\`/portal/documents/delete/${doc.id}\`)` | `api.post('/portal/documents/list/detail/delete', { doc_id: doc.id })` |
| `window.open(\`/api/portal/document/download/${doc.id}\`)` | `window.open(\`/api/portal/documents/list/detail/download?doc_id=${doc.id}\`)` |

新增文档详情获取功能（点击文档名查看详情）：
```typescript
const handleViewDetail = async (docId: string) => {
  const { data } = await api.get("/portal/documents/list/detail", {
    params: { doc_id: docId }
  })
  // 显示详情弹窗或面板
}
```

- [ ] **Step 6: 修正 DocumentUpload**

| 旧 | 新 |
|---|---|
| `api.post("/portal/documents/upload", formData, ...)` | `api.post("/portal/documents/list/upload", formData, ...)` |

- [ ] **Step 7: 修正 ChangePassword（如果独立文件）**

| 旧 | 新 |
|---|---|
| `api.post('/portal/profile/password', ...)` | 不变 |

- [ ] **Step 8: 修正 ChangePhone（如果独立文件）**

| 旧 | 新 |
|---|---|
| `api.post('/portal/profile/phone', ...)` | 不变 |

- [ ] **Step 9: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 10: 提交**

```bash
git add frontend/contexts/AuthContext.tsx frontend/components/user/
git commit -m "fix: Portal 面板所有组件 API 路径对齐后端重构"
```

---

### Task 8: 删除 portal 文章相关文件

**Files:**
- Delete: `frontend/components/user/ArticleList.tsx`
- Delete: `frontend/components/user/ArticleEditor.tsx`
- Modify: 引用这些文件的其他文件（如 articles page）

- [ ] **Step 1: 查找引用**

搜索 `ArticleList` 和 `ArticleEditor` 的所有引用，确认删除不会破坏其他页面。

- [ ] **Step 2: 删除文件并移除引用**

```bash
rm frontend/components/user/ArticleList.tsx
rm frontend/components/user/ArticleEditor.tsx
```

检查 `frontend/app/[locale]/[panel]/articles/page.tsx` — 如果该页面仅服务 portal 面板的文章功能（admin 的文章管理使用 ArticleTable），则需要清理或重构该页面。

- [ ] **Step 3: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "refactor: 删除 portal 文章相关组件（后端无对应接口）"
```

---

### Task 9: 新增学生管理页面

**Files:**
- Create: `frontend/app/[locale]/[panel]/students/page.tsx`
- Create: `frontend/components/admin/StudentTable.tsx`
- Create: `frontend/components/admin/StudentExpandPanel.tsx`

- [ ] **Step 1: 创建学生管理页面**

`frontend/app/[locale]/[panel]/students/page.tsx`：

```tsx
"use client"

/**
 * 学生管理页面。
 * 展示学生列表，支持按顾问筛选。
 */

import { useTranslations } from "next-intl"
import { StudentTable } from "@/components/admin/StudentTable"

/** 学生管理页面 */
export default function StudentsPage() {
  const t = useTranslations("Admin")

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("studentManagement")}</h1>
      <StudentTable />
    </div>
  )
}
```

- [ ] **Step 2: 创建 StudentTable 组件**

`frontend/components/admin/StudentTable.tsx`：

参考 `UserTable.tsx` 的表格+展开模式。核心功能：
- 分页列表，`GET /admin/students/list`，支持 `advisor_id` 和 `my_students` 筛选参数
- 搜索框（可选）
- 点击行展开 `StudentExpandPanel`
- 表格列：用户名、手机号、状态、顾问、备注、创建时间

API 调用：
```typescript
const pathname = usePathname() // "/admin/students"
const { data } = await api.get<PaginatedResponse<Student>>(`${pathname}/list`, {
  params: { page, page_size: 20, advisor_id: filterAdvisor, my_students: myStudents }
})
```

- [ ] **Step 3: 创建 StudentExpandPanel 组件**

`frontend/components/admin/StudentExpandPanel.tsx`：

参考 `UserExpandPanel.tsx` 的展开面板模式。核心功能：
- 获取学生详情：`GET /admin/students/list/detail?user_id=xxx`
- 编辑学生：`POST /admin/students/list/detail/edit` body: `{ user_id, is_active, contact_note }`
- 指定顾问：`POST /admin/students/list/detail/assign-advisor` body: `{ user_id, advisor_id }`
- 降为访客：`POST /admin/students/list/detail/downgrade` body: `{ user_id }`
- 查看文件列表：`GET /admin/students/list/detail/documents/list?user_id=xxx`
- 查看文件详情：`GET /admin/students/list/detail/documents/list/detail?doc_id=xxx`
- 下载文件：`GET /admin/students/list/detail/documents/list/detail/download?doc_id=xxx`

使用 `runAction()` 模式处理异步操作，toast 通知，AlertDialog 确认降级操作。

- [ ] **Step 4: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 5: 提交**

```bash
git add frontend/app/[locale]/[panel]/students/ frontend/components/admin/StudentTable.tsx frontend/components/admin/StudentExpandPanel.tsx
git commit -m "feat: 新增学生管理页面（表格+展开面板）"
```

---

### Task 10: 新增联系人管理页面

**Files:**
- Create: `frontend/app/[locale]/[panel]/contacts/page.tsx`
- Create: `frontend/components/admin/ContactTable.tsx`
- Create: `frontend/components/admin/ContactExpandPanel.tsx`

- [ ] **Step 1: 创建联系人管理页面**

`frontend/app/[locale]/[panel]/contacts/page.tsx`：

```tsx
"use client"

/**
 * 联系人管理页面。
 * 展示访客联系人列表。
 */

import { useTranslations } from "next-intl"
import { ContactTable } from "@/components/admin/ContactTable"

/** 联系人管理页面 */
export default function ContactsPage() {
  const t = useTranslations("Admin")

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("contactManagement")}</h1>
      <ContactTable />
    </div>
  )
}
```

- [ ] **Step 2: 创建 ContactTable 组件**

`frontend/components/admin/ContactTable.tsx`：

参考 `UserTable.tsx` 的表格+展开模式。核心功能：
- 分页列表，`GET /admin/contacts/list`
- 点击行展开 `ContactExpandPanel`
- 表格列：用户名、手机号、状态、备注、创建时间

API 调用：
```typescript
const pathname = usePathname() // "/admin/contacts"
const { data } = await api.get<PaginatedResponse<User>>(`${pathname}/list`, {
  params: { page, page_size: 20 }
})
```

- [ ] **Step 3: 创建 ContactExpandPanel 组件**

`frontend/components/admin/ContactExpandPanel.tsx`：

核心功能：
- 获取详情：`GET /admin/contacts/list/detail?user_id=xxx`
- 标记状态：`POST /admin/contacts/list/detail/mark` body: `{ user_id, contact_status }`
- 添加备注：`POST /admin/contacts/list/detail/note` body: `{ user_id, note }`
- 查看历史：`GET /admin/contacts/list/detail/history?user_id=xxx`
- 升级为学生：`POST /admin/contacts/list/detail/upgrade` body: `{ user_id }`

使用 `runAction()` 模式，toast 通知，AlertDialog 确认升级操作。历史记录用时间线列表展示。

- [ ] **Step 4: 确认编译通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

- [ ] **Step 5: 提交**

```bash
git add frontend/app/[locale]/[panel]/contacts/ frontend/components/admin/ContactTable.tsx frontend/components/admin/ContactExpandPanel.tsx
git commit -m "feat: 新增联系人管理页面（表格+展开面板）"
```

---

### Task 11: 启动开发服务器验证

- [ ] **Step 1: 启动 Docker 开发环境**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky && docker compose up -d"`

- [ ] **Step 2: 浏览器验证关键页面**

使用 Chrome DevTools MCP 验证以下页面能正常加载和交互：

1. `/admin/dashboard` — 仪表盘数据加载
2. `/admin/users` — 用户列表加载，点击展开面板正常
3. `/admin/roles` — 角色列表加载，权限树正常
4. `/admin/categories` — 分类 CRUD 正常
5. `/admin/articles` — 文章列表加载
6. `/admin/cases` — 案例 CRUD 正常
7. `/admin/universities` — 院校 CRUD 正常
8. `/admin/students` — 新页面加载
9. `/admin/contacts` — 新页面加载
10. `/admin/general-settings` — 设置加载和保存
11. `/admin/web-settings` — 设置加载和保存
12. `/portal/overview` — 概览数据
13. `/portal/profile` — 个人资料加载
14. `/portal/documents` — 文档列表加载

- [ ] **Step 3: 修复发现的问题**

根据浏览器验证结果修复所有 bug。

- [ ] **Step 4: 提交修复**

```bash
git add -A
git commit -m "fix: 浏览器验证修复"
```

---

### Task 12: E2E 测试 — Admin 用户管理

**Files:**
- Create: `frontend/e2e/admin/users-api.spec.ts`

- [ ] **Step 1: 编写用户管理端点覆盖测试**

覆盖后端端点：
- `GET /admin/users/list` — 列表加载
- `GET /admin/users/list/detail` — 展开面板详情
- `POST /admin/users/list/detail/edit` — 编辑用户
- `POST /admin/users/list/detail/assign-role` — 分配角色
- `POST /admin/users/list/detail/reset-password` — 重置密码
- `POST /admin/users/list/detail/force-logout` — 强制下线
- `POST /admin/users/list/detail/delete` — 删除用户

```typescript
import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户管理端点覆盖", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
  })

  test("用户列表加载并展示数据", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    await expect(main.getByRole("columnheader", { name: /用户名/ })).toBeVisible()
    await expect(main.locator("tr").nth(1)).toBeVisible({ timeout: 10_000 })
  })

  test("搜索用户并展开详情面板", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    await main.getByPlaceholder(/搜索/).fill("mudasky")
    await adminPage.waitForTimeout(1000)
    const row = main.locator("tr", { hasText: "mudasky" })
    await row.click()
    await expect(adminPage.getByRole("dialog").or(main.locator("[data-expanded]"))).toBeVisible({ timeout: 15_000 })
  })

  // 更多测试覆盖每个端点的正向和反向测试...
})
```

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/admin/users-api.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/admin/users-api.spec.ts
git commit -m "test: 用户管理 E2E 端点覆盖测试"
```

---

### Task 13: E2E 测试 — Admin 角色管理

**Files:**
- Create: `frontend/e2e/admin/roles-api.spec.ts`

- [ ] **Step 1: 编写角色管理端点覆盖测试**

覆盖后端端点：
- `GET /admin/roles/meta` — 权限树
- `GET /admin/roles/meta/list` — 角色列表
- `POST /admin/roles/meta/list/create` — 创建角色
- `POST /admin/roles/meta/list/reorder` — 排序
- `GET /admin/roles/meta/list/detail` — 角色详情
- `POST /admin/roles/meta/list/detail/edit` — 编辑角色
- `POST /admin/roles/meta/list/detail/delete` — 删除角色

测试场景：
1. 角色列表加载并显示预设角色
2. 创建 E2E 测试角色（名称以 "E2E" 开头，global-teardown 会清理）
3. 编辑测试角色的权限
4. 删除测试角色
5. 权限树在弹窗中正确渲染

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/admin/roles-api.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/admin/roles-api.spec.ts
git commit -m "test: 角色管理 E2E 端点覆盖测试"
```

---

### Task 14: E2E 测试 — Admin 内容管理（分类、文章、案例、院校）

**Files:**
- Create: `frontend/e2e/admin/categories-api.spec.ts`
- Create: `frontend/e2e/admin/articles-api.spec.ts`
- Create: `frontend/e2e/admin/cases-api.spec.ts`
- Create: `frontend/e2e/admin/universities-api.spec.ts`

- [ ] **Step 1: 分类管理测试**

覆盖：`GET /list`, `POST /list/create`, `POST /list/detail/edit`, `POST /list/detail/delete`

测试：列表加载 → 创建分类 → 编辑 → 删除 → 确认消失

- [ ] **Step 2: 文章管理测试**

覆盖：`GET /list`, `POST /list/create`, `POST /list/detail/edit`, `POST /list/detail/delete`

测试：列表加载 → tab 筛选 → 创建文章 → 发布/取消发布 → 置顶 → 删除

- [ ] **Step 3: 案例管理测试**

覆盖：`GET /list`, `POST /list/create`, `POST /list/detail/edit`, `POST /list/detail/delete`

测试：列表加载 → 创建案例 → 编辑 → 设为精选 → 删除

- [ ] **Step 4: 院校管理测试**

覆盖：`GET /list`, `POST /list/create`, `POST /list/detail/edit`, `POST /list/detail/delete`

测试：列表加载 → 创建院校 → 编辑 → 设为精选 → 删除

- [ ] **Step 5: 运行所有内容管理测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/admin/categories-api.spec.ts e2e/admin/articles-api.spec.ts e2e/admin/cases-api.spec.ts e2e/admin/universities-api.spec.ts --workers=1"`

- [ ] **Step 6: 提交**

```bash
git add frontend/e2e/admin/categories-api.spec.ts frontend/e2e/admin/articles-api.spec.ts frontend/e2e/admin/cases-api.spec.ts frontend/e2e/admin/universities-api.spec.ts
git commit -m "test: 内容管理（分类/文章/案例/院校）E2E 端点覆盖测试"
```

---

### Task 15: E2E 测试 — Admin 学生管理

**Files:**
- Create: `frontend/e2e/admin/students.spec.ts`

- [ ] **Step 1: 编写学生管理全流程测试**

覆盖所有 8 个端点：
- `GET /admin/students/list` — 列表加载，按顾问筛选
- `GET /admin/students/list/detail` — 展开面板详情
- `POST /admin/students/list/detail/edit` — 编辑学生信息
- `POST /admin/students/list/detail/assign-advisor` — 指定顾问
- `POST /admin/students/list/detail/downgrade` — 降为访客
- `GET /admin/students/list/detail/documents/list` — 文件列表
- `GET /admin/students/list/detail/documents/list/detail` — 文件详情
- `GET /admin/students/list/detail/documents/list/detail/download` — 文件下载

测试场景：
1. 学生列表默认显示当前顾问的学生
2. 取消"仅我的学生"筛选，显示全部
3. 按特定顾问筛选
4. 点击展开面板查看详情
5. 编辑学生备注
6. 查看学生文件列表
7. 下载学生文件

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/admin/students.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/admin/students.spec.ts
git commit -m "test: 学生管理 E2E 全流程测试"
```

---

### Task 16: E2E 测试 — Admin 联系人管理

**Files:**
- Create: `frontend/e2e/admin/contacts.spec.ts`

- [ ] **Step 1: 编写联系人管理全流程测试**

覆盖所有 6 个端点：
- `GET /admin/contacts/list` — 联系人列表
- `GET /admin/contacts/list/detail` — 展开面板详情
- `POST /admin/contacts/list/detail/mark` — 标记状态
- `POST /admin/contacts/list/detail/note` — 添加备注
- `GET /admin/contacts/list/detail/history` — 联系历史
- `POST /admin/contacts/list/detail/upgrade` — 升级为学生

测试场景：
1. 联系人列表加载
2. 点击展开面板查看详情
3. 标记联系人状态（如"已联系"）
4. 添加跟进备注
5. 查看联系历史记录
6. 升级联系人为学生

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/admin/contacts.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/admin/contacts.spec.ts
git commit -m "test: 联系人管理 E2E 全流程测试"
```

---

### Task 17: E2E 测试 — Admin 设置管理

**Files:**
- Create: `frontend/e2e/admin/settings-api.spec.ts`

- [ ] **Step 1: 编写设置管理测试**

覆盖端点：
- `GET /admin/general-settings/list` — 通用设置加载
- `POST /admin/general-settings/list/edit` — 更新设置
- `GET /admin/web-settings/list` — 网站设置加载
- `POST /admin/web-settings/list/edit` — 更新设置

测试场景：
1. 通用设置页面加载并展示配置项
2. 修改某项设置并保存
3. 网站设置页面加载
4. 修改网站设置并预览

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/admin/settings-api.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/admin/settings-api.spec.ts
git commit -m "test: 设置管理 E2E 端点覆盖测试"
```

---

### Task 18: E2E 测试 — Portal 面板

**Files:**
- Create: `frontend/e2e/portal/profile-api.spec.ts`
- Create: `frontend/e2e/portal/sessions-api.spec.ts`
- Create: `frontend/e2e/portal/documents-api.spec.ts`

- [ ] **Step 1: 个人资料测试**

覆盖端点：
- `GET /portal/profile/meta` — 前置数据
- `GET /portal/profile/meta/list` — 个人资料
- `POST /portal/profile/meta/list/edit` — 编辑资料
- `POST /portal/profile/password` — 修改密码
- `POST /portal/profile/phone` — 修改手机
- `POST /portal/profile/two-factor/enable-totp` — 启用 TOTP
- `POST /portal/profile/two-factor/confirm-totp` — 确认 TOTP
- `POST /portal/profile/two-factor/disable` — 关闭 2FA
- `POST /portal/profile/delete-account` — 注销

测试场景：
1. 个人资料页面加载并显示用户信息
2. 修改用户名
3. 修改密码表单可见（正向+反向）
4. 2FA 区域可见且可操作

- [ ] **Step 2: 会话管理测试**

覆盖端点：
- `GET /portal/profile/sessions/list` — 会话列表
- `POST /portal/profile/sessions/list/revoke` — 撤销会话
- `POST /portal/profile/sessions/list/revoke-all` — 撤销全部

测试场景：
1. 会话列表加载并显示当前设备
2. 撤销其他会话（如果有）

- [ ] **Step 3: 文档管理测试**

覆盖端点：
- `GET /portal/documents/list` — 文档列表
- `POST /portal/documents/list/upload` — 上传
- `GET /portal/documents/list/detail` — 详情
- `GET /portal/documents/list/detail/download` — 下载
- `POST /portal/documents/list/detail/delete` — 删除

测试场景：
1. 文档页面加载
2. 上传文件（小文件）
3. 查看上传的文件详情
4. 下载文件
5. 删除文件并确认消失

- [ ] **Step 4: 运行所有 portal 测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/portal/ --workers=1"`

- [ ] **Step 5: 提交**

```bash
git add frontend/e2e/portal/
git commit -m "test: Portal 面板 E2E 端点覆盖测试（资料/会话/文档）"
```

---

### Task 19: E2E 测试 — 路径交叉测试

**Files:**
- Create: `frontend/e2e/cross-navigation.spec.ts`

- [ ] **Step 1: 编写路径交叉测试**

```typescript
import { test, expect, gotoAdmin } from "./fixtures/base"

test.describe("路径乱序交叉测试", () => {
  test("admin 页面之间快速切换", async ({ adminPage }) => {
    // users → roles → students → contacts → users
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("main").getByRole("heading")).toContainText(/用户/)
    
    await gotoAdmin(adminPage, "/admin/roles")
    await expect(adminPage.locator("main").getByRole("heading")).toContainText(/角色/)
    
    await gotoAdmin(adminPage, "/admin/students")
    await expect(adminPage.locator("main").getByRole("heading")).toContainText(/学生/)
    
    await gotoAdmin(adminPage, "/admin/contacts")
    await expect(adminPage.locator("main").getByRole("heading")).toContainText(/联系人/)
    
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("main").getByRole("heading")).toContainText(/用户/)
    // 确认数据正常加载
    await expect(adminPage.locator("main").locator("tr").nth(1)).toBeVisible({ timeout: 10_000 })
  })

  test("admin 和 portal 之间切换", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("main").locator("tr").nth(1)).toBeVisible({ timeout: 10_000 })
    
    await gotoAdmin(adminPage, "/portal/profile")
    await adminPage.waitForTimeout(2000)
    // 验证 portal 页面正常渲染
    
    await gotoAdmin(adminPage, "/admin/roles")
    await expect(adminPage.locator("main").getByRole("heading")).toContainText(/角色/)
  })

  test("CRUD 中间切换页面后返回", async ({ adminPage }) => {
    // 进入分类页面
    await gotoAdmin(adminPage, "/admin/categories")
    await adminPage.waitForTimeout(2000)
    
    // 切换到其他页面
    await gotoAdmin(adminPage, "/admin/universities")
    await adminPage.waitForTimeout(1000)
    
    // 切回分类页面，验证数据一致
    await gotoAdmin(adminPage, "/admin/categories")
    await expect(adminPage.locator("main").locator("tr").nth(1)).toBeVisible({ timeout: 10_000 })
  })

  test("所有 admin 页面依次访问", async ({ adminPage }) => {
    const pages = [
      "/admin/dashboard",
      "/admin/users",
      "/admin/roles",
      "/admin/articles",
      "/admin/categories",
      "/admin/universities",
      "/admin/cases",
      "/admin/students",
      "/admin/contacts",
      "/admin/general-settings",
      "/admin/web-settings",
    ]
    for (const page of pages) {
      await gotoAdmin(adminPage, page)
      await expect(adminPage.locator("main")).toBeVisible()
      await adminPage.waitForTimeout(500)
    }
  })

  test("所有 portal 页面依次访问", async ({ adminPage }) => {
    const pages = [
      "/portal/overview",
      "/portal/profile",
      "/portal/documents",
    ]
    for (const page of pages) {
      await gotoAdmin(adminPage, page)
      await expect(adminPage.locator("main")).toBeVisible()
      await adminPage.waitForTimeout(500)
    }
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/cross-navigation.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/cross-navigation.spec.ts
git commit -m "test: 路径乱序交叉 E2E 测试"
```

---

### Task 20: E2E 测试 — 权限拦截测试

**Files:**
- Create: `frontend/e2e/permission-guard.spec.ts`

- [ ] **Step 1: 编写权限拦截测试**

```typescript
import { test, expect } from "@playwright/test"

test.describe("权限拦截测试", () => {
  // 不使用 adminPage fixture（需要未登录状态）
  test.use({ storageState: { cookies: [], origins: [] } })

  test("未登录访问 admin 页面重定向首页", async ({ page }) => {
    await page.goto("/admin/users")
    await page.waitForTimeout(3000)
    // 应被重定向到首页
    expect(page.url()).toContain("/")
    expect(page.url()).not.toContain("/admin")
  })

  test("未登录访问 portal 页面重定向首页", async ({ page }) => {
    await page.goto("/portal/profile")
    await page.waitForTimeout(3000)
    expect(page.url()).toContain("/")
    expect(page.url()).not.toContain("/portal")
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test e2e/permission-guard.spec.ts --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/permission-guard.spec.ts
git commit -m "test: 权限拦截 E2E 测试"
```

---

### Task 21: 全量 E2E 测试运行

- [ ] **Step 1: 运行全部 E2E 测试**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test --workers=1 2>&1 | tail -50"`

Expected: 全部测试通过

- [ ] **Step 2: 修复失败的测试**

逐个分析失败原因并修复。常见问题：
- 选择器过时（组件文本变更）
- 等待时间不足
- API 路径未完全修正
- 测试数据缺失

- [ ] **Step 3: 重新运行确认全部通过**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test --workers=1"`

- [ ] **Step 4: 提交修复**

```bash
git add -A
git commit -m "fix: E2E 测试修复"
```

---

### Task 22: 更新已有 E2E 测试

**Files:**
- Modify: 所有已有的 `frontend/e2e/admin/*.spec.ts`
- Modify: 所有已有的 `frontend/e2e/user/*.spec.ts`

- [ ] **Step 1: 检查已有测试是否仍能通过**

已有的 E2E 测试（如 `category-crud.spec.ts`、`users.spec.ts` 等）可能因为 API 路径变更导致失败。逐个检查并修正：

1. `e2e/admin/category-crud.spec.ts` — 验证分类 CRUD 流程
2. `e2e/admin/article-crud.spec.ts` — 验证文章 CRUD 流程
3. `e2e/admin/case-crud.spec.ts` — 验证案例 CRUD 流程
4. `e2e/admin/university-crud.spec.ts` — 验证院校 CRUD 流程
5. `e2e/admin/users.spec.ts` — 验证用户列表
6. `e2e/admin/roles.spec.ts` — 验证角色管理
7. `e2e/admin/user-actions.spec.ts` — 验证用户操作
8. `e2e/user/profile.spec.ts` — 验证个人资料
9. `e2e/user/documents.spec.ts` — 验证文档管理

- [ ] **Step 2: 运行全量测试确认**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test --workers=1"`

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/
git commit -m "fix: 更新已有 E2E 测试适配 API 路径变更"
```

---

### Task 23: 最终验证与清理

- [ ] **Step 1: TypeScript 类型检查**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec tsc --noEmit 2>&1 | tail -30"`

Expected: 无类型错误

- [ ] **Step 2: ESLint 检查**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec eslint . 2>&1 | tail -30"`

- [ ] **Step 3: 构建验证**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm build 2>&1 | tail -20"`

Expected: 构建成功

- [ ] **Step 4: 全量 E2E 最终运行**

Run: `wsl -d Ubuntu-24.04 -- bash -lc "cd /home/whw23/code/mudasky/frontend && pnpm exec playwright test --workers=1"`

Expected: 全部通过

- [ ] **Step 5: 提交清理**

```bash
git add -A
git commit -m "chore: 最终验证与清理"
```
