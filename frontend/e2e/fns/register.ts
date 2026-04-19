/**
 * UI 注册流程。
 * 通过手机验证码完成注册并保存 storageState。
 */

import type { Page } from "@playwright/test"
import { getAuthFile } from "../constants"

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

  // 导航到首页，等待登录或退出按钮可交互（水合完成后才可点击）
  await page.goto("/")
  const loginBtn = page.getByRole("button", { name: /登录|注册/ })
  const logoutBtn = page.getByRole("button", { name: "退出" })
  await loginBtn.or(logoutBtn).first().waitFor({ timeout: 30_000 })

  // 如果已登录（LAST_NOT_PASS 场景），先退出
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await loginBtn.waitFor({ timeout: 30_000 })
  }

  // 点击登录按钮打开弹窗（SSR 按钮可能未水合，重试直到弹窗出现）
  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 10; i++) {
    await loginBtn.click()
    if (await dialog.isVisible().catch(() => false)) break
    await page.waitForTimeout(1000)
  }
  await dialog.waitFor({ state: "visible", timeout: 10_000 })

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
  await dialog.getByRole("button", { name: /登录/ }).click()

  // 等待弹窗关闭（登录成功）
  try {
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 })
  } catch {
    // 如果弹窗没关闭，检查是否有错误提示
    const dialogText = await page.getByRole("dialog").textContent().catch(() => "")
    throw new Error(`注册/登录失败，弹窗未关闭。弹窗内容: ${dialogText?.substring(0, 200)}`)
  }

  // 保存 storageState
  const authFile = getAuthFile(worker)
  await page.context().storageState({ path: authFile })
}
