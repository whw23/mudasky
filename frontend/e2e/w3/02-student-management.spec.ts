/**
 * W3 学生管理测试。
 * 验证 advisor 对学生列表、筛选、展开面板、编辑、降级取消等操作。
 */

import { test, expect, gotoAdmin, trackComponent, trackSecurity } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

/** 取消「仅我的学生」筛选并等待列表刷新。 */
async function uncheckMyStudents(page: import("@playwright/test").Page): Promise<void> {
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  const checked = await checkbox.isChecked()
  if (checked) {
    const responsePromise = page.waitForResponse((r) =>
      r.url().includes("/admin/students/list") && r.status() === 200,
    )
    await checkbox.uncheck()
    await responsePromise
  }
}

test.describe("W3 学生管理", () => {
  test.beforeEach(async () => {
    await waitFor("roles_assigned", 90_000)
  })

  test("学生列表页加载表格", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentTable", "页面加载")

    const table = page.locator("table")
    await expect(table).toBeVisible()

    const headers = table.locator("thead th")
    await expect(headers).toHaveCount(6)
  })

  test("默认筛选「仅我的学生」已勾选", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentTable", "筛选checkbox")

    const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
    await expect(checkbox).toBeChecked()
  })

  test("取消勾选显示全部学生", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentTable", "筛选切换")

    await uncheckMyStudents(page)
    const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
    await expect(checkbox).not.toBeChecked()
  })

  test("展开学生面板显示各区域", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentExpandPanel", "展开面板")

    await uncheckMyStudents(page)

    // 点击第一行展开
    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()

    // 等待面板加载（使用 h3 heading 避免与其他文本冲突）
    const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
    await basicInfoHeading.waitFor()
    await expect(page.locator("h3").filter({ hasText: "编辑" })).toBeVisible()
    await expect(page.getByText("分配顾问").first()).toBeVisible()
    await expect(page.getByText("文件列表").first()).toBeVisible()
    await expect(page.getByText("降为访客").first()).toBeVisible()
  })

  test("激活状态 checkbox 切换", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentExpandPanel", "激活checkbox")

    await uncheckMyStudents(page)

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.locator("h3").filter({ hasText: "基本信息" }).waitFor()

    // 面板内的激活 checkbox（在编辑区域内）
    const activeCheckbox = page.locator("section").filter({ hasText: "编辑" }).locator("input[type='checkbox']")
    const wasChecked = await activeCheckbox.isChecked()

    await activeCheckbox.click()
    const nowChecked = await activeCheckbox.isChecked()
    expect(nowChecked).toBe(!wasChecked)
  })

  test("编辑学生备注并保存", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentExpandPanel", "编辑备注")

    await uncheckMyStudents(page)

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.locator("h3").filter({ hasText: "基本信息" }).waitFor()

    // 填写备注
    const noteArea = page.locator("section").filter({ hasText: "编辑" }).locator("textarea")
    await noteArea.fill("E2E-advisor-note")

    // 点击保存
    const saveBtn = page.locator("section").filter({ hasText: "编辑" }).getByRole("button", { name: "保存" })
    const saveResponse = page.waitForResponse((r) =>
      r.url().includes("/admin/students/list/detail/edit") && r.status() === 200,
    )
    await saveBtn.click()
    await saveResponse
  })

  test("分配顾问输入并确认", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentExpandPanel", "分配顾问")

    await uncheckMyStudents(page)

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.getByText("分配顾问").waitFor()

    const advisorSection = page.locator("section").filter({ hasText: "分配顾问" })
    const input = advisorSection.locator("input")
    await expect(input).toBeVisible()

    const confirmBtn = advisorSection.getByRole("button", { name: "确认" })
    await expect(confirmBtn).toBeVisible()
  })

  test("降级按钮弹出确认弹窗并取消", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackComponent("StudentExpandPanel", "降级取消")

    await uncheckMyStudents(page)

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.getByText("降为访客").first().waitFor()

    // 点击降级按钮
    const downgradeSection = page.locator("section").filter({ hasText: "降为访客" })
    const downgradeBtn = downgradeSection.getByRole("button", { name: "降为访客" })
    await downgradeBtn.click()

    // AlertDialog 出现
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    // AlertDialogTitle 中有"确认降级"文本
    await expect(dialog.locator("h2").first()).toBeVisible()

    // 点击取消
    await dialog.getByRole("button", { name: "取消" }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("负向：降级取消后用户未改变", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackSecurity("操作安全", "降级取消不影响数据")

    await uncheckMyStudents(page)

    // 记录行数
    const rowsBefore = await page.locator("tbody tr").count()

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.getByText("降为访客").first().waitFor()

    const downgradeSection = page.locator("section").filter({ hasText: "降为访客" })
    await downgradeSection.getByRole("button", { name: "降为访客" }).click()

    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "取消" }).click()
    await expect(dialog).not.toBeVisible()

    // 收起面板并刷新
    await firstRow.click()

    // 行数未变
    const rowsAfter = await page.locator("tbody tr").count()
    expect(rowsAfter).toBe(rowsBefore)
  })

  test("负向：面板收起后无操作按钮", async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    trackSecurity("UI安全", "收起面板隐藏操作")

    // 不需要取消筛选 — 直接验证未展开状态
    // 等待页面加载完成
    await expect(page.locator("table")).toBeVisible()

    // 确认面板未展开时没有展开面板的内容
    await expect(page.locator("h3").filter({ hasText: "基本信息" })).not.toBeVisible()
    await expect(page.getByText("分配顾问").first()).not.toBeVisible()
  })
})
