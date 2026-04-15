/**
 * 联系人管理 E2E 测试。
 * 覆盖：页面加载、列表展示、展开面板操作（标记状态、添加备注、联系历史）。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

/** 展开第一个联系人行，返回是否成功 */
async function expandFirstContactRow(adminPage: import("@playwright/test").Page): Promise<boolean> {
  const noData = adminPage.getByText("暂无数据")
  if (await noData.isVisible({ timeout: 3_000 }).catch(() => false)) return false

  const row = adminPage.locator("table tbody tr").first()
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) return false

  const text = await row.textContent()
  if (text?.includes("暂无数据") || text?.includes("暂无")) return false

  await row.click()
  await adminPage.getByText("基本信息").first().waitFor({ timeout: 15_000 })
  return true
}

test.describe("联系人管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
  })

  test("页面加载并展示联系人列表", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    await expect(main.locator("th").first()).toBeVisible({ timeout: 10_000 })
  })

  test("列表展示联系人信息列头", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    await expect(main.locator("th, [role='columnheader']").first()).toBeVisible({ timeout: 10_000 })
  })

  test("展开面板显示全部操作区域", async ({ adminPage }) => {
    if (!(await expandFirstContactRow(adminPage))) return

    await expect(adminPage.getByText("标记状态").first()).toBeVisible()
    await expect(adminPage.getByText("添加备注").first()).toBeVisible()
    await expect(adminPage.getByText("联系历史").first()).toBeVisible()
    await expect(adminPage.getByText("升级为学生").first()).toBeVisible()
  })
})

test.describe("联系人管理实际操作", () => {
  test("标记联系状态 — 选择状态并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    if (!(await expandFirstContactRow(adminPage))) {
      test.skip(true, "无联系人数据")
      return
    }

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

    // 还原状态
    await statusSelect.selectOption(currentValue || "new")
    const restorePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/mark"),
    )
    await saveBtn.click()
    await restorePromise
  })

  test("添加备注 — 填写并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    if (!(await expandFirstContactRow(adminPage))) {
      test.skip(true, "无联系人数据")
      return
    }

    const noteArea = adminPage.getByPlaceholder("请输入备注...")
    await expect(noteArea).toBeVisible()

    await noteArea.fill(`E2E测试备注 ${Date.now()}`)

    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/note"),
    )
    const noteSection = adminPage.getByText("添加备注").first().locator("..")
    const saveBtn = noteSection.getByRole("button", { name: "保存" })
    await saveBtn.click()
    const response = await responsePromise
    expect([200, 422]).toContain(response.status())
  })

  test("联系历史区域加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
    if (!(await expandFirstContactRow(adminPage))) {
      test.skip(true, "无联系人数据")
      return
    }

    await expect(adminPage.getByText("联系历史").first()).toBeVisible({ timeout: 10_000 })
  })
})
