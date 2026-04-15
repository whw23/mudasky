/**
 * 越权访问 E2E 测试。
 * 验证未登录用户和普通用户无法访问管理接口。
 */

import { test, expect } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("越权 — 未登录用户", () => {
  test("访问 /admin/dashboard 被重定向", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.waitForURL(/\/$/)
    await expect(page).toHaveURL(/\/$/)
  })

  test("访问 /admin/users 被重定向", async ({ page }) => {
    await page.goto("/admin/users")
    await page.waitForURL(/\/$/)
    await expect(page).toHaveURL(/\/$/)
  })

  test("访问 /portal/profile 被重定向", async ({ page }) => {
    await page.goto("/portal/profile")
    await page.waitForURL(/\/$/)
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
    expect([401, 403]).toContain(response.status)
  })
})

test.describe("未登录 — admin 写操作全覆盖", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const adminEndpoints = [
    { path: "/api/admin/users/list/detail/edit", body: { user_id: "x" } },
    { path: "/api/admin/roles/meta/list/create", body: { name: "x" } },
    { path: "/api/admin/roles/meta/list/detail/delete", body: { role_id: "x" } },
    { path: "/api/admin/categories/list/create", body: { name: "x" } },
    { path: "/api/admin/articles/list/create", body: { title: "x" } },
    { path: "/api/admin/cases/list/create", body: { title: "x" } },
    { path: "/api/admin/universities/list/create", body: { name: "x" } },
    { path: "/api/admin/students/list/detail/edit", body: { user_id: "x" } },
    { path: "/api/admin/students/list/detail/assign-advisor", body: { user_id: "x" } },
    { path: "/api/admin/contacts/list/detail/mark", body: { user_id: "x" } },
    { path: "/api/admin/contacts/list/detail/upgrade", body: { user_id: "x" } },
    { path: "/api/admin/general-settings/list/edit", body: { key: "x", value: "x" } },
    { path: "/api/admin/web-settings/list/edit", body: { key: "x", value: "x" } },
  ]

  for (const { path, body } of adminEndpoints) {
    const shortPath = path.replace("/api/admin/", "")
    test(`未认证 POST ${shortPath} 被拒绝`, async ({ page }) => {
      await page.goto("/")
      const response = await page.evaluate(
        async ({ url, data }) => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          return { status: res.status }
        },
        { url: path, data: body },
      )
      expect([401, 403]).toContain(response.status)
    })
  }
})

test.describe("未登录 — portal 写操作全覆盖", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const portalEndpoints = [
    { path: "/api/portal/profile/meta/list/edit", body: { username: "x" } },
    { path: "/api/portal/profile/password", body: { phone: "x", code: "x" } },
    { path: "/api/portal/profile/phone", body: { new_phone: "x", code: "x" } },
    { path: "/api/portal/profile/delete-account", body: { code: "x" } },
    { path: "/api/portal/profile/sessions/list/revoke", body: { token_id: "x" } },
    { path: "/api/portal/profile/sessions/list/revoke-all", body: {} },
    { path: "/api/portal/profile/two-factor/enable-totp", body: {} },
    { path: "/api/portal/profile/two-factor/confirm-totp", body: { totp_code: "x" } },
    { path: "/api/portal/profile/two-factor/disable", body: { phone: "x", code: "x" } },
    { path: "/api/portal/documents/list/detail/delete", body: { doc_id: "x" } },
  ]

  for (const { path, body } of portalEndpoints) {
    const shortPath = path.replace("/api/portal/", "")
    test(`未认证 POST ${shortPath} 被拒绝`, async ({ page }) => {
      await page.goto("/")
      const response = await page.evaluate(
        async ({ url, data }) => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          return { status: res.status }
        },
        { url: path, data: body },
      )
      expect([401, 403]).toContain(response.status)
    })
  }
})
