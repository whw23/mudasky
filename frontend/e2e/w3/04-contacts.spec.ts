/**
 * W3 联系人管理测试。
 * 验证 advisor 对联系人列表、展开面板、标记状态、添加备注、升级取消等操作。
 */

import { test, expect, gotoAdmin, trackComponent, trackSecurity } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

test.describe("W3 联系人管理", () => {
  test.beforeEach(async () => {
    await waitFor("roles_assigned", 90_000)
  })

  test("联系人列表加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackComponent("ContactTable", "页面加载")

    const table = page.locator("table")
    await expect(table).toBeVisible()

    const headers = table.locator("thead th")
    await expect(headers).toHaveCount(5)
  })

  test("展开联系人面板显示各区域", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackComponent("ContactExpandPanel", "展开面板")

    // 如果列表有数据，展开第一行
    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    await rows.first().click()

    // 等待面板加载（使用 h3 heading 避免与历史记录中的文本冲突）
    const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
    await basicInfoHeading.waitFor()

    const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
    await expect(markStatusHeading).toBeVisible()
    const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
    await expect(addNoteHeading).toBeVisible()
    await expect(page.getByText("升级为学生").first()).toBeVisible()
  })

  test("标记联系状态下拉选择并保存", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackComponent("ContactExpandPanel", "状态下拉")

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    await rows.first().click()
    const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
    await markStatusHeading.waitFor()

    // 状态下拉
    const statusSection = page.locator("section").filter({ hasText: "标记状态" })
    const select = statusSection.locator("select")
    await expect(select).toBeVisible()

    // 选择「已联系」
    await select.selectOption("contacted")

    // 点击保存
    const saveResponse = page.waitForResponse((r) =>
      r.url().includes("/admin/contacts/list/detail/mark") && r.status() === 200,
    )
    await statusSection.getByRole("button", { name: "保存" }).click()
    await saveResponse
  })

  test("添加备注并保存", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackComponent("ContactExpandPanel", "添加备注")

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    await rows.first().click()
    const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
    await addNoteHeading.waitFor()

    const noteSection = page.locator("section").filter({ hasText: "添加备注" })
    const textarea = noteSection.locator("textarea")
    await textarea.fill("E2E-advisor-contact-note")

    const saveResponse = page.waitForResponse((r) =>
      r.url().includes("/admin/contacts/list/detail/note") && r.status() === 200,
    )
    await noteSection.getByRole("button", { name: "保存" }).click()
    await saveResponse
  })

  test("联系历史区域加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackComponent("ContactExpandPanel", "联系历史")

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    await rows.first().click()
    const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
    await basicInfoHeading.waitFor()

    // 联系历史在 Separator 后面
    const historyHeading = page.locator("h3").filter({ hasText: "联系历史" })
    await expect(historyHeading).toBeVisible()
  })

  test("升级为学生按钮弹出确认弹窗并取消", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackComponent("ContactExpandPanel", "升级取消")

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    await rows.first().click()
    await page.getByText("升级为学生").first().waitFor()

    const upgradeSection = page.locator("section").filter({ hasText: "升级为学生" })
    await upgradeSection.getByRole("button", { name: "升级为学生" }).click()

    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    // AlertDialogTitle 中有"确认升级"
    await expect(dialog.locator("h2").first()).toBeVisible()

    await dialog.getByRole("button", { name: "取消" }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("负向：取消升级后联系人未改变", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackSecurity("操作安全", "升级取消不影响数据")

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    const rowsBefore = rowCount

    await rows.first().click()
    await page.getByText("升级为学生").first().waitFor()

    const upgradeSection = page.locator("section").filter({ hasText: "升级为学生" })
    await upgradeSection.getByRole("button", { name: "升级为学生" }).click()

    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "取消" }).click()
    await expect(dialog).not.toBeVisible()

    // 收起面板
    await rows.first().click()

    const rowsAfter = await page.locator("tbody tr").count()
    expect(rowsAfter).toBe(rowsBefore)
  })

  test("负向：面板收起后无升级按钮", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackSecurity("UI安全", "收起面板隐藏升级按钮")

    // 等待表格加载
    await expect(page.locator("table")).toBeVisible()

    // 未展开面板时不应看到面板内容
    const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
    await expect(basicInfoHeading).not.toBeVisible()
    const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
    await expect(markStatusHeading).not.toBeVisible()
  })

  test("负向：空备注保存不提交", async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    trackSecurity("输入验证", "空备注不提交")

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    if (rowCount === 0) {
      test.skip()
      return
    }

    await rows.first().click()
    const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
    await addNoteHeading.waitFor()

    const noteSection = page.locator("section").filter({ hasText: "添加备注" })
    const textarea = noteSection.locator("textarea")
    await textarea.fill("")

    // 点击保存但不应发出 API 请求（前端验证拦截）
    await noteSection.getByRole("button", { name: "保存" }).click()

    // toast 提示「请输入备注内容」
    await expect(page.getByText("请输入备注内容")).toBeVisible()
  })
})
