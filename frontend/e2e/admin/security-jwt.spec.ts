/**
 * JWT 安全性 E2E 测试。
 * 验证有效 token 能访问受保护接口，无效/缺失 token 被正确拒绝。
 */

import { test, expect } from "../fixtures/base"

/** 伪造的 JWT：格式正确但签名无效 */
const TAMPERED_JWT =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIiLCJpc19hY3RpdmUiOnRydWUsInBlcm1pc3Npb25zIjpbIioiXX0.invalidsignature"

test.describe("JWT — 有效 token 访问受保护接口", () => {
  test("有效 access_token 访问 admin API 返回 200", async ({ page }) => {
    await page.goto("/")
    const response = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(response.status()).toBe(200)
  })

  test("有效 access_token 访问 portal API 返回 200", async ({ page }) => {
    await page.goto("/")
    const response = await page.request.get("/api/portal/profile/meta", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(response.status()).toBe(200)
  })
})

test.describe("JWT — 无 cookie 访问受保护接口", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("无 cookie 访问 admin API 返回 401 ACCESS_TOKEN_MISSING", async ({ page }) => {
    await page.goto("/")
    const response = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("ACCESS_TOKEN_MISSING")
  })

  test("无 cookie 访问 portal API 返回 401 ACCESS_TOKEN_MISSING", async ({ page }) => {
    await page.goto("/")
    const response = await page.request.get("/api/portal/profile/meta", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("ACCESS_TOKEN_MISSING")
  })
})

test.describe("JWT — 无效 token 访问受保护接口", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("随机字符串 token 返回 401 TOKEN_INVALID", async ({ page }) => {
    await page.goto("/")
    const hostname = new URL(page.url()).hostname
    await page.context().addCookies([
      {
        name: "access_token",
        value: "this-is-not-a-jwt",
        domain: hostname,
        path: "/",
      },
    ])
    const response = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("TOKEN_INVALID")
  })

  test("伪造签名 JWT 返回 401 TOKEN_INVALID", async ({ page }) => {
    await page.goto("/")
    const hostname = new URL(page.url()).hostname
    await page.context().addCookies([
      {
        name: "access_token",
        value: TAMPERED_JWT,
        domain: hostname,
        path: "/",
      },
    ])
    const response = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("TOKEN_INVALID")
  })
})
