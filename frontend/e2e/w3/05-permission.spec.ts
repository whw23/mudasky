/**
 * W3 权限测试。
 * 验证 advisor 角色的权限边界：允许的页面可访问，禁止的页面 403。
 */

import { test, expect, gotoAdmin, trackSecurity } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

test.describe("W3 权限测试", () => {
  test.beforeEach(async () => {
    await waitFor("roles_assigned", 90_000)
  })

  test("正向：admin/students 可访问", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/students成功")

    await gotoAdmin(page, "/admin/students")
    const table = page.locator("table")
    await expect(table).toBeVisible()
  })

  test("正向：admin/contacts 可访问", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/contacts成功")

    await gotoAdmin(page, "/admin/contacts")
    const table = page.locator("table")
    await expect(table).toBeVisible()
  })

  test("正向：admin/dashboard 可访问", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/dashboard成功")

    await gotoAdmin(page, "/admin/dashboard")
    await page.locator("main").waitFor()
    // 页面不应显示权限拒绝
    await expect(page.getByText("403")).not.toBeVisible()
  })

  test("正向：portal/profile 可访问", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问portal/profile成功")

    await gotoAdmin(page, "/portal/profile")
    await page.locator("main").waitFor()
    await expect(page.getByText("403")).not.toBeVisible()
  })

  test("负向：admin/users 无权限", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/users被拒")

    const res = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(403)
  })

  test("负向：admin/articles 无权限", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/articles被拒")

    const res = await page.request.get("/api/admin/articles/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(403)
  })

  test("负向：admin/roles 无权限", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/roles被拒")

    const res = await page.request.get("/api/admin/roles/meta/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(403)
  })

  test("负向：admin/categories 无权限", async ({ page }) => {
    trackSecurity("跨角色", "advisor访问admin/categories被拒")

    const res = await page.request.get("/api/admin/categories/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(403)
  })
})
