/**
 * 认证生命周期 E2E 测试。
 * 覆盖：refresh token 端点、public-key 端点。
 */

import { test, expect } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("认证生命周期", () => {
  test("refresh token 端点可正常调用", async ({ page }) => {
    await page.goto("/")
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      return { status: res.status }
    })
    // 未认证时应返回 401，但不应是 500
    expect(response.status).not.toBe(500)
    expect([200, 401, 403]).toContain(response.status)
  })

  test("public-key 端点可正常调用", async ({ page }) => {
    await page.goto("/")
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/auth/public-key")
      return { status: res.status }
    })
    expect(response.status).toBe(200)
  })
})
