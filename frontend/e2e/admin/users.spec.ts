/**
 * 用户管理 E2E 测试。
 * 覆盖：页面加载、搜索功能、用户抽屉详情。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户管理", () => {
  test("页面加载并展示搜索和表格", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    const main = adminPage.locator("main")
    await expect(main.getByRole("heading", { name: "用户管理" })).toBeVisible()
    await expect(main.getByPlaceholder("搜索用户名或手机号")).toBeVisible()
    /* 表格列头 */
    await expect(main.getByRole("columnheader", { name: "用户名" })).toBeVisible()
    await expect(main.getByRole("columnheader", { name: "状态" })).toBeVisible()
    await expect(main.getByRole("columnheader", { name: "角色" })).toBeVisible()
  })

  test("搜索功能", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    const main = adminPage.locator("main")

    await main.getByPlaceholder("搜索用户名或手机号").fill("mudasky")
    await adminPage.waitForTimeout(1000)
    await expect(main.getByText("mudasky")).toBeVisible({ timeout: 10_000 })
  })

  test("点击用户行打开详情抽屉", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    const main = adminPage.locator("main")

    await main.getByPlaceholder("搜索用户名或手机号").fill("mudasky")
    await adminPage.waitForTimeout(1000)

    const row = main.locator("tr", { hasText: "mudasky" })
    await row.click()

    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 15_000 })
  })
})
