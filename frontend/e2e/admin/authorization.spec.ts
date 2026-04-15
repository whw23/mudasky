/**
 * 越权访问 E2E 测试。
 * 验证未登录用户和普通用户无法访问管理接口。
 */

import { test, expect } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("越权 — 未登录用户", () => {
  test("访问 /admin/dashboard 被重定向", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.waitForURL(/\/$/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/$/)
  })

  test("访问 /admin/users 被重定向", async ({ page }) => {
    await page.goto("/admin/users")
    await page.waitForURL(/\/$/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/$/)
  })

  test("访问 /portal/profile 被重定向", async ({ page }) => {
    await page.goto("/portal/profile")
    await page.waitForURL(/\/$/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/$/)
  })

  test("直接调用 admin API 返回 401", async ({ page }) => {
    await page.goto("/")
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/admin/users/list", { credentials: "include" })
      return { status: res.status }
    })
    expect(response.status).toBe(401)
  })

  test("直接调用 portal API 返回 401", async ({ page }) => {
    await page.goto("/")
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/portal/profile/view", { credentials: "include" })
      return { status: res.status }
    })
    expect(response.status).toBe(401)
  })

  test("直接调用删除用户 API 被拒绝", async ({ page }) => {
    await page.goto("/")
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/admin/users/delete/fake-id", {
        method: "POST",
        credentials: "include",
      })
      return { status: res.status }
    })
    // 网关 CSRF 保护返回 403，或未认证返回 401
    expect([401, 403]).toContain(response.status)
  })
})
