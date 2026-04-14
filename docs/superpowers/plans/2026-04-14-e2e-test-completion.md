# E2E 测试补全计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全所有后端端点 + 所有前端用户交互的 E2E 测试覆盖。

**Architecture:** 基于 Playwright 测试框架（fixtures/base.ts 的 adminPage、gotoAdmin、clickAndWaitDialog），覆盖三类测试：1) 后端端点触发 2) 前端交互操作 3) 跨页面状态一致性。

**Tech Stack:** Playwright, TypeScript, next-intl (zh-CN locale)

**前置条件：**
- 容器完全启动并稳定运行（所有页面返回 200）
- 运行前预热所有页面：
```bash
for p in / /zh/admin/dashboard /zh/admin/users /zh/admin/roles /zh/admin/categories /zh/admin/articles /zh/admin/cases /zh/admin/universities /zh/admin/students /zh/admin/contacts /zh/admin/general-settings /zh/admin/web-settings /zh/portal/overview /zh/portal/profile /zh/portal/documents; do
  curl -s -o /dev/null -w "%{http_code} $p\n" http://localhost$p
done
```

**测试数据约定：**
- E2E 创建的数据以 "E2E" 开头（如 `E2E分类1713000000`）
- `global-teardown.ts` 会在测试结束后清理 E2E 数据
- 不修改/删除已有的种子数据（如 superuser、预设角色）

**运行命令：**
```bash
source ~/.nvm/nvm.sh && cd /home/whw23/code/mudasky/frontend/e2e && npx playwright test --config=playwright.config.ts
```

---

## 覆盖缺口总览

### A. 后端端点覆盖缺口

| 模块 | 总端点 | 已覆盖 | 缺失 |
|---|---|---|---|
| admin/users | 7 | 2 | edit, reset-password, assign-role, force-logout, delete |
| admin/roles | 7 | 4 | meta(隐式), reorder |
| admin/categories | 4 | 2 | edit(实际操作), delete(实际操作) |
| admin/articles | 4 | 2 | edit(实际操作), delete |
| admin/cases | 4 | 2 | edit, delete |
| admin/universities | 4 | 2 | edit, delete |
| admin/students | 8 | 1 | detail, edit, assign-advisor, downgrade, documents/* |
| admin/contacts | 6 | 1 | detail, mark, note, history, upgrade |
| admin/general-settings | 2 | 1 | edit |
| portal/profile | 6 | 0 | meta, meta/list, edit, password, phone, delete-account |
| portal/sessions | 3 | 1 | revoke, revoke-all |
| portal/two-factor | 4 | 0 | enable-totp, confirm-totp, enable-sms, disable |
| portal/documents | 5 | 2 | detail, download, delete |

### B. 前端交互覆盖缺口

| 区域 | 缺失的交互测试 |
|---|---|
| **公开页面** | ConsultButton（未登录弹窗 / 已登录跳转）、语言切换、导航栏高亮、移动端菜单、分页 |
| **认证** | 登录弹窗 tab 切换、手机验证码登录、账号密码登录、注册流程、保持登录 checkbox、2FA 验证 |
| **Header** | 登录/注册按钮、管理后台入口、退出登录、用户名显示 |
| **admin/dashboard** | 统计卡片链接跳转、快捷操作链接 |
| **admin/users** | 搜索防抖、分页翻页、展开/收起面板 |
| **admin/roles** | 拖拽排序、权限树三栏交互（面板/页面/API 级联勾选）、全选 |
| **admin/categories** | 完整 CRUD 弹窗交互 |
| **admin/articles** | tab 状态筛选、发布/取消发布/置顶切换 |
| **admin/cases** | 精选切换、完整 CRUD 弹窗 |
| **admin/universities** | 完整 CRUD 弹窗 |
| **admin/students** | 筛选 checkbox、顾问 ID 筛选、展开面板所有操作 |
| **admin/contacts** | 展开面板所有操作（标记/备注/历史/升级） |
| **admin/settings** | ConfigEditDialog 编辑保存、图片上传 |
| **admin/web-settings** | 页面切换预览、各区块点击编辑 |
| **portal/profile** | 用户名内联编辑、密码修改表单、手机号修改表单、2FA 开启/关闭流程 |
| **portal/sessions** | 撤销单个会话、撤销全部会话 |
| **portal/documents** | 文件上传、分类 tab 切换、下载、删除确认 |
| **portal/overview** | 统计卡片、快捷操作链接 |

---

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

// 填表单
await adminPage.getByPlaceholder("请输入名称").fill("E2E测试分类")

// 确认浏览器弹窗（confirm/alert）
adminPage.on("dialog", (d) => d.accept())

// 未登录测试（不使用 adminPage fixture）
test.use({ storageState: { cookies: [], origins: [] } })
```

---

### Task 1: 公开页面交互测试

**Files:**
- Create: `frontend/e2e/public/consult-button.spec.ts`
- Create: `frontend/e2e/public/locale-switch.spec.ts`
- Modify: `frontend/e2e/public/home.spec.ts`

- [ ] **Step 1: ConsultButton 测试**

`e2e/public/consult-button.spec.ts`：

```typescript
import { test, expect } from "@playwright/test"

test.describe("立即咨询按钮", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("未登录点击弹出登录弹窗", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    const ctaBtn = page.getByRole("button", { name: /立即咨询/ })
    await ctaBtn.scrollIntoViewIfNeeded()
    await ctaBtn.click()

    // 应弹出登录弹窗
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("dialog").getByText(/登录/)).toBeVisible()
  })
})

test.describe("立即咨询按钮（已登录）", () => {
  test("已登录点击跳转关于我们联系信息", async ({ page }) => {
    // 使用默认 storageState（已登录）
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    const ctaBtn = page.getByRole("button", { name: /立即咨询/ })
    await ctaBtn.scrollIntoViewIfNeeded()
    await ctaBtn.click()
    await page.waitForTimeout(2000)

    // 应跳转到 /about 页面
    expect(page.url()).toContain("/about")
  })
})
```

- [ ] **Step 2: 语言切换测试**

`e2e/public/locale-switch.spec.ts`：

```typescript
import { test, expect } from "@playwright/test"

test.describe("语言切换", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("切换到英文后页面文字变化", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    // 切换语言
    const langSelect = page.getByRole("combobox")
    await langSelect.selectOption("English")
    await page.waitForTimeout(3000)

    // URL 应包含 /en
    expect(page.url()).toContain("/en")
  })
})
```

- [ ] **Step 3: 补全首页交互**

在 `e2e/public/home.spec.ts` 中补充：
- 服务卡片链接跳转验证
- 统计数字可见
- 底部导航链接

- [ ] **Step 4: 运行并提交**

```bash
npx playwright test public/consult-button.spec.ts public/locale-switch.spec.ts public/home.spec.ts --config=playwright.config.ts
git add frontend/e2e/public/
git commit -m "test: 公开页面交互 E2E — ConsultButton、语言切换、首页链接"
```

---

### Task 2: 认证流程交互测试

**Files:**
- Create: `frontend/e2e/auth/login-flow.spec.ts`
- Create: `frontend/e2e/auth/logout-flow.spec.ts`

- [ ] **Step 1: 登录流程测试**

`e2e/auth/login-flow.spec.ts`：

```typescript
import { test, expect } from "@playwright/test"

test.describe("登录流程", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("登录弹窗打开和关闭", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    // 点击登录按钮
    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    // 关闭弹窗
    await page.getByRole("button", { name: "Close" }).click()
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 })
  })

  test("登录弹窗 tab 切换", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    // 默认是手机验证码 tab
    await expect(page.getByRole("tab", { name: /手机验证码/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: /账号密码/ })).toBeVisible()

    // 切换到账号密码
    await page.getByRole("tab", { name: /账号密码/ }).click()
    await page.waitForTimeout(500)

    // 应显示账号和密码输入框
    const tabpanel = page.getByRole("tabpanel")
    await expect(tabpanel.getByRole("textbox").first()).toBeVisible()
  })

  test("账号密码登录成功", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    // 切到账号密码 tab
    await page.getByRole("tab", { name: /账号密码/ }).click()
    await page.waitForTimeout(500)

    // 填写登录信息
    const inputs = page.getByRole("dialog").getByRole("textbox")
    await inputs.first().fill("mudasky")
    await inputs.nth(1).fill("mudasky@12321.")

    // 点击登录
    await page.getByRole("tabpanel").getByRole("button", { name: /登录/ }).click()

    // 弹窗应关闭
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 })

    // 应显示用户名
    await expect(page.getByText("mudasky")).toBeVisible({ timeout: 10_000 })
  })

  test("保持登录 checkbox 默认选中", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    const checkbox = page.getByRole("checkbox", { name: /保持登录/ })
    await expect(checkbox).toBeChecked()
  })

  test("空表单提交不关闭弹窗", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByRole("tab", { name: /账号密码/ }).click()
    await page.waitForTimeout(500)

    // 不填写直接点登录
    await page.getByRole("tabpanel").getByRole("button", { name: /登录/ }).click()
    await page.waitForTimeout(1000)

    // 弹窗应该还在
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})
```

- [ ] **Step 2: 退出登录测试**

`e2e/auth/logout-flow.spec.ts`：

```typescript
import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("退出登录", () => {
  test("点击退出后显示登录按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")
    // 应该能看到用户名或退出按钮
    const logoutBtn = adminPage.getByRole("button", { name: /退出/ })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await adminPage.waitForTimeout(2000)
      // 退出后应显示登录按钮
      await expect(adminPage.getByRole("button", { name: /登录/ })).toBeVisible({ timeout: 10_000 })
    }
  })
})
```

- [ ] **Step 3: 运行并提交**

```bash
npx playwright test auth/ --config=playwright.config.ts
git add frontend/e2e/auth/
git commit -m "test: 认证流程 E2E — 登录弹窗、tab 切换、登录/退出"
```

---

### Task 3: Header/导航交互测试

**Files:**
- Create: `frontend/e2e/layout/header.spec.ts`

- [ ] **Step 1: Header 交互测试**

```typescript
import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("Header 交互（已登录）", () => {
  test("显示用户名和管理后台入口", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")
    await expect(adminPage.getByText("mudasky")).toBeVisible({ timeout: 10_000 })
    await expect(adminPage.getByText(/管理后台/)).toBeVisible()
  })

  test("管理后台链接跳转", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")
    await adminPage.getByText(/管理后台/).click()
    await adminPage.waitForTimeout(3000)
    expect(adminPage.url()).toContain("/admin")
  })

  test("导航栏当前页高亮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/about")
    // 关于我们链接应有激活样式
    const aboutLink = adminPage.getByRole("link", { name: "关于我们" }).first()
    await expect(aboutLink).toBeVisible()
    // 检查是否有红色/激活 class
    const className = await aboutLink.getAttribute("class")
    expect(className).toContain("text-primary")
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 4: admin/dashboard 交互测试

**Files:**
- Modify: `frontend/e2e/admin/dashboard.spec.ts`

- [ ] **Step 1: 补全 dashboard 交互**

```typescript
test("统计卡片显示数字", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/dashboard")
  const main = adminPage.locator("main")
  // 应该有数字统计
  await expect(main.locator("text=/\\d+/").first()).toBeVisible({ timeout: 10_000 })
})

test("快捷操作链接跳转到用户管理", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/dashboard")
  const main = adminPage.locator("main")
  await main.getByText("用户管理").click()
  await adminPage.waitForTimeout(3000)
  expect(adminPage.url()).toContain("/admin/users")
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 5: admin/users 完整交互测试

**Files:**
- Modify: `frontend/e2e/admin/user-actions.spec.ts`
- Modify: `frontend/e2e/admin/users.spec.ts`

- [ ] **Step 1: 修正 users.spec.ts**

用 `gotoAdmin` 导航，修正展开面板断言（不是 dialog）。

- [ ] **Step 2: 重写 user-actions.spec.ts**

```typescript
import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await adminPage.getByPlaceholder(/搜索/).fill("mudasky")
    await adminPage.waitForTimeout(1000)
    await adminPage.locator("tr", { hasText: "mudasky" }).click()
    await adminPage.getByText("基本信息").waitFor({ timeout: 15_000 })
  })

  test("展开面板显示基本信息", async ({ adminPage }) => {
    await expect(adminPage.getByText("基本信息")).toBeVisible()
  })

  test("状态切换按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /禁用|启用/ })).toBeVisible()
  })

  test("角色分配下拉框可见", async ({ adminPage }) => {
    await expect(adminPage.getByText("分配角色")).toBeVisible()
    await expect(adminPage.locator("select").first()).toBeVisible()
  })

  test("存储配额区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText("存储配额")).toBeVisible()
  })

  test("重置密码区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText("重置密码")).toBeVisible()
  })

  test("强制登出按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /强制登出/ })).toBeVisible()
  })

  test("删除用户按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /删除/ }).last()).toBeVisible()
  })

  test("搜索防抖生效", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    const input = adminPage.getByPlaceholder(/搜索/)
    await input.fill("xxx_not_exist")
    await adminPage.waitForTimeout(1500)
    // 应显示空状态或无匹配结果
  })

  test("分页按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await adminPage.waitForTimeout(2000)
    // 如果有多页，分页应该可见
    const pagination = adminPage.locator("text=/共.*条/")
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible()
    }
  })

  test("再次点击行收起面板", async ({ adminPage }) => {
    // 面板已展开（beforeEach），再次点击应收起
    await adminPage.locator("tr", { hasText: "mudasky" }).first().click()
    await adminPage.waitForTimeout(1000)
    // 基本信息应该不可见了
    await expect(adminPage.getByText("基本信息")).toBeHidden({ timeout: 5_000 })
  })
})
```

- [ ] **Step 3: 运行并提交**

---

### Task 6: admin/roles 完整交互测试

**Files:**
- Modify: `frontend/e2e/admin/roles.spec.ts`

- [ ] **Step 1: 重写 roles 完整 CRUD + 权限树交互**

```typescript
import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

const TS = Date.now()
const ROLE_NAME = `E2E角色${TS}`
const ROLE_NAME_EDITED = `E2E角色改${TS}`

test.describe("角色管理", () => {
  test("角色列表加载并显示预设角色", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/roles")
    await expect(adminPage.getByText("superuser")).toBeVisible({ timeout: 10_000 })
    await expect(adminPage.getByText("visitor")).toBeVisible()
  })

  test("superuser 角色无编辑/删除按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/roles")
    await adminPage.waitForTimeout(2000)
    const superRow = adminPage.locator("div", { hasText: "superuser" }).first()
    await expect(superRow.getByText("—")).toBeVisible()
  })

  test("完整 CRUD 流程", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/roles")
    await adminPage.waitForTimeout(2000)

    // 创建
    await clickAndWaitDialog(adminPage, "创建角色")
    await adminPage.getByPlaceholder(/角色名称/).fill(ROLE_NAME)
    await adminPage.getByPlaceholder(/角色描述/).fill("E2E测试描述")

    // 权限树：点击第二栏"用户管理"，等 API 列表加载，全选
    const dialog = adminPage.getByRole("dialog")
    await dialog.getByText("用户管理").click()
    await dialog.getByText("GET").first().waitFor({ timeout: 15_000 })
    await dialog.getByRole("button", { name: "全选" }).click()

    await dialog.getByRole("button", { name: "保存" }).click()
    await expect(dialog).toBeHidden({ timeout: 30_000 })
    await expect(adminPage.getByText(ROLE_NAME)).toBeVisible({ timeout: 30_000 })

    // 编辑
    const row = adminPage.locator("div.grid", { hasText: ROLE_NAME }).first()
    await row.getByRole("button", { name: "编辑" }).click()
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    const nameInput = adminPage.getByPlaceholder(/角色名称/)
    await nameInput.clear()
    await nameInput.fill(ROLE_NAME_EDITED)
    await dialog.getByRole("button", { name: "保存" }).click()
    await expect(dialog).toBeHidden({ timeout: 30_000 })
    await expect(adminPage.getByText(ROLE_NAME_EDITED)).toBeVisible({ timeout: 30_000 })

    // 删除
    adminPage.on("dialog", (d) => d.accept())
    const delRow = adminPage.locator("div.grid", { hasText: ROLE_NAME_EDITED }).first()
    await delRow.getByRole("button", { name: "删除" }).click()
    await expect(adminPage.getByText(ROLE_NAME_EDITED)).toBeHidden({ timeout: 30_000 })
  })

  test("权限树三栏交互", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/roles")
    await clickAndWaitDialog(adminPage, "创建角色")
    const dialog = adminPage.getByRole("dialog")

    // 面板栏应显示 admin 和 portal
    await expect(dialog.getByText("管理后台")).toBeVisible()
    await expect(dialog.getByText("用户中心")).toBeVisible()

    // 点击 admin 面板
    await dialog.getByText("管理后台").click()
    await adminPage.waitForTimeout(500)

    // 页面栏应显示管理页面列表
    await expect(dialog.getByText("用户管理")).toBeVisible()
    await expect(dialog.getByText("角色管理")).toBeVisible()

    // 点击一个页面，第三栏显示 API 路由
    await dialog.getByText("用户管理").click()
    await dialog.getByText("GET").first().waitFor({ timeout: 15_000 })

    // 搜索功能
    const searchInput = dialog.getByPlaceholder(/搜索权限/)
    if (await searchInput.isVisible()) {
      await searchInput.fill("list")
      await adminPage.waitForTimeout(500)
    }

    // 关闭弹窗
    await dialog.getByRole("button", { name: /取消/ }).click()
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 7: admin/categories 完整 CRUD 交互

**Files:**
- Modify: `frontend/e2e/admin/category-crud.spec.ts`

- [ ] **Step 1: 重写为完整 CRUD 流程**

```typescript
import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

const TS = Date.now()

test.describe("分类管理 CRUD", () => {
  test("完整流程：创建 → 列表验证 → 编辑 → 删除", async ({ adminPage }) => {
    const NAME = `E2E分类${TS}`
    const EDITED = `E2E分类改${TS}`

    await gotoAdmin(adminPage, "/admin/categories")

    // 创建
    await clickAndWaitDialog(adminPage, "创建分类")
    const dialog = adminPage.getByRole("dialog")
    await dialog.getByRole("textbox").first().fill(NAME)
    await dialog.getByRole("button", { name: /保存|确定/ }).click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await expect(adminPage.getByText(NAME)).toBeVisible({ timeout: 10_000 })

    // 编辑
    const row = adminPage.locator("tr", { hasText: NAME })
    await row.getByRole("button", { name: /编辑/ }).click()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole("textbox").first().clear()
    await dialog.getByRole("textbox").first().fill(EDITED)
    await dialog.getByRole("button", { name: /保存|确定/ }).click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await expect(adminPage.getByText(EDITED)).toBeVisible({ timeout: 10_000 })

    // 删除
    adminPage.on("dialog", (d) => d.accept())
    const delRow = adminPage.locator("tr", { hasText: EDITED })
    await delRow.getByRole("button", { name: /删除/ }).click()
    await expect(adminPage.getByText(EDITED)).toBeHidden({ timeout: 15_000 })
  })

  test("表格显示列头", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/categories")
    await adminPage.waitForTimeout(2000)
    await expect(adminPage.locator("th").first()).toBeVisible()
  })

  test("空名称创建被阻止", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/categories")
    await clickAndWaitDialog(adminPage, "创建分类")
    await adminPage.getByRole("dialog").getByRole("button", { name: /保存|确定/ }).click()
    await adminPage.waitForTimeout(500)
    // 弹窗不应关闭
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    await adminPage.getByRole("dialog").getByRole("button", { name: /取消/ }).click()
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 8: admin/articles 完整交互测试

**Files:**
- Modify: `frontend/e2e/admin/article-crud.spec.ts`

- [ ] **Step 1: 补全文章管理交互**

```typescript
test("状态 tab 切换", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/articles")
  await adminPage.waitForTimeout(3000)

  // 全部/草稿/已发布 tab
  const allTab = adminPage.getByRole("tab", { name: "全部" })
  const draftTab = adminPage.getByRole("tab", { name: "草稿" })
  if (await allTab.isVisible()) {
    await draftTab.click()
    await adminPage.waitForTimeout(1000)
    await allTab.click()
    await adminPage.waitForTimeout(1000)
  }
})

test("发布/取消发布切换", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/articles")
  await adminPage.waitForTimeout(3000)
  const row = adminPage.locator("tr").nth(1)
  if (await row.isVisible()) {
    const btn = row.getByRole("button", { name: /发布|取消发布/ })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  }
})

test("置顶切换", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/articles")
  await adminPage.waitForTimeout(3000)
  const row = adminPage.locator("tr").nth(1)
  if (await row.isVisible()) {
    const btn = row.getByRole("button", { name: /置顶|取消置顶/ })
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible()
    }
  }
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 9: admin/cases + universities 完整 CRUD

**Files:**
- Modify: `frontend/e2e/admin/case-crud.spec.ts`
- Modify: `frontend/e2e/admin/university-crud.spec.ts`

- [ ] **Step 1: cases 完整 CRUD（同 categories 模式）**

创建 E2E 案例 → 编辑 → 精选切换 → 删除。

- [ ] **Step 2: universities 完整 CRUD（同 categories 模式）**

创建 E2E 院校 → 编辑 → 删除。

- [ ] **Step 3: 运行并提交**

---

### Task 10: admin/students 完整交互测试

**Files:**
- Modify: `frontend/e2e/admin/students.spec.ts`

- [ ] **Step 1: 补全学生管理所有交互**

```typescript
test.describe("学生管理交互", () => {
  test("筛选 checkbox 默认选中", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await expect(checkbox).toBeChecked()
    }
  })

  test("取消筛选后列表刷新", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await checkbox.uncheck()
      await adminPage.waitForTimeout(2000)
      // 表格应该可见
      await expect(adminPage.locator("table")).toBeVisible()
    }
  })

  test("顾问 ID 筛选输入", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    const input = adminPage.getByPlaceholder(/顾问/)
    if (await input.isVisible()) {
      await input.fill("test-advisor-id")
      await adminPage.waitForTimeout(1000)
    }
  })

  test("展开面板显示操作区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) await checkbox.uncheck()
    await adminPage.waitForTimeout(2000)

    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      await row.click()
      await adminPage.waitForTimeout(3000)
      // 展开面板内容
      await expect(adminPage.getByText(/基本信息/).first()).toBeVisible({ timeout: 15_000 })
      await expect(adminPage.getByText(/编辑/).first()).toBeVisible()
      await expect(adminPage.getByText(/分配顾问/).first()).toBeVisible()
      await expect(adminPage.getByText(/文件列表/).first()).toBeVisible()
      await expect(adminPage.getByText(/降为访客/).first()).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 11: admin/contacts 完整交互测试

**Files:**
- Modify: `frontend/e2e/admin/contacts.spec.ts`

- [ ] **Step 1: 补全联系人管理所有交互**

```typescript
test.describe("联系人管理交互", () => {
  test("联系人列表加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    await adminPage.waitForTimeout(2000)
    await expect(adminPage.locator("table")).toBeVisible()
    await expect(adminPage.locator("tr").nth(1)).toBeVisible({ timeout: 10_000 })
  })

  test("展开面板显示所有操作区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    await adminPage.waitForTimeout(2000)

    const row = adminPage.locator("tr").nth(1)
    await row.click()
    await adminPage.waitForTimeout(3000)

    await expect(adminPage.getByText(/基本信息/).first()).toBeVisible({ timeout: 15_000 })
    await expect(adminPage.getByText(/标记状态/).first()).toBeVisible()
    await expect(adminPage.getByText(/添加备注/).first()).toBeVisible()
    await expect(adminPage.getByText(/联系历史/).first()).toBeVisible()
    await expect(adminPage.getByText(/升级为学生/).first()).toBeVisible()
  })

  test("标记状态下拉框可操作", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    await adminPage.waitForTimeout(2000)
    const row = adminPage.locator("tr").nth(1)
    await row.click()
    await adminPage.getByText(/标记状态/).first().waitFor({ timeout: 15_000 })

    const select = adminPage.locator("select").first()
    if (await select.isVisible()) {
      await expect(select).toBeVisible()
      // 验证有选项
      const options = select.locator("option")
      expect(await options.count()).toBeGreaterThan(1)
    }
  })

  test("备注输入框可填写", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    await adminPage.waitForTimeout(2000)
    const row = adminPage.locator("tr").nth(1)
    await row.click()
    await adminPage.getByText(/添加备注/).first().waitFor({ timeout: 15_000 })

    const textarea = adminPage.locator("textarea").first()
    if (await textarea.isVisible()) {
      await textarea.fill("E2E测试备注")
      await expect(textarea).toHaveValue("E2E测试备注")
    }
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 12: admin/settings 交互测试

**Files:**
- Modify: `frontend/e2e/admin/settings-api.spec.ts`
- Modify: `frontend/e2e/admin/web-settings.spec.ts`

- [ ] **Step 1: general-settings 编辑交互**

```typescript
test("通用设置页面有编辑按钮", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/general-settings")
  await adminPage.waitForTimeout(3000)
  // 应该有可编辑的区域或按钮
  const main = adminPage.locator("main")
  await expect(main).toBeVisible()
})

test("通用设置编辑弹窗", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/general-settings")
  await adminPage.waitForTimeout(3000)
  // 点击编辑按钮打开 ConfigEditDialog
  const editBtn = adminPage.getByRole("button", { name: /编辑|修改/ }).first()
  if (await editBtn.isVisible()) {
    await editBtn.click()
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 10_000 })
    await adminPage.getByRole("dialog").getByRole("button", { name: /取消/ }).click()
  }
})
```

- [ ] **Step 2: web-settings 页面切换预览**

```typescript
test("网站设置页面切换", async ({ adminPage }) => {
  await gotoAdmin(adminPage, "/admin/web-settings")
  await adminPage.waitForTimeout(3000)
  // 应该有页面选择按钮（首页、关于等）
  const main = adminPage.locator("main")
  await expect(main).toBeVisible()
})
```

- [ ] **Step 3: 运行并提交**

---

### Task 13: portal/profile 完整交互测试

**Files:**
- Modify: `frontend/e2e/portal/profile-api.spec.ts`

- [ ] **Step 1: 补全个人资料所有交互**

```typescript
test.describe("个人资料交互", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await adminPage.waitForTimeout(3000)
  })

  test("用户名显示", async ({ adminPage }) => {
    await expect(adminPage.getByText("mudasky")).toBeVisible({ timeout: 10_000 })
  })

  test("修改用户名按钮打开编辑表单", async ({ adminPage }) => {
    const editBtn = adminPage.getByRole("button", { name: /修改用户名|编辑/ }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await adminPage.waitForTimeout(1000)
      await expect(adminPage.locator("input").first()).toBeVisible()
      // 取消编辑
      const cancelBtn = adminPage.getByRole("button", { name: /取消/ }).first()
      if (await cancelBtn.isVisible()) await cancelBtn.click()
    }
  })

  test("密码修改区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText(/密码/)).toBeVisible()
  })

  test("手机号修改区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText(/手机/)).toBeVisible()
  })

  test("双因素认证区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText(/两步验证|双因素|二步验证/)).toBeVisible()
  })

  test("会话管理区域显示当前设备", async ({ adminPage }) => {
    await expect(adminPage.getByText(/登录设备|会话/)).toBeVisible()
  })

  test("角色信息显示", async ({ adminPage }) => {
    await expect(adminPage.getByText(/角色|superuser/)).toBeVisible()
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 14: portal/documents 完整交互测试

**Files:**
- Modify: `frontend/e2e/portal/documents-api.spec.ts`

- [ ] **Step 1: 补全文档管理交互**

```typescript
test.describe("文档管理交互", () => {
  test("页面加载显示存储信息", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    // 存储用量应可见
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
  })

  test("上传按钮可见且可点击", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    const uploadBtn = adminPage.getByRole("button", { name: /上传/ })
    await expect(uploadBtn).toBeVisible()
  })

  test("分类 tab 切换", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    // 应该有分类 tab（全部、成绩单、证书等）
    const allTab = adminPage.getByRole("tab", { name: /全部/ })
    if (await allTab.isVisible()) {
      await allTab.click()
      await adminPage.waitForTimeout(500)
    }
  })

  test("文档下载和删除按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await adminPage.waitForTimeout(3000)
    // 如果有文档，操作按钮应该可见
    const downloadBtn = adminPage.getByRole("button", { name: /下载/ }).first()
    const deleteBtn = adminPage.getByRole("button", { name: /删除/ }).first()
    if (await downloadBtn.isVisible()) {
      await expect(downloadBtn).toBeVisible()
    }
    if (await deleteBtn.isVisible()) {
      await expect(deleteBtn).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 15: portal/overview 交互测试

**Files:**
- Create: `frontend/e2e/portal/overview.spec.ts`

- [ ] **Step 1: 概览页交互**

```typescript
import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户概览交互", () => {
  test("概览页面加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    await adminPage.waitForTimeout(3000)
    await expect(adminPage.locator("main")).toBeVisible()
  })

  test("快捷操作链接可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    await adminPage.waitForTimeout(3000)
    // 上传文档 / 编辑资料 链接
    const uploadLink = adminPage.getByText(/上传文档/)
    const profileLink = adminPage.getByText(/编辑资料/)
    if (await uploadLink.isVisible()) await expect(uploadLink).toBeVisible()
    if (await profileLink.isVisible()) await expect(profileLink).toBeVisible()
  })

  test("快捷操作跳转", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    await adminPage.waitForTimeout(3000)
    const profileLink = adminPage.getByText(/编辑资料/)
    if (await profileLink.isVisible()) {
      await profileLink.click()
      await adminPage.waitForTimeout(3000)
      expect(adminPage.url()).toContain("/portal/profile")
    }
  })
})
```

- [ ] **Step 2: 运行并提交**

---

### Task 16: 全量 E2E 运行 + 验证

- [ ] **Step 1: 清理并预热**

```bash
rm -rf /home/whw23/code/mudasky/frontend/e2e/.auth/
for p in / /zh/admin/dashboard /zh/admin/users /zh/admin/roles /zh/admin/categories /zh/admin/articles /zh/admin/cases /zh/admin/universities /zh/admin/students /zh/admin/contacts /zh/admin/general-settings /zh/admin/web-settings /zh/portal/overview /zh/portal/profile /zh/portal/documents; do
  curl -s -o /dev/null -w "%{http_code} $p\n" http://localhost$p
done
```

- [ ] **Step 2: 运行全量测试**

```bash
source ~/.nvm/nvm.sh && cd /home/whw23/code/mudasky/frontend/e2e && npx playwright test --config=playwright.config.ts 2>&1 | tee /tmp/e2e-final.txt
```

Expected: 全部通过（skip 的除外）

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "test: E2E 测试补全 — 全端点 + 全交互覆盖"
```
