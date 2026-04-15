import { test, expect } from "./fixtures/base"

test.describe("权限拦截测试", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("未登录访问 admin 页面重定向首页", async ({ page }) => {
    await page.goto("/admin/users")
    /* 重定向到首页，URL 可能是 / 或 /zh 等带 locale 前缀 */
    await page.waitForURL((url) => !url.pathname.includes("/admin"))
    const url = page.url()
    expect(url).not.toContain("/admin")
  })

  test("未登录访问 portal 页面重定向首页", async ({ page }) => {
    await page.goto("/portal/profile")
    /* 重定向到首页，URL 可能是 / 或 /zh 等带 locale 前缀 */
    await page.waitForURL((url) => !url.pathname.includes("/portal"))
    const url = page.url()
    expect(url).not.toContain("/portal")
  })
})
