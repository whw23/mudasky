/**
 * JWT 安全测试业务操作函数。
 *
 * 注意：这些函数使用 page.request 和 cookie 操作，而非 UI 操作。
 * 这是合理的，因为 JWT 安全测试需要直接操作 HTTP 请求和响应头，
 * 无法通过点击按钮等 UI 操作完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

const XHR = { "X-Requested-With": "XMLHttpRequest" }

/**
 * 测试缺失 token 返回 401。
 */
export const testMissingToken: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await page.context().clearCookies()

  const res = await page.request.get("/api/admin/users/list", { headers: XHR })
  expect(res.status()).toBe(401)
  const body = await res.json()
  expect(body.code).toBe("ACCESS_TOKEN_MISSING")
}

/**
 * 测试无效 token 返回 401。
 */
export const testInvalidToken: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
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

  const res = await page.request.get("/api/admin/users/list", { headers: XHR })
  expect(res.status()).toBe(401)
  const body = await res.json()
  expect(body.code).toBe("TOKEN_INVALID")
}

/**
 * 测试篡改 JWT 签名返回 401。
 */
export const testTamperedJwt: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
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

  const res = await page.request.get("/api/admin/users/list", { headers: XHR })
  expect(res.status()).toBe(401)
  const body = await res.json()
  expect(body.code).toBe("TOKEN_INVALID")
}

/**
 * 测试有效 token 正常访问。
 */
export const testValidToken: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const res = await page.request.get("/api/public/config/site_info", { headers: XHR })
  expect(res.status()).toBe(200)
}
