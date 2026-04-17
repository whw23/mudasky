/**
 * UI 登录流程（账号密码）。
 * 用于 W1 superuser 登录。
 */

import type { Page } from "@playwright/test"
import * as path from "path"

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

  // 点击登录按钮打开弹窗
  await page.getByRole("button", { name: /登录|注册/ }).click()

  // 等待弹窗出现
  await page.getByRole("dialog").waitFor({ state: "visible" })

  // 切换到账号密码 tab
  await page.getByRole("tab", { name: /账号|密码/ }).click()

  // 填写用户名
  await page.locator('input#login-account').fill(username)

  // 填写密码
  await page.locator('input#login-account-pwd').fill(password)

  // 点击登录按钮
  await page.getByRole("button", { name: /^登录$/ }).click()

  // 等待弹窗关闭（登录成功）
  await page.getByRole("dialog").waitFor({ state: "hidden" })

  // 保存 storageState
  const authFile = path.join(__dirname, "..", ".auth", `${worker}.json`)
  await page.context().storageState({ path: authFile })
}
