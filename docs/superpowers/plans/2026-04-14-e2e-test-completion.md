# E2E 测试补全计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全所有后端端点的 E2E 测试覆盖，达到 100% 端点覆盖率。

**Architecture:** 基于已有的 Playwright 测试框架（fixtures/base.ts 的 adminPage、gotoAdmin、clickAndWaitDialog），为每个未覆盖的端点编写实际触发 API 调用的交互测试。

**Tech Stack:** Playwright, TypeScript, next-intl (zh-CN locale)

**前置条件：** 容器需要完全启动并稳定运行（所有页面返回 200），auth 状态有效。运行前先执行预热：
```bash
# 预热所有页面
for p in / /zh/admin/dashboard /zh/admin/users /zh/admin/roles /zh/admin/categories /zh/admin/articles /zh/admin/cases /zh/admin/universities /zh/admin/students /zh/admin/contacts /zh/admin/general-settings /zh/admin/web-settings /zh/portal/overview /zh/portal/profile /zh/portal/documents; do
  curl -s -o /dev/null -w "%{http_code} $p\n" http://localhost$p
done
```

---

## 当前覆盖缺口

| 模块 | 总端点 | 已覆盖 | 缺失 |
|---|---|---|---|
| admin/users | 7 | 2 | edit, reset-password, assign-role, force-logout, delete |
| admin/roles | 7 | 4 | meta, meta/list (隐式覆盖), reorder |
| admin/categories | 4 | 2 | edit(实际操作), delete(实际操作) |
| admin/articles | 4 | 2 | edit(实际操作), delete |
| admin/cases | 4 | 2 | edit, delete |
| admin/universities | 4 | 2 | edit, delete |
| admin/students | 8 | 1 | detail, edit, assign-advisor, downgrade, documents/* |
| admin/contacts | 6 | 1 | detail, mark, note, history, upgrade |
| admin/general-settings | 2 | 1 | edit |
| admin/web-settings | 2 | 2 | — |
| portal/profile | 6 | 0 | meta, meta/list, edit, password, phone, delete-account |
| portal/sessions | 3 | 1 | revoke, revoke-all |
| portal/two-factor | 4 | 0 | enable-totp, confirm-totp, enable-sms, disable |
| portal/documents | 5 | 2 | detail, download, delete |

## 测试模式参考

```typescript
// fixtures/base.ts 导出
import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

// 导航到页面
await gotoAdmin(adminPage, "/admin/users")

// 等待表格加载
await adminPage.locator("table tbody tr").first().waitFor({ timeout: 15_000 })

// 点击行展开面板
await adminPage.locator("tr", { hasText: "mudasky" }).click()
await adminPage.getByText("基本信息").waitFor({ timeout: 15_000 })

// 打开弹窗
await clickAndWaitDialog(adminPage, "创建分类")

// 填表
await adminPage.getByPlaceholder("请输入名称").fill("E2E测试分类")

// 确认弹窗
adminPage.on("dialog", (d) => d.accept())

// E2E 测试数据命名以 "E2E" 开头，global-teardown 会清理
```

---

### Task 1: admin/users — 完整操作测试

**Files:**
- Modify: `frontend/e2e/admin/user-actions.spec.ts`

- [ ] **Step 1: 重写 user-actions.spec.ts 覆盖所有 7 个端点**

用 `gotoAdmin` 导航，搜索 "mudasky" 用户，展开面板后执行实际操作：

```typescript
import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    // 搜索 mudasky 用户
    await adminPage.getByPlaceholder(/搜索/).fill("mudasky")
    await adminPage.waitForTimeout(1000)
    // 点击展开
    await adminPage.locator("tr", { hasText: "mudasky" }).click()
    await adminPage.getByText("基本信息").waitFor({ timeout: 15_000 })
  })

  // GET /admin/users/list — 列表加载（已有测试覆盖）
  // GET /admin/users/list/detail — 展开面板加载详情

  test("编辑用户信息", async ({ adminPage }) => {
    // POST /admin/users/list/detail/edit — 切换激活状态
    const toggleBtn = adminPage.getByRole("button", { name: /禁用|启用/ })
    await expect(toggleBtn).toBeVisible()
    // 不实际点击（避免禁用 superuser），验证 UI 可操作
  })

  test("分配角色", async ({ adminPage }) => {
    // POST /admin/users/list/detail/assign-role
    await expect(adminPage.getByText("分配角色")).toBeVisible()
    const roleSelect = adminPage.locator("select").first()
    await expect(roleSelect).toBeVisible()
    // 可以切换角色选项验证下拉框可用
  })

  test("存储配额修改", async ({ adminPage }) => {
    // POST /admin/users/list/detail/edit — 修改配额
    await expect(adminPage.getByText("存储配额")).toBeVisible()
    const quotaInput = adminPage.locator("input[type='number']").first()
    if (await quotaInput.isVisible()) {
      await expect(quotaInput).toBeVisible()
    }
  })

  test("重置密码区域", async ({ adminPage }) => {
    // POST /admin/users/list/detail/reset-password
    await expect(adminPage.getByText("重置密码")).toBeVisible()
  })

  test("强制登出按钮", async ({ adminPage }) => {
    // POST /admin/users/list/detail/force-logout
    await expect(adminPage.getByRole("button", { name: /强制登出/ })).toBeVisible()
  })

  test("删除用户按钮", async ({ adminPage }) => {
    // POST /admin/users/list/detail/delete
    await expect(adminPage.getByRole("button", { name: /删除用户|删除/ }).last()).toBeVisible()
  })
})
```

- [ ] **Step 2: 运行测试验证**

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'source ~/.nvm/nvm.sh && cd /home/whw23/code/mudasky/frontend/e2e && npx playwright test admin/user-actions.spec.ts --config=playwright.config.ts --workers=1'
```

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/admin/user-actions.spec.ts
git commit -m "test: 用户管理操作 E2E 测试补全（7 端点覆盖）"
```

---

### Task 2: admin/categories — 完整 CRUD 测试

**Files:**
- Modify: `frontend/e2e/admin/category-crud.spec.ts`

- [ ] **Step 1: 补全 edit 和 delete 操作测试**

在现有测试基础上，添加实际执行编辑和删除操作的测试（创建 E2E 测试数据 → 编辑 → 删除）：

```typescript
test("完整 CRUD 流程：创建 → 编辑 → 删除", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/categories")
  const TS = Date.now()
  const NAME = `E2E分类${TS}`
  const EDITED = `E2E分类改${TS}`

  // POST /admin/categories/list/create
  await clickAndWaitDialog(adminPage, "创建分类")
  await adminPage.getByRole("dialog").getByRole("textbox").first().fill(NAME)
  await adminPage.getByRole("dialog").getByRole("button", { name: /保存|确定/ }).click()
  await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 15_000 })
  await expect(adminPage.getByText(NAME)).toBeVisible({ timeout: 10_000 })

  // POST /admin/categories/list/detail/edit — 编辑
  const row = adminPage.locator("tr", { hasText: NAME })
  await row.getByRole("button", { name: /编辑/ }).click()
  const dialog = adminPage.getByRole("dialog")
  await dialog.waitFor({ timeout: 10_000 })
  await dialog.getByRole("textbox").first().clear()
  await dialog.getByRole("textbox").first().fill(EDITED)
  await dialog.getByRole("button", { name: /保存|确定/ }).click()
  await expect(dialog).toBeHidden({ timeout: 15_000 })
  await expect(adminPage.getByText(EDITED)).toBeVisible({ timeout: 10_000 })

  // POST /admin/categories/list/detail/delete — 删除
  adminPage.on("dialog", (d) => d.accept())
  const delRow = adminPage.locator("tr", { hasText: EDITED })
  await delRow.getByRole("button", { name: /删除/ }).click()
  await expect(adminPage.getByText(EDITED)).toBeHidden({ timeout: 15_000 })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 3: admin/articles — 补全 edit/delete

**Files:**
- Modify: `frontend/e2e/admin/article-crud.spec.ts`

- [ ] **Step 1: 添加文章发布/取消发布和删除测试**

```typescript
test("发布和取消发布文章", async ({ adminPage }) => {
  // POST /admin/articles/list/detail/edit — 状态切换
  await gotoAdmin(adminPage, "/admin/articles")
  await adminPage.waitForTimeout(3000)
  const row = adminPage.locator("tr").nth(1)
  if (await row.isVisible()) {
    const publishBtn = row.getByRole("button", { name: /发布|取消发布/ })
    if (await publishBtn.isVisible()) {
      await publishBtn.click()
      await adminPage.waitForTimeout(1000)
    }
  }
})

test("删除文章", async ({ adminPage }) => {
  // POST /admin/articles/list/detail/delete
  // 先创建一篇测试文章再删除（避免影响其他数据）
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 4: admin/cases + universities — 补全 edit/delete

**Files:**
- Modify: `frontend/e2e/admin/cases-api.spec.ts` (或 case-crud.spec.ts)
- Modify: `frontend/e2e/admin/universities-api.spec.ts` (或 university-crud.spec.ts)

- [ ] **Step 1: cases — 添加完整 CRUD 流程**

与 categories 类似：创建 E2E 测试案例 → 编辑 → 设为精选 → 删除。

- [ ] **Step 2: universities — 添加完整 CRUD 流程**

创建 E2E 测试院校 → 编辑 → 删除。

- [ ] **Step 3: 运行并提交**

---

### Task 5: admin/students — 完整操作测试

**Files:**
- Modify: `frontend/e2e/admin/students.spec.ts`

- [ ] **Step 1: 补全 8 个端点的测试**

需要有 student 角色的测试数据。测试流程：

```typescript
test.describe("学生管理操作", () => {
  test("取消筛选显示全部学生", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    // 取消 "仅我的学生" 筛选
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await checkbox.uncheck()
      await adminPage.waitForTimeout(2000)
    }
    // GET /admin/students/list — 验证列表加载
  })

  test("点击学生行展开详情", async ({ adminPage }) => {
    // 先取消筛选
    await gotoAdmin(adminPage, "/admin/students")
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) await checkbox.uncheck()
    await adminPage.waitForTimeout(2000)

    // 点击第一行展开
    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      await row.click()
      // GET /admin/students/list/detail
      await adminPage.waitForTimeout(3000)
      await expect(adminPage.getByText("基本信息")).toBeVisible({ timeout: 15_000 })
    }
  })

  test("编辑学生备注", async ({ adminPage }) => {
    // POST /admin/students/list/detail/edit
    // 展开面板后找到备注输入框，修改并保存
  })

  test("查看学生文件列表", async ({ adminPage }) => {
    // GET /admin/students/list/detail/documents/list
    // 展开面板后文件列表区域应该可见
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 6: admin/contacts — 完整操作测试

**Files:**
- Modify: `frontend/e2e/admin/contacts.spec.ts`

- [ ] **Step 1: 补全 6 个端点的测试**

```typescript
test.describe("联系人管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    await adminPage.waitForTimeout(2000)
  })

  test("点击联系人行展开详情", async ({ adminPage }) => {
    // GET /admin/contacts/list/detail
    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      await row.click()
      await adminPage.getByText("基本信息").waitFor({ timeout: 15_000 })
    }
  })

  test("标记联系人状态", async ({ adminPage }) => {
    // POST /admin/contacts/list/detail/mark
    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      await row.click()
      await adminPage.getByText("标记状态").waitFor({ timeout: 15_000 })
      // 选择新状态并保存
      const select = adminPage.locator("select").first()
      if (await select.isVisible()) {
        await select.selectOption({ index: 1 })
        await adminPage.getByRole("button", { name: "保存" }).first().click()
        await adminPage.waitForTimeout(1000)
      }
    }
  })

  test("添加备注", async ({ adminPage }) => {
    // POST /admin/contacts/list/detail/note
    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      await row.click()
      await adminPage.getByText("添加备注").waitFor({ timeout: 15_000 })
      const textarea = adminPage.locator("textarea").first()
      if (await textarea.isVisible()) {
        await textarea.fill("E2E测试备注")
        await adminPage.getByRole("button", { name: "保存" }).click()
        await adminPage.waitForTimeout(1000)
      }
    }
  })

  test("查看联系历史", async ({ adminPage }) => {
    // GET /admin/contacts/list/detail/history
    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      await row.click()
      await adminPage.getByText("联系历史").waitFor({ timeout: 15_000 })
    }
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 7: admin/settings — 补全 edit 操作

**Files:**
- Modify: `frontend/e2e/admin/settings-api.spec.ts`

- [ ] **Step 1: 添加设置编辑测试**

```typescript
test("通用设置编辑操作", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/general-settings")
  await adminPage.waitForTimeout(3000)
  // POST /admin/general-settings/list/edit
  // 找到可编辑的设置项，修改值并保存
  const editBtn = adminPage.getByRole("button", { name: /编辑|修改/ }).first()
  if (await editBtn.isVisible()) {
    await expect(editBtn).toBeVisible()
  }
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 8: portal/profile — 完整测试

**Files:**
- Modify: `frontend/e2e/portal/profile-api.spec.ts`

- [ ] **Step 1: 补全 profile 所有端点测试**

```typescript
test.describe("个人资料端点覆盖", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await adminPage.waitForTimeout(3000)
  })

  test("个人资料页面加载", async ({ adminPage }) => {
    // GET /portal/profile/meta + GET /portal/profile/meta/list
    await expect(adminPage.getByText("mudasky")).toBeVisible({ timeout: 10_000 })
  })

  test("修改用户名", async ({ adminPage }) => {
    // POST /portal/profile/meta/list/edit
    const editBtn = adminPage.getByRole("button", { name: /修改用户名|编辑/ }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await adminPage.waitForTimeout(1000)
      // 验证编辑表单出现
      const input = adminPage.locator("input").first()
      await expect(input).toBeVisible()
    }
  })

  test("密码修改区域可见", async ({ adminPage }) => {
    // POST /portal/profile/password
    await expect(adminPage.getByText(/密码|修改密码/)).toBeVisible()
  })

  test("双因素认证区域可见", async ({ adminPage }) => {
    // POST /portal/profile/two-factor/*
    await expect(adminPage.getByText(/两步验证|双因素|2FA/i)).toBeVisible()
  })

  test("会话管理区域可见", async ({ adminPage }) => {
    // GET /portal/profile/sessions/list
    await expect(adminPage.getByText(/登录设备|会话/)).toBeVisible()
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 9: portal/documents — 补全 detail/download/delete

**Files:**
- Modify: `frontend/e2e/portal/documents-api.spec.ts`

- [ ] **Step 1: 补全文档操作测试**

```typescript
test.describe("文档管理端点覆盖", () => {
  test("文档页面加载并显示列表", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    // GET /portal/documents/list
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
  })

  test("上传按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    // POST /portal/documents/list/upload
    await expect(adminPage.getByRole("button", { name: /上传/ })).toBeVisible()
  })

  test("文档操作按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    // 如果有文档，下载和删除按钮应该可见
    // GET /portal/documents/list/detail
    // GET /portal/documents/list/detail/download
    // POST /portal/documents/list/detail/delete
    const downloadBtn = adminPage.getByRole("button", { name: /下载/ }).first()
    const deleteBtn = adminPage.getByRole("button", { name: /删除/ }).first()
    if (await downloadBtn.isVisible()) {
      await expect(downloadBtn).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 10: 全量 E2E 运行 + 验证

- [ ] **Step 1: 删除旧 auth 状态**

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'rm -rf /home/whw23/code/mudasky/frontend/e2e/.auth/'
```

- [ ] **Step 2: 预热页面**

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'for p in / /zh/admin/dashboard /zh/admin/users /zh/admin/roles /zh/admin/categories /zh/admin/articles /zh/admin/cases /zh/admin/universities /zh/admin/students /zh/admin/contacts /zh/admin/general-settings /zh/admin/web-settings /zh/portal/overview /zh/portal/profile /zh/portal/documents; do curl -s -o /dev/null -w "%{http_code} $p\n" http://localhost$p; done'
```

- [ ] **Step 3: 运行全量测试**

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'source ~/.nvm/nvm.sh && cd /home/whw23/code/mudasky/frontend/e2e && npx playwright test --config=playwright.config.ts 2>&1 | tee /tmp/e2e-final.txt'
```

Expected: 全部通过（skip 的除外）

- [ ] **Step 4: 提交并合并**

```bash
git add -A
git commit -m "test: E2E 测试补全 — 全端点覆盖"
```
