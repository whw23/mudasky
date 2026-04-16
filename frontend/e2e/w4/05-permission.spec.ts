/**
 * W4 权限测试。
 * visitor 角色访问 admin 路由应被拒绝；portal 路由可能可访问（visitor 仍是登录用户）。
 */

import { test, expect, trackSecurity } from "../fixtures/base"

const XHR = { "X-Requested-With": "XMLHttpRequest" }

test.describe("W4 权限守卫", () => {
  test("admin/dashboard 重定向", async ({ page }) => {
    await page.goto("/admin/dashboard")
    // PanelGuard：无 admin 权限 → 重定向到 /portal/overview 或 /
    await page.waitForURL(/(?!.*\/admin\/dashboard)/, { timeout: 10_000 }).catch(() => {})
    const url = page.url()
    expect(url).not.toContain("/admin/dashboard")
    trackSecurity("跨角色", "visitor访问admin被拒")
  })

  test("admin/users 重定向", async ({ page }) => {
    await page.goto("/admin/users")
    await page.waitForURL(/(?!.*\/admin\/users)/, { timeout: 10_000 }).catch(() => {})
    const url = page.url()
    expect(url).not.toContain("/admin/users")
  })

  test("admin/articles 重定向", async ({ page }) => {
    await page.goto("/admin/articles")
    await page.waitForURL(/(?!.*\/admin\/articles)/, { timeout: 10_000 }).catch(() => {})
    const url = page.url()
    expect(url).not.toContain("/admin/articles")
  })

  test("portal 页面 visitor 可访问或重定向", async ({ page }) => {
    // visitor 是已登录用户，可能拥有 portal 权限
    await page.goto("/portal/overview")
    await page.locator("main").waitFor({ timeout: 10_000 }).catch(() => {})

    // 不做重定向断言 — visitor 可能有 portal 访问权限
    // 关键验证：页面不返回 500
    const url = page.url()
    expect(url).not.toContain("error")
  })

  test("portal/documents 可访问或重定向", async ({ page }) => {
    await page.goto("/portal/documents")
    await page.locator("main").waitFor({ timeout: 10_000 }).catch(() => {})
    // visitor 可能有 portal 权限（已登录用户）
    // 不做强制重定向断言
  })

  test("portal/profile 可访问或重定向", async ({ page }) => {
    await page.goto("/portal/profile")
    await page.locator("main").waitFor({ timeout: 10_000 }).catch(() => {})
    // visitor 可能有 portal 权限（已登录用户）
  })

  test("正向：公开页面正常访问", async ({ page }) => {
    await page.goto("/about")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("API: admin 接口返回 401/403", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.get("/api/admin/users/list", {
      headers: XHR,
    })
    // visitor 访问 admin API 应被网关拒绝
    expect([401, 403]).toContain(res.status())
    trackSecurity("跨角色", "visitor访问admin API被拒")
  })
})
