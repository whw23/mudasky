/**
 * 用户禁用/启用验证业务操作函数。
 *
 * 注意：这些函数使用 page.request 直接调用 API。
 * 这是合理的，因为需要在禁用状态下验证 API 响应，
 * 此时无法通过 UI 登录访问。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

const XHR = { "X-Requested-With": "XMLHttpRequest" }

/**
 * 验证用户被禁用后 API 返回 401。
 */
export const verifyDisabledApi: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const res = await page.request.get("/api/portal/overview", { headers: XHR })
  // 禁用用户可能返回 401 或 403
  expect([401, 403]).toContain(res.status())
}

/**
 * 验证用户被启用后访问恢复。
 * 需要重新登录获取新 token（旧 token 在禁用时已失效）。
 */
export const verifyEnabledApi: TaskFn = async (page, args) => {
  const phone = args?.phone as string
  if (!phone) throw new Error("verifyEnabledApi 需要 phone 参数")

  // 确保 internal_secret cookie 已设置
  const internalSecret = process.env.INTERNAL_SECRET || ""
  if (internalSecret) {
    const baseURL = process.env.BASE_URL || "http://localhost"
    const url = new URL(baseURL)
    await page.context().addCookies([
      { name: "internal_secret", value: internalSecret, url: url.origin },
    ])
  }

  // 重新 SMS 登录获取新 token
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  const logoutBtn = page.getByRole("button", { name: "退出" })
  const loginBtn = page.getByRole("button", { name: /登录/ })
  await logoutBtn.or(loginBtn).first().waitFor({ state: "visible", timeout: 30_000 })

  // 如果旧 cookie 仍在，先退出
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await loginBtn.waitFor({ state: "visible", timeout: 30_000 })
  }

  await loginBtn.click()
  await page.getByRole("dialog").waitFor({ state: "visible" })

  await page.getByRole("tab", { name: /手机|验证码/ }).click()

  const localNumber = phone.replace(/^\+\d{1,4}-/, "")
  await page.getByPlaceholder("请输入手机号").fill(localNumber)

  const sendBtn = page.getByRole("button", { name: "发送验证码" })
  await sendBtn.waitFor({ state: "visible" })
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/auth/sms-code") && r.status() === 200,
    { timeout: 15_000 },
  )
  await sendBtn.click()
  const response = await responsePromise
  const data = await response.json()
  const code = data.code as string
  if (!code) throw new Error("未从 sms-code API 获取到验证码")

  await page.getByPlaceholder("请输入验证码").fill(code)
  await page.getByRole("dialog").getByRole("button", { name: /登录/ }).click()
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 })

  // 验证新 token 可以访问 API（visitor 只有 portal/profile/* 权限）
  const res = await page.request.get("/api/portal/profile/meta/list", { headers: XHR })
  expect(res.status()).toBe(200)
}
