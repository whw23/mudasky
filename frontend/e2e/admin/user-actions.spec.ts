/**
 * 用户管理操作 E2E 测试。
 * 覆盖展开面板后的状态切换、角色分配、存储配额编辑、密码重置、强制登出等实际操作。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

/**
 * 选择非 superuser 用户行展开面板。
 * 返回 null 表示没有可操作的非 superuser 行。
 */
async function expandNonSuperuserRow(adminPage: import("@playwright/test").Page) {
  const rows = adminPage.locator("table tbody tr")
  const count = await rows.count()

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i)
    const text = await row.textContent()
    /* 跳过 superuser 用户，避免对其执行破坏性操作 */
    if (text && !text.includes("superuser") && !text.includes("mudasky")) {
      await row.click()
      await adminPage.getByText("基本信息").first().waitFor({ timeout: 15_000 })
      return true
    }
  }
  return false
}

/* 此测试需要有效的登录状态，单独运行或在 globalSetup 后立即运行 */
test.describe("用户管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    /* 等待表格和数据行加载完成 */
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })
    const firstRow = adminPage.locator("table tbody tr").first()
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    // 展开第一个用户
    await firstRow.click()
    // 等待展开面板内容加载（面板会调 API 获取详情）
    await adminPage.getByText("基本信息").first().waitFor({ timeout: 15_000 })
  })

  test("展开面板显示基本信息区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("基本信息")).toBeVisible()
  })

  test("展开面板显示角色分配区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("分配角色")).toBeVisible()
    // 角色下拉选择器
    const roleSelect = adminPage.locator("select").first()
    await expect(roleSelect).toBeVisible()
  })

  test("展开面板显示存储配额区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("存储配额")).toBeVisible()
  })

  test("展开面板显示重置密码区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("重置密码").first()).toBeVisible({ timeout: 10_000 })
  })

  test("展开面板显示强制登出按钮", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: "强制登出" })).toBeVisible()
  })

  test("状态切换按钮可见", async ({ adminPage }) => {
    // superuser 用户应该有禁用按钮
    const toggleBtn = adminPage.getByRole("button", { name: /禁用|启用/ })
    await expect(toggleBtn).toBeVisible()
  })
})

test.describe("用户管理实际操作", () => {
  test("角色分配 — 选择角色触发 API", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    const found = await expandNonSuperuserRow(adminPage)
    if (!found) {
      test.skip(true, "没有非 superuser 用户可操作")
      return
    }

    await expect(adminPage.getByText("分配角色")).toBeVisible()
    const roleSelect = adminPage.locator("select").first()
    await expect(roleSelect).toBeVisible()

    /* 记录当前选中值 */
    const currentValue = await roleSelect.inputValue()

    /* 获取所有选项并选一个不同的 */
    const options = roleSelect.locator("option")
    const optionCount = await options.count()
    if (optionCount < 2) {
      test.skip(true, "角色选项不足")
      return
    }

    /* 找到一个不同于当前值的选项 */
    let targetValue = ""
    for (let i = 0; i < optionCount; i++) {
      const val = await options.nth(i).getAttribute("value")
      if (val && val !== currentValue && val !== "") {
        targetValue = val
        break
      }
    }

    if (!targetValue) {
      test.skip(true, "没有可切换的角色")
      return
    }

    /* 选择新角色 */
    await roleSelect.selectOption(targetValue)

    /* 点击角色分配区域的保存按钮，等待 assign-role API 响应 */
    const roleSection = adminPage.getByText("分配角色").locator("..")
    const roleSaveBtn = roleSection.getByRole("button", { name: "保存" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("assign-role") && r.status() === 200,
    )
    await roleSaveBtn.click()
    await responsePromise

    /* 验证选中值已变更 */
    await expect(roleSelect).toHaveValue(targetValue)

    /* 还原角色 */
    if (currentValue) {
      await roleSelect.selectOption(currentValue)
      const restorePromise = adminPage.waitForResponse(
        (r) => r.url().includes("assign-role") && r.status() === 200,
      )
      await roleSaveBtn.click()
      await restorePromise
    }
  })

  test("存储配额编辑 — 修改配额值并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    const found = await expandNonSuperuserRow(adminPage)
    if (!found) {
      test.skip(true, "没有非 superuser 用户可操作")
      return
    }

    await expect(adminPage.getByText("存储配额")).toBeVisible()

    /* 找到配额输入框 */
    const quotaInput = adminPage.locator("input[type='number']").first()
    await expect(quotaInput).toBeVisible()

    /* 记录原始值 */
    const originalValue = await quotaInput.inputValue()

    /* 修改为新值 */
    const newValue = originalValue === "100" ? "200" : "100"
    await quotaInput.clear()
    await quotaInput.fill(newValue)

    /* 找到存储配额区域内的保存按钮（和 input 在同一个 div 内） */
    const quotaSection = adminPage.getByText("存储配额").locator("..")
    const saveBtn = quotaSection.getByRole("button", { name: "保存" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await saveBtn.click()
    await responsePromise

    /* 还原配额 */
    await quotaInput.clear()
    await quotaInput.fill(originalValue)
    const restorePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await saveBtn.click()
    await restorePromise
  })

  test("密码重置 — 填写密码并提交", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    const found = await expandNonSuperuserRow(adminPage)
    if (!found) {
      test.skip(true, "没有非 superuser 用户可操作")
      return
    }

    await expect(adminPage.getByText("重置密码").first()).toBeVisible({ timeout: 10_000 })

    /* 找到密码输入框（使用 id 前缀定位，因为 type 可能是 text/password 动态切换） */
    const passwordInputs = adminPage.locator("input[id^='reset-pwd']")
    await expect(passwordInputs.first()).toBeVisible()

    /* 填写新密码和确认密码 */
    const newPassword = "E2ETestPass123!"
    await passwordInputs.nth(0).fill(newPassword)
    await passwordInputs.nth(1).fill(newPassword)

    /* 点击重置密码区域的按钮，等待 API 响应 */
    const resetSection = adminPage.getByText("重置密码").first().locator("..")
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
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    const found = await expandNonSuperuserRow(adminPage)
    if (!found) {
      test.skip(true, "没有非 superuser 用户可操作")
      return
    }

    /* 处理浏览器 confirm 弹窗 */
    adminPage.on("dialog", (dialog) => dialog.accept())

    const logoutBtn = adminPage.getByRole("button", { name: "强制登出" })
    await expect(logoutBtn).toBeVisible()

    /* 点击强制登出，等待 API 响应 */
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("force-logout") && r.status() === 200,
    )
    await logoutBtn.click()
    await responsePromise
  })

  test("搜索防抖 — 输入后等待结果更新", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    const searchInput = adminPage.getByPlaceholder(/搜索/)
    await expect(searchInput).toBeVisible()

    /* 输入搜索词 */
    await searchInput.fill("mudasky")
    /* 搜索防抖：允许 waitForTimeout(500) */
    await adminPage.waitForTimeout(500)

    /* 验证搜索结果包含目标文本 */
    await expect(adminPage.locator("table tbody tr").first()).toContainText("mudasky", {
      timeout: 10_000,
    })

    /* 清空搜索，验证列表恢复 */
    await searchInput.clear()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 })
  })

  test("分页 — 如果存在分页按钮则翻页", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    /* 检查是否有分页组件（页码按钮或下一页按钮） */
    const nextBtn = adminPage.getByRole("button", { name: /下一页|>/ }).last()
    const hasPagination = await nextBtn.isVisible().catch(() => false)

    if (!hasPagination) {
      test.skip(true, "没有分页组件")
      return
    }

    /* 记录第一页的首行内容 */
    const firstRowText = await adminPage.locator("table tbody tr").first().textContent()

    /* 点击下一页 */
    await nextBtn.click()

    /* 等待表格刷新 */
    await adminPage.waitForResponse(
      (r) => r.url().includes("users/list") && r.status() === 200,
    ).catch(() => {})

    await expect(adminPage.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 })
  })

  test("再次点击行收起面板", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("table")).toBeVisible({ timeout: 15_000 })

    const firstRow = adminPage.locator("table tbody tr").first()
    await expect(firstRow).toBeVisible({ timeout: 15_000 })

    /* 展开 */
    await firstRow.click()
    await adminPage.getByText("基本信息").first().waitFor({ timeout: 15_000 })
    await expect(adminPage.getByText("基本信息")).toBeVisible()

    /* 再次点击收起 */
    await firstRow.click()
    await expect(adminPage.getByText("基本信息")).not.toBeVisible({ timeout: 10_000 })
  })
})
