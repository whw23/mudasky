/**
 * UI 登出流程。
 * 导航到首页后点击退出按钮。如果已登出则跳过。
 */

import type { Page } from "@playwright/test"

export default async function logout(page: Page): Promise<void> {
  // 导航到首页
  await page.goto("/")

  // 检查是否已登录
  const logoutBtn = page.getByRole("button", { name: "退出" })
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click()
    // 等待登录按钮重新出现
    await page.getByRole("button", { name: /登录/ }).waitFor({ state: "visible" })
  }
  // 已登出则跳过
}
