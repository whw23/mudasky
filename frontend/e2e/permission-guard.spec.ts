import { test, expect } from "@playwright/test"

test.describe("权限拦截测试", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("未登录访问 admin 页面重定向首页", async ({ page }) => {
    await page.goto("/admin/users", { timeout: 30_000 })
    await page.waitForTimeout(5000)
    const url = page.url()
    expect(url).not.toContain("/admin")
  })

  test("未登录访问 portal 页面重定向首页", async ({ page }) => {
    await page.goto("/portal/profile", { timeout: 30_000 })
    await page.waitForTimeout(5000)
    const url = page.url()
    expect(url).not.toContain("/portal")
  })
})
