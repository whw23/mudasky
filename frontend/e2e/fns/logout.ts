/**
 * UI 登出流程。
 * 点击 header 中的登出按钮，等待登录按钮重新出现。
 */

import type { Page } from "@playwright/test"

export default async function logout(page: Page): Promise<void> {
  // 点击登出按钮（桌面端在 header，移动端在展开菜单中）
  await page.getByRole("button", { name: /登出|退出/ }).click()

  // 等待登录按钮重新出现（表示已成功登出）
  await page.getByRole("button", { name: /登录|注册/ }).waitFor({ state: "visible" })
}
