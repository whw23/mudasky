/**
 * 重新认证。
 * 角色变更后 refresh_token 被删除，需要重新 SMS 登录获取新 JWT。
 */

import type { Page } from "@playwright/test"
import * as path from "path"

export default async function reloadAuth(
  page: Page,
  args?: Record<string, unknown>,
): Promise<void> {
  const worker = args?.worker as string
  const phone = args?.phone as string

  if (!worker || !phone) {
    throw new Error("reloadAuth fn 需要 worker 和 phone 参数")
  }

  // 清除旧 cookies（旧 JWT 无效）
  await page.context().clearCookies()

  // 设置 internal_secret cookie
  const internalSecret = process.env.INTERNAL_SECRET || ""
  if (internalSecret) {
    const baseURL = process.env.BASE_URL || "http://localhost"
    const url = new URL(baseURL)
    await page.context().addCookies([
      { name: "internal_secret", value: internalSecret, url: url.origin },
    ])
  }

  // 重新 SMS 登录
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 打开登录弹窗
  await page.getByRole("button", { name: /登录|注册/ }).click()
  await page.getByRole("dialog").waitFor({ state: "visible" })

  // 确保在 SMS tab
  await page.getByRole("tab", { name: /手机|验证码/ }).click()

  // 填写手机号
  const localNumber = phone.replace(/^\+\d{1,4}-/, "")
  await page.getByPlaceholder("请输入手机号").fill(localNumber)

  // 等待发送按钮启用，然后发送
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

  // 填写验证码
  await page.getByPlaceholder("请输入验证码").fill(code)

  // 提交
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: /登录/ }).click()

  // 等待登录成功
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 })

  // 保存新的 storageState
  const authFile = path.join(__dirname, "..", ".auth", `${worker}.json`)
  await page.context().storageState({ path: authFile })
}
