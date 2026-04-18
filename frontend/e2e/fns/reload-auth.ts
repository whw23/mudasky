/**
 * 重新认证（角色变更后）。
 * 通过 UI 退出 → UI 重新 SMS 登录 → 获取新角色的 JWT。
 * 不使用 clearCookies 等 hack 操作。
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

  // 确保 internal_secret cookie 已设置
  const internalSecret = process.env.INTERNAL_SECRET || ""
  if (internalSecret) {
    const baseURL = process.env.BASE_URL || "http://localhost"
    const url = new URL(baseURL)
    await page.context().addCookies([
      { name: "internal_secret", value: internalSecret, url: url.origin },
    ])
  }

  // 1. 导航到首页
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 2. 等待 header 按钮出现（可能是"退出"或"登录/注册"）
  const logoutBtn = page.getByRole("button", { name: "退出" })
  const loginBtn = page.getByRole("button", { name: /登录/ })
  await logoutBtn.or(loginBtn).first().waitFor({ state: "visible", timeout: 15_000 })

  // 如果已登录，先通过 UI 退出
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await loginBtn.waitFor({ state: "visible", timeout: 15_000 })
  }

  // 3. 通过 UI 重新 SMS 登录
  await loginBtn.click()
  await page.getByRole("dialog").waitFor({ state: "visible" })

  // 确保在 SMS tab
  await page.getByRole("tab", { name: /手机|验证码/ }).click()

  // 填写手机号
  const localNumber = phone.replace(/^\+\d{1,4}-/, "")
  await page.getByPlaceholder("请输入手机号").fill(localNumber)

  // 发送验证码
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

  // 填写验证码并提交
  await page.getByPlaceholder("请输入验证码").fill(code)
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: /登录/ }).click()

  // 等待登录成功（弹窗关闭）
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 })

  // 4. 验证新 JWT 包含正确权限
  const cookies = await page.context().cookies()
  const accessCookie = cookies.find(c => c.name === "access_token")
  if (!accessCookie) {
    throw new Error("重新登录后无 access_token cookie")
  }
  // 解码 JWT payload（Base64）查看权限
  const parts = accessCookie.value.split(".")
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString())
    const perms = payload.permissions || []
    if (perms.length <= 1 && perms[0] === "portal/profile/*") {
      throw new Error(`重新登录后 JWT 权限未更新! permissions=${JSON.stringify(perms)}, worker=${worker}`)
    }
  }

  // 5. 保存新的 storageState
  const authFile = path.join(__dirname, "..", ".auth", `${worker}.json`)
  await page.context().storageState({ path: authFile })
}
