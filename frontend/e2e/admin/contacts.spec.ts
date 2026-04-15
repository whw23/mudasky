/**
 * 联系人管理 E2E 测试。
 * 覆盖：页面加载、列表展示、展开面板操作（标记状态、添加备注、联系历史）。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"
import { ensureTestUser } from "../helpers/seed"

test.describe("联系人管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
  })

  test("页面加载并展示列头", async ({ adminPage }) => {
    await expect(adminPage.locator("th").first()).toBeVisible()
  })
})

test.describe("联系人管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    // 确保有 visitor 角色的测试用户（会出现在联系人列表）
    await gotoAdmin(adminPage, "/admin/dashboard")
    await ensureTestUser(adminPage, "+8613900000088", "test-visitor", "visitor")
  })

  test("展开面板显示全部操作区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    const detailPromise = adminPage.waitForResponse(
      (r) => r.url().includes("/contacts/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()
    await detailPromise

    await expect(adminPage.getByText("标记状态").first()).toBeVisible()
    await expect(adminPage.getByText("添加备注").first()).toBeVisible()
    await expect(adminPage.getByText("联系历史").first()).toBeVisible()
    await expect(adminPage.getByText("升级为学生").first()).toBeVisible()
  })

  test("标记联系状态 — 选择状态并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()

    const statusSelect = adminPage.locator("select").first()
    await expect(statusSelect).toBeVisible()

    const currentValue = await statusSelect.inputValue()
    const newStatus = currentValue === "contacted" ? "interested" : "contacted"
    await statusSelect.selectOption(newStatus)

    const markSection = adminPage.getByText("标记状态").first().locator("..")
    const saveBtn = markSection.getByRole("button", { name: "保存" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/mark"),
    )
    await saveBtn.click()
    const response = await responsePromise
    expect([200, 422]).toContain(response.status())

    // 还原
    await statusSelect.selectOption(currentValue || "new")
    await saveBtn.click()
  })

  test("添加备注 — 填写并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()

    const noteArea = adminPage.getByPlaceholder("请输入备注...")
    await expect(noteArea).toBeVisible()

    await noteArea.fill(`E2E备注${Date.now()}`)

    const noteSection = adminPage.getByText("添加备注").first().locator("..")
    const saveBtn = noteSection.getByRole("button", { name: "保存" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/note"),
    )
    await saveBtn.click()
    const response = await responsePromise
    expect([200, 422]).toContain(response.status())
  })

  test("联系历史区域加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")

    const row = adminPage.locator("table tbody tr").first()
    await expect(row).toBeVisible()
    const detailPromise = adminPage.waitForResponse(
      (r) => r.url().includes("/contacts/") && r.url().includes("/detail"),
    ).catch(() => {})
    await row.click()
    await adminPage.getByText("基本信息").first().waitFor()
    await detailPromise

    await expect(adminPage.getByText("联系历史").first()).toBeVisible()
  })
})
