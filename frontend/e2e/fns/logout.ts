/**
 * UI 登出流程。
 * 导航到首页后点击退出按钮。如果已登出则跳过。
 */

import type { Page } from "@playwright/test"

export default async function logout(page: Page): Promise<void> {
  // 导航到首页，等待按钮水合
  await page.goto("/")
  const loginBtn = page.getByRole("button", { name: /登录|注册/ })
  const logoutBtn = page.getByRole("button", { name: "退出" })
  await loginBtn.or(logoutBtn).first().waitFor({ timeout: 30_000 })

  // 已登录则退出，否则跳过
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await loginBtn.waitFor({ timeout: 30_000 })
  }
}
