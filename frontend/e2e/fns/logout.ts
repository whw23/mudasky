/**
 * UI 登出流程。
 * 导航到首页后点击退出按钮。
 */

import type { Page } from "@playwright/test"

export default async function logout(page: Page): Promise<void> {
  // 导航到首页（admin 页面没有退出按钮）
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 点击退出按钮
  await page.getByRole("button", { name: "退出" }).click()

  // 等待登录按钮重新出现（表示已成功登出）
  await page.getByRole("button", { name: /登录/ }).waitFor({ state: "visible" })
}
