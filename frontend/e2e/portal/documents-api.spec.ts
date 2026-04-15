import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("文档管理端点覆盖", () => {
  test("文档页面加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
  })

  test("概览页面显示最近文档", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
  })

  test("上传按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await expect(adminPage.getByRole("button", { name: /上传文档/ })).toBeVisible({ timeout: 10_000 })
  })

  test("存储用量显示", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await expect(adminPage.getByText("存储用量")).toBeVisible({ timeout: 10_000 })
  })

  test("分类 tab 可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
    await expect(adminPage.getByRole("tab", { name: /全部/ })).toBeVisible({ timeout: 10_000 })
  })
})
