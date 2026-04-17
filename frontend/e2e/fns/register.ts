/**
 * UI 注册流程。
 * 通过手机验证码完成注册并保存 storageState。
 */

import type { Page } from "@playwright/test"
import * as path from "path"

export default async function register(
  page: Page,
  args?: Record<string, unknown>,
): Promise<void> {
  const phone = args?.phone as string
  const worker = args?.worker as string

  if (!phone || !worker) {
    throw new Error("register fn 需要 phone 和 worker 参数")
  }

  // 确保 internal_secret cookie 已设置（LAST_NOT_PASS 模式下 set_cookie 可能被跳过）
  const internalSecret = process.env.INTERNAL_SECRET || ""
  if (internalSecret) {
    const baseURL = process.env.BASE_URL || "http://localhost"
    const url = new URL(baseURL)
    await page.context().addCookies([
      { name: "internal_secret", value: internalSecret, url: url.origin },
    ])
  }

  // 导航到首页（等待水合完成）
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 点击登录按钮打开弹窗
  await page.getByRole("button", { name: /登录|注册/ }).click()

  // 等待弹窗出现
  await page.getByRole("dialog").waitFor({ state: "visible" })

  // 确保在 SMS 验证码 tab（默认就是，但明确点击确保）
  await page.getByRole("tab", { name: /手机|验证码/ }).click()

  // 从 phone 中提取本地号码（格式 +86-13900001234，需要输入 13900001234）
  const localNumber = phone.replace(/^\+\d{1,4}-/, "")

  // 填写手机号（只输入本地部分，国家码通过下拉选择器默认是 +86）
  await page.getByPlaceholder("请输入手机号").fill(localNumber)

  // 等待发送验证码按钮启用
  const sendBtn = page.getByRole("button", { name: "发送验证码" })
  await sendBtn.waitFor({ state: "visible" })

  // 先设置响应监听，再点击按钮（防止竞态）
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/auth/sms-code") && r.status() === 200,
    { timeout: 15_000 },
  )
  await sendBtn.click()

  const response = await responsePromise
  const data = await response.json()
  const code = data.code as string

  if (!code) {
    throw new Error("未从 sms-code API 响应中获取到验证码")
  }

  // 填写验证码
  await page.getByPlaceholder("请输入验证码").fill(code)

  // 点击弹窗内的登录/注册提交按钮
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: /登录/ }).click()

  // 等待弹窗关闭（登录成功）
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 })

  // 保存 storageState
  const authFile = path.join(__dirname, "..", ".auth", `${worker}.json`)
  await page.context().storageState({ path: authFile })
}
