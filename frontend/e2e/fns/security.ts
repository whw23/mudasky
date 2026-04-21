/**
 * 安全测试业务操作函数。
 *
 * EXCEPTION: 安全测试需要使用 page.request 直接发送 HTTP 请求，
 * 因为它们测试的是原始 HTTP 行为（CSRF 头、XSS payload、SQL 注入等），
 * 无法通过 UI 操作完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

const JSON_HEADERS = { "Content-Type": "application/json" }
const XRW_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }

/** 测试 CSRF 防护 */
export async function testCsrf(page: Page): Promise<void> {
  // POST 不带 X-Requested-With 应返回 403
  const res = await page.request.post("/api/admin/web-settings/categories/list", {
    headers: JSON_HEADERS,
    data: {},
  })
  expect(res.status()).toBe(403)
}

/** 测试 XSS 防护 */
export async function testXss(page: Page, args?: Record<string, unknown>): Promise<void> {
  const payload = String(args?.payload ?? '<script>alert("xss")</script>')

  // 搜索框注入
  const searchRes = await page.request.get(
    `/api/admin/users/list?search=${encodeURIComponent(payload)}`,
    { headers: { "X-Requested-With": "XMLHttpRequest" } },
  )
  expect(searchRes.status()).toBe(200)
  const body = await searchRes.json()
  const bodyStr = JSON.stringify(body)
  // 验证返回值不含未转义的脚本标签
  expect(bodyStr).not.toContain("<script>")
}

/** 测试 SQL 注入防护 */
export async function testSqlInjection(page: Page): Promise<void> {
  // 登录 SQL 注入
  const loginRes = await page.request.post("/api/auth/sms-code", {
    headers: XRW_HEADERS,
    data: { phone: "' OR '1'='1" },
  })
  // 应返回验证错误，而非 500
  expect(loginRes.status()).toBeLessThan(500)

  // 搜索参数 SQL 注入
  const sqlPayload = "'; DROP TABLE users; --"
  const searchRes = await page.request.get(
    `/api/admin/users/list?search=${encodeURIComponent(sqlPayload)}`,
    { headers: { "X-Requested-With": "XMLHttpRequest" } },
  )
  expect(searchRes.status()).toBe(200)

  // 验证数据库未被破坏（仍能查询）
  const verifyRes = await page.request.get("/api/admin/users/list", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  })
  expect(verifyRes.status()).toBe(200)
}

/** 测试输入验证 */
export async function testInputValidation(page: Page): Promise<void> {
  // 空 body
  const emptyRes = await page.request.post("/api/admin/web-settings/categories/list/create", {
    headers: XRW_HEADERS,
  })
  expect(emptyRes.status()).toBe(422)

  // 无效 JSON
  const invalidRes = await page.request.post("/api/admin/web-settings/categories/list/create", {
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    data: "not-valid-json{{{",
  })
  expect(invalidRes.status()).toBe(422)

  // 超长字符串
  const longStr = "A".repeat(10_000)
  const longRes = await page.request.post("/api/admin/web-settings/categories/list/create", {
    headers: XRW_HEADERS,
    data: { name: longStr, slug: longStr },
  })
  expect(longRes.status()).toBeLessThan(500)

  // 非法 UUID
  const uuidRes = await page.request.get(
    "/api/admin/users/list/detail?user_id=not-a-uuid",
    { headers: { "X-Requested-With": "XMLHttpRequest" } },
  )
  expect(uuidRes.status()).toBeLessThan(500)

  // 负数页码
  const negativeRes = await page.request.get(
    "/api/admin/users/list?page=-1&page_size=20",
    { headers: { "X-Requested-With": "XMLHttpRequest" } },
  )
  expect(negativeRes.status()).toBeGreaterThanOrEqual(400)
}
