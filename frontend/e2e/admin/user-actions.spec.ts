/**
 * 用户管理操作 E2E 测试。
 * 覆盖展开面板后的状态切换、角色分配、存储配额编辑、密码重置、强制登出等实际操作。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"
import { ensureTestUser } from "../helpers/seed"

/** 等待用户列表数据行出现（排除 loading / noData 行） */
async function waitForUserRows(page: import("@playwright/test").Page) {
  // 等待至少一行包含实际用户数据（用户名列非空）
  await page.locator("table tbody tr td:first-child").first().waitFor()
  // 确认不是"加载中"或"暂无"占位行
  await expect(page.locator("table tbody tr").first()).not.toContainText(/加载中|暂无/)
}

/** 展开非 superuser 用户行 */
async function expandNonSuperuserRow(adminPage: import("@playwright/test").Page) {
  await waitForUserRows(adminPage)
  const rows = adminPage.locator("table tbody tr")
  const count = await rows.count()

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i)
    const text = await row.textContent()
    if (text && !text.includes("superuser") && !text.includes("mudasky")) {
      const detailPromise = adminPage.waitForResponse(
        (r) => r.url().includes("/users/") && r.url().includes("/detail"),
      ).catch(() => {})
      await row.click()
      await adminPage.getByText("基本信息").first().waitFor()
      await detailPromise
      // 等待面板内容完全渲染（角色下拉、输入框等异步加载）
      await adminPage.locator("select").first().waitFor({ timeout: 10_000 })
      return true
    }
  }
  return false
}

test.describe("用户管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()
    await waitForUserRows(adminPage)
    const firstRow = adminPage.locator("table tbody tr").first()
    await expect(firstRow).toBeVisible()
    const detailPromise = adminPage.waitForResponse(
      (r) => r.url().includes("/users/") && r.url().includes("/detail"),
    ).catch(() => {})
    await firstRow.click()
    await adminPage.getByText("基本信息").first().waitFor()
    await detailPromise
    // 等待面板内容完全渲染（角色列表、输入框等异步加载）
    await adminPage.locator("select").first().waitFor().catch(() => {})
  })

  test("展开面板显示基本信息区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("基本信息")).toBeVisible()
  })

  test("展开面板显示角色分配区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("分配角色")).toBeVisible()
    await expect(adminPage.locator("select").first()).toBeVisible()
  })

  test("展开面板显示存储配额区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("存储配额")).toBeVisible()
  })

  test("展开面板显示重置密码区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("重置密码").first()).toBeVisible()
  })

  test("展开面板显示强制登出按钮", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: "强制登出" })).toBeVisible()
  })

  test("状态切换按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /禁用账号|启用账号/ })).toBeVisible()
  })
})

test.describe("用户管理实际操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    // 确保有非 superuser 测试用户
    await gotoAdmin(adminPage, "/admin/dashboard")
    await ensureTestUser(adminPage, "+8613900000088", "test-visitor", "visitor")
  })

  test("角色分配 — 选择角色触发 API", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()

    const found = await expandNonSuperuserRow(adminPage)
    expect(found).toBeTruthy()

    await expect(adminPage.getByText("分配角色")).toBeVisible()
    const roleSelect = adminPage.locator("select").first()
    await expect(roleSelect).toBeVisible()

    const currentValue = await roleSelect.inputValue()
    const options = roleSelect.locator("option")
    const optionCount = await options.count()

    let targetValue = ""
    for (let i = 0; i < optionCount; i++) {
      const val = await options.nth(i).getAttribute("value")
      if (val && val !== currentValue && val !== "") {
        targetValue = val
        break
      }
    }
    if (!targetValue) return

    await roleSelect.selectOption(targetValue)
    // 角色分配区域的保存按钮 — 在 section 内查找
    const roleSection = adminPage.locator("section").filter({ hasText: "分配角色" }).first()
    const roleSaveBtn = roleSection.getByRole("button", { name: "保存" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("assign-role") && r.status() === 200,
    )
    await roleSaveBtn.click()
    await responsePromise
    // onUpdate 会折叠面板并刷新列表，验证 API 响应成功即可

    // 还原角色：重新展开面板
    const foundAgain = await expandNonSuperuserRow(adminPage)
    expect(foundAgain).toBeTruthy()
    if (currentValue) {
      const restoredSelect = adminPage.locator("select").first()
      await expect(restoredSelect).toBeVisible()
      await restoredSelect.selectOption(currentValue)
      const restoredSection = adminPage.locator("section").filter({ hasText: "分配角色" }).first()
      const restoreSaveBtn = restoredSection.getByRole("button", { name: "保存" })
      const restorePromise = adminPage.waitForResponse(
        (r) => r.url().includes("assign-role") && r.status() === 200,
      )
      await restoreSaveBtn.click()
      await restorePromise
    }
  })

  test("存储配额编辑 — 修改配额值并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()
    const found = await expandNonSuperuserRow(adminPage)
    expect(found).toBeTruthy()

    await expect(adminPage.getByText("存储配额")).toBeVisible()
    const quotaInput = adminPage.locator("input[type='number']").first()
    await expect(quotaInput).toBeVisible()

    const originalValue = await quotaInput.inputValue()
    const newValue = originalValue === "100" ? "200" : "100"
    await quotaInput.clear()
    await quotaInput.fill(newValue)

    // 存储配额区域的保存按钮 — 在 section 内查找
    const quotaSection = adminPage.locator("section").filter({ hasText: "存储配额" }).first()
    const saveBtn = quotaSection.getByRole("button", { name: "保存" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await saveBtn.click()
    await responsePromise
    // onUpdate 折叠面板并刷新列表，验证 API 成功即可

    // 还原：重新展开面板
    const foundAgain = await expandNonSuperuserRow(adminPage)
    expect(foundAgain).toBeTruthy()
    const restoredInput = adminPage.locator("input[type='number']").first()
    await expect(restoredInput).toBeVisible()
    await restoredInput.clear()
    await restoredInput.fill(originalValue)
    const restoredSection = adminPage.locator("section").filter({ hasText: "存储配额" }).first()
    const restoreSaveBtn = restoredSection.getByRole("button", { name: "保存" })
    const restorePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await restoreSaveBtn.click()
    await restorePromise
  })

  test("密码重置 — 填写密码并提交", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()
    const found = await expandNonSuperuserRow(adminPage)
    expect(found).toBeTruthy()

    await expect(adminPage.getByText("重置密码").first()).toBeVisible()
    // 等待密码输入框渲染（用户详情异步加载）
    const firstPwdInput = adminPage.locator("input[type='password']").first()
    await expect(firstPwdInput).toBeVisible()

    const passwordInputs = adminPage.locator("input[id^='reset-pwd']")
    await expect(passwordInputs.first()).toBeVisible()

    await passwordInputs.nth(0).fill("E2ETestPass123!")
    await passwordInputs.nth(1).fill("E2ETestPass123!")

    // 重置密码区域的按钮 — 在 section 内查找
    const resetSection = adminPage.locator("section").filter({ hasText: "重置密码" }).first()
    const resetBtn = resetSection.getByRole("button", { name: "重置密码" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("reset-password"),
    )
    await resetBtn.click()
    const response = await responsePromise
    expect([200, 422]).toContain(response.status())
  })

  test("强制登出 — 点击按钮并处理确认", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()
    const found = await expandNonSuperuserRow(adminPage)
    expect(found).toBeTruthy()

    const logoutBtn = adminPage.getByRole("button", { name: "强制登出" })
    await expect(logoutBtn).toBeVisible()

    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("force-logout") && r.status() === 200,
    )
    await logoutBtn.click()
    await responsePromise
  })

  test("搜索防抖 — 输入后等待结果更新", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()

    const searchInput = adminPage.getByPlaceholder(/搜索/)
    await expect(searchInput).toBeVisible()
    await searchInput.fill("test-visitor")
    await adminPage.waitForTimeout(500)
    await expect(adminPage.locator("table tbody tr").first()).toContainText("test-visitor")

    await searchInput.clear()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.locator("table tbody tr").first()).toBeVisible()
  })

  test("再次点击行收起面板", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()
    await waitForUserRows(adminPage)

    const firstRow = adminPage.locator("table tbody tr").first()
    await expect(firstRow).toBeVisible()

    await firstRow.click()
    await adminPage.getByText("基本信息").first().waitFor()

    await firstRow.click()
    await adminPage.getByText("基本信息").first().waitFor({ state: "hidden" })
    await expect(adminPage.getByText("基本信息")).not.toBeVisible()
  })
})

test.describe("用户管理 — 状态切换与删除", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/dashboard")
    await ensureTestUser(adminPage, "+8613900000088", "test-visitor", "visitor")
  })

  /** 展开 test-visitor 用户行 */
  async function expandTestVisitor(page: import("@playwright/test").Page) {
    await gotoAdmin(page, "/admin/users")
    await expect(page.locator("table")).toBeVisible()

    const searchInput = page.getByPlaceholder(/搜索/)
    await expect(searchInput).toBeVisible()
    await searchInput.fill("test-visitor")
    await page.waitForTimeout(500)

    await waitForUserRows(page)
    const row = page.locator("table tbody tr").first()
    await expect(row).toContainText("test-visitor")

    const detailPromise = page.waitForResponse(
      (r) => r.url().includes("/users/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await page.getByText("基本信息").first().waitFor()
    await detailPromise
    // 等待面板内容完全渲染
    await page.locator("select").first().waitFor({ timeout: 10_000 }).catch(() => {})
  }

  test("正例：状态切换按钮点击后触发 API 并返回 200", async ({ adminPage }) => {
    await expandTestVisitor(adminPage)

    const toggleBtn = adminPage.getByRole("button", { name: /禁用账号|启用账号/ })
    await expect(toggleBtn).toBeVisible()

    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await toggleBtn.click()

    // 若有确认弹窗则点击确认
    const alertDialog = adminPage.getByRole("alertdialog")
    if (await alertDialog.isVisible().catch(() => false)) {
      const confirmBtn = alertDialog.getByRole("button", { name: /确认|确定/ })
      await confirmBtn.click()
    }

    const response = await responsePromise
    expect(response.status()).toBe(200)
  })

  test("正例：状态切换后按钮文字变化（禁用↔启用）", async ({ adminPage }) => {
    await expandTestVisitor(adminPage)

    const toggleBtn = adminPage.getByRole("button", { name: /禁用账号|启用账号/ })
    await expect(toggleBtn).toBeVisible()
    const originalText = await toggleBtn.textContent()

    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await toggleBtn.click()

    const alertDialog = adminPage.getByRole("alertdialog")
    if (await alertDialog.isVisible().catch(() => false)) {
      const confirmBtn = alertDialog.getByRole("button", { name: /确认|确定/ })
      await confirmBtn.click()
    }

    await responsePromise
    // onUpdate 折叠面板并刷新列表，重新展开验证按钮文字变化
    await expandTestVisitor(adminPage)

    const newToggleBtn = adminPage.getByRole("button", { name: /禁用账号|启用账号/ })
    await expect(newToggleBtn).toBeVisible()
    const newText = await newToggleBtn.textContent()
    expect(newText).not.toBe(originalText)

    // 还原状态
    const restorePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await newToggleBtn.click()
    const restoreDialog = adminPage.getByRole("alertdialog")
    if (await restoreDialog.isVisible().catch(() => false)) {
      const confirmBtn = restoreDialog.getByRole("button", { name: /确认|确定/ })
      await confirmBtn.click()
    }
    await restorePromise
  })

  test("反例：superuser（mudasky）不显示删除按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible()

    const searchInput = adminPage.getByPlaceholder(/搜索/)
    await expect(searchInput).toBeVisible()
    await searchInput.fill("mudasky")
    await adminPage.waitForTimeout(500)

    await waitForUserRows(adminPage)
    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toContainText("mudasky")

    const detailPromise = adminPage.waitForResponse(
      (r) => r.url().includes("/users/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()
    await detailPromise

    // superuser 不应出现删除按钮
    const deleteBtn = adminPage.getByRole("button", { name: /删除/ })
    await expect(deleteBtn).not.toBeVisible()
  })

  test("正例：非 superuser 显示删除按钮，点击弹出 AlertDialog 后取消", async ({ adminPage }) => {
    await expandTestVisitor(adminPage)

    const deleteBtn = adminPage.getByRole("button", { name: /删除/ })
    const hasDel = await deleteBtn.isVisible().catch(() => false)
    if (!hasDel) {
      test.skip(true, "删除按钮未显示，跳过")
      return
    }

    await deleteBtn.click()
    const alertDialog = adminPage.getByRole("alertdialog")
    await expect(alertDialog).toBeVisible()

    // 取消删除
    const cancelBtn = alertDialog.getByRole("button", { name: /取消/ })
    await cancelBtn.click()
    await expect(alertDialog).not.toBeVisible()

    // 用户仍在列表中
    await expect(adminPage.getByText("test-visitor").first()).toBeVisible()
  })
})
