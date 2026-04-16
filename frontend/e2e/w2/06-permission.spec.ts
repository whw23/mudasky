/**
 * W2 权限测试。
 * student 角色可访问 portal，不可访问 admin。
 */

import { test, expect, gotoAdmin, trackSecurity } from "../fixtures/base"

test.describe("W2 权限 - portal 可访问", () => {
  test("portal 总览页可访问", async ({ page }) => {
    await gotoAdmin(page, "/portal/overview")
    await expect(page.getByRole("heading").first()).toBeVisible()
    trackSecurity("portal权限", "student访问portal总览")
  })

  test("portal 个人资料可访问", async ({ page }) => {
    await gotoAdmin(page, "/portal/profile")
    await expect(page.getByText("基本信息")).toBeVisible()
    trackSecurity("portal权限", "student访问portal资料")
  })

  test("portal 文档管理可访问", async ({ page }) => {
    await gotoAdmin(page, "/portal/documents")
    await expect(page.getByRole("heading", { name: /文档/ })).toBeVisible()
    trackSecurity("portal权限", "student访问portal文档")
  })
})

test.describe("W2 权限 - admin 被拒", () => {
  test("admin 仪表盘被拒", async ({ page }) => {
    const res = await page.request.get("/api/admin/dashboard/meta", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect([401, 403]).toContain(res.status())
    trackSecurity("跨角色", "student访问admin仪表盘被拒")
  })

  test("admin 用户列表被拒", async ({ page }) => {
    const res = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect([401, 403]).toContain(res.status())
    trackSecurity("跨角色", "student访问admin用户被拒")
  })

  test("admin 文章列表被拒", async ({ page }) => {
    const res = await page.request.get("/api/admin/articles/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect([401, 403]).toContain(res.status())
    trackSecurity("跨角色", "student访问admin文章被拒")
  })

  test("admin 角色列表被拒", async ({ page }) => {
    const res = await page.request.get("/api/admin/roles/meta/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect([401, 403]).toContain(res.status())
    trackSecurity("跨角色", "student访问admin角色被拒")
  })

  test("admin 页面导航被重定向或拦截", async ({ page }) => {
    await page.goto("/admin/dashboard")
    // 应被重定向到首页或显示无权限
    await page.waitForURL(/.*/, { timeout: 10_000 })
    const url = page.url()
    // 不应停留在 admin 页面（被 PanelGuard 拦截）
    expect(
      url.includes("/admin/dashboard") === false ||
      (await page.getByText(/无权限|403|权限不足/).isVisible().catch(() => false)),
    ).toBe(true)
    trackSecurity("跨角色", "student访问admin被拒")
    trackSecurity("跨角色", "student访问admin页面被拦截")
  })
})
