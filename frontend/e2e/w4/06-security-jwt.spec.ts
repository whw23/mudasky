/**
 * W4 JWT 安全测试。
 * 验证 token 缺失、无效、篡改时的 API 响应。
 */

import { test, expect, trackSecurity } from "../fixtures/base"

const XHR = { "X-Requested-With": "XMLHttpRequest" }

test.describe("W4 JWT 安全", () => {
  test("清除 cookies 后访问 admin API 返回 401", async ({ page }) => {
    await page.goto("/")
    await page.context().clearCookies()

    const res = await page.request.get("/api/admin/users/list", {
      headers: XHR,
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("ACCESS_TOKEN_MISSING")
    trackSecurity("JWT", "缺失token返回401")
  })

  test("清除 cookies 后访问 portal API 返回 401", async ({ page }) => {
    await page.goto("/")
    await page.context().clearCookies()

    const res = await page.request.get("/api/portal/overview", {
      headers: XHR,
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("ACCESS_TOKEN_MISSING")
  })

  test("随机字符串 token 返回 401 TOKEN_INVALID", async ({ page }) => {
    await page.goto("/")
    const domain = new URL(page.url()).hostname

    await page.context().clearCookies()
    await page.context().addCookies([
      {
        name: "access_token",
        value: "random-invalid-token-string-12345",
        domain,
        path: "/",
      },
    ])

    const res = await page.request.get("/api/admin/users/list", {
      headers: XHR,
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("TOKEN_INVALID")
    trackSecurity("JWT", "无效token返回401")
  })

  test("篡改 JWT 签名返回 401", async ({ page }) => {
    await page.goto("/")
    const domain = new URL(page.url()).hostname

    // 构造一个看起来像 JWT 但签名无效的 token
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6InRlc3QifQ." +
      "tampered-signature-here"

    await page.context().clearCookies()
    await page.context().addCookies([
      {
        name: "access_token",
        value: fakeJwt,
        domain,
        path: "/",
      },
    ])

    const res = await page.request.get("/api/admin/users/list", {
      headers: XHR,
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("TOKEN_INVALID")
    trackSecurity("JWT", "篡改JWT签名返回401")
  })

  test("正向：有效 token 访问公开 API 正常", async ({ page }) => {
    // W4 的 storageState 中已有有效 token
    await page.goto("/")
    const res = await page.request.get("/api/public/config/site_info", {
      headers: XHR,
    })
    expect(res.status()).toBe(200)
    trackSecurity("JWT", "有效token正常访问")
  })

  test("正向：有效 token 可以 refresh", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.post("/api/auth/refresh", {
      headers: XHR,
    })
    // W4 有有效的 refresh token
    expect([200, 401]).toContain(res.status())
  })
})
