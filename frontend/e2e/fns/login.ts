/**
 * UI 登录流程（账号密码）。
 * 用于 W1 superuser 登录。
 */

import type { Page } from "@playwright/test"
import { getAuthFile } from "../constants"

export default async function login(
  page: Page,
  args?: Record<string, unknown>,
): Promise<void> {
  const username = args?.username as string
  const password = args?.password as string
  const worker = args?.worker as string

  if (!username || !password || !worker) {
    throw new Error("login fn 需要 username, password, worker 参数")
  }

  // 导航到首页
  await page.goto("/")

  // 点击登录按钮打开弹窗（SSR 按钮可能未水合，重试直到弹窗出现）
  const loginBtn = page.getByRole("button", { name: /登录|注册/ })
  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 10; i++) {
    await loginBtn.click()
    if (await dialog.isVisible().catch(() => false)) break
    await page.waitForTimeout(1000)
  }
  await dialog.waitFor({ state: "visible", timeout: 10_000 })

  // 切换到账号密码 tab
  await page.getByRole("tab", { name: /账号|密码/ }).click()

  // 填写用户名
  await page.getByPlaceholder("用户名或手机号").fill(username)

  // 填写密码
  await page.getByPlaceholder("请输入密码").fill(password)

  // 点击登录按钮
  await page.getByRole("button", { name: /^登录$/ }).click()

  // 等待弹窗关闭（登录成功）
  await page.getByRole("dialog").waitFor({ state: "hidden" })

  // 保存 storageState
  const authFile = getAuthFile(worker)
  await page.context().storageState({ path: authFile })
}
