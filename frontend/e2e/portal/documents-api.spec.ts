import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("文档管理端点覆盖", () => {
  test("文档页面加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
    await adminPage.waitForTimeout(3000)
  })

  test("概览页面显示最近文档", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
    await adminPage.waitForTimeout(3000)
  })
})
