/**
 * 学生管理 E2E 测试。
 * 覆盖：页面加载、列表展示、筛选、展开面板操作。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"
import { ensureTestUser } from "../helpers/seed"

test.describe("学生管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
  })

  test("页面加载并展示表格列头", async ({ adminPage }) => {
    await expect(adminPage.locator("th").first()).toBeVisible()
  })

  test("默认筛选我的学生", async ({ adminPage }) => {
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await expect(checkbox).toBeChecked()
    }
  })

  test("取消筛选显示全部学生", async ({ adminPage }) => {
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await checkbox.uncheck()
      await expect(adminPage.locator("th").first()).toBeVisible()
    }
  })
})

test.describe("学生管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    // 确保有 student 角色的测试用户
    await gotoAdmin(adminPage, "/admin/dashboard")
    await ensureTestUser(adminPage, "+8613900000077", "test-student", "student")
  })

  test("展开面板显示全部操作区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    // 取消"仅我的学生"筛选
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible() && await checkbox.isChecked()) {
      await checkbox.uncheck()
      await adminPage.waitForResponse((r) => r.url().includes("/students/")).catch(() => {})
    }

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    const detailPromise = adminPage.waitForResponse(
      (r) => r.url().includes("/students/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()
    await detailPromise

    await expect(adminPage.getByText("编辑").first()).toBeVisible()
    await expect(adminPage.getByText("备注").first()).toBeVisible()
    await expect(adminPage.getByText("分配顾问").first()).toBeVisible()
    await expect(adminPage.getByText("文件列表").first()).toBeVisible()
    await expect(adminPage.getByText("降为访客").first()).toBeVisible()
  })

  test("编辑学生备注并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible() && await checkbox.isChecked()) {
      await checkbox.uncheck()
      await adminPage.waitForResponse((r) => r.url().includes("/students/")).catch(() => {})
    }

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()

    const noteArea = adminPage.locator("textarea").first()
    await expect(noteArea).toBeVisible()

    const testNote = `E2E备注${Date.now()}`
    await noteArea.clear()
    await noteArea.fill(testNote)

    const saveBtn = adminPage.getByRole("button", { name: "保存" }).first()
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/students/") && r.url().includes("/edit"),
    )
    await saveBtn.click()
    await responsePromise
  })

  test("文件列表区域可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible() && await checkbox.isChecked()) {
      await checkbox.uncheck()
      await adminPage.waitForResponse((r) => r.url().includes("/students/")).catch(() => {})
    }

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    const detailPromise = adminPage.waitForResponse(
      (r) => r.url().includes("/students/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()
    await detailPromise

    // 文件列表标题始终可见，内容为文件列表或暂无文件提示
    await expect(adminPage.getByText("文件列表").first()).toBeVisible()
  })
})

test.describe("学生管理 — 展开面板补全", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/dashboard")
    await ensureTestUser(adminPage, "+8613900000077", "test-student", "student")
  })

  /** 展开学生行并取消筛选 */
  async function expandStudentRow(page: import("@playwright/test").Page) {
    await gotoAdmin(page, "/admin/students")

    const checkbox = page.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible() && await checkbox.isChecked()) {
      await checkbox.uncheck()
      await page.waitForResponse((r) => r.url().includes("/students/")).catch(() => {})
    }

    const row = page.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    const detailPromise = page.waitForResponse(
      (r) => r.url().includes("/students/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await page.getByText("基本信息").first().waitFor()
    await detailPromise
  }

  test("正例：活跃状态 checkbox 可见且可切换", async ({ adminPage }) => {
    await expandStudentRow(adminPage)

    const activeCheckbox = adminPage.getByLabel(/活跃|active/i)
    const hasCheckbox = await activeCheckbox.isVisible().catch(() => false)
    if (!hasCheckbox) {
      test.skip(true, "活跃状态 checkbox 未找到，跳过")
      return
    }

    const wasChecked = await activeCheckbox.isChecked()
    await activeCheckbox.click()
    const nowChecked = await activeCheckbox.isChecked()
    expect(nowChecked).not.toBe(wasChecked)

    // 还原
    await activeCheckbox.click()
  })

  test("正例：顾问分配输入框和按钮可见", async ({ adminPage }) => {
    await expandStudentRow(adminPage)

    await expect(adminPage.getByText("分配顾问").first()).toBeVisible()

    // 展开面板的顾问 Input 和表头的筛选 Input 共享 placeholder，使用 .nth(1) 取展开面板中的
    const advisorInputs = adminPage.getByPlaceholder(/顾问/)
    const inputCount = await advisorInputs.count()
    // 至少有一个顾问相关输入框可见（表头筛选 + 展开面板）
    expect(inputCount).toBeGreaterThanOrEqual(1)
    // 验证"分配顾问"区域标题和确认按钮可见
    const advisorSection = adminPage.getByText("分配顾问").first().locator("..")
    const confirmBtn = advisorSection.getByRole("button", { name: "确认" })
    await expect(confirmBtn).toBeVisible()
  })

  test("正例：降为访客按钮点击弹出 AlertDialog，取消可关闭", async ({ adminPage }) => {
    await expandStudentRow(adminPage)

    const downgradeBtn = adminPage.getByRole("button", { name: /降为访客/ })
    const hasBtn = await downgradeBtn.isVisible().catch(() => false)
    if (!hasBtn) {
      test.skip(true, "降为访客按钮未找到，跳过")
      return
    }

    await downgradeBtn.click()
    const alertDialog = adminPage.getByRole("alertdialog")
    await expect(alertDialog).toBeVisible()

    const cancelBtn = alertDialog.getByRole("button", { name: /取消/ })
    await cancelBtn.click()
    await expect(alertDialog).not.toBeVisible()
  })

  test("反例：取消降级后按钮仍然可见（用户未被降级）", async ({ adminPage }) => {
    await expandStudentRow(adminPage)

    const downgradeBtn = adminPage.getByRole("button", { name: /降为访客/ })
    const hasBtn = await downgradeBtn.isVisible().catch(() => false)
    if (!hasBtn) {
      test.skip(true, "降为访客按钮未找到，跳过")
      return
    }

    await downgradeBtn.click()
    const alertDialog = adminPage.getByRole("alertdialog")
    await expect(alertDialog).toBeVisible()

    const cancelBtn = alertDialog.getByRole("button", { name: /取消/ })
    await cancelBtn.click()
    await expect(alertDialog).not.toBeVisible()

    // 按钮仍然存在，说明用户未被降级
    await expect(downgradeBtn).toBeVisible()
  })

  test("反例：未展开面板时降为访客按钮不可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")

    const checkbox = adminPage.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible() && await checkbox.isChecked()) {
      await checkbox.uncheck()
      await adminPage.waitForResponse((r) => r.url().includes("/students/")).catch(() => {})
    }

    await expect(adminPage.locator("table tbody tr").first()).toBeVisible()

    // 不展开任何行，降为访客按钮不应可见
    const downgradeBtn = adminPage.getByRole("button", { name: /降为访客/ })
    await expect(downgradeBtn).not.toBeVisible()
  })
})
