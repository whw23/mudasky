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
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()

    await expect(
      adminPage.getByText("文件列表").or(adminPage.getByText("暂无文件")),
    ).toBeVisible()
  })
})
