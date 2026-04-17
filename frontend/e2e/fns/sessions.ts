/**
 * 登录设备管理业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 查看会话列表。
 */
export const viewSessions: TaskFn = async (page) => {
  // 滚动到底部确保会话区域可见
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(page.getByText("登录设备")).toBeVisible()
  await expect(page.getByText("当前").first()).toBeVisible()
}

/**
 * 验证当前设备无踢出按钮。
 */
export const verifyCurrentDevice: TaskFn = async (page) => {
  await expect(page.getByText("当前").first()).toBeVisible()

  // 找到标记为"当前"的会话行
  const currentBadge = page.getByText("当前").first()
  const sessionRow = currentBadge.locator("xpath=ancestor::div[contains(@class, 'border')]")

  // 当前设备不应有"踢出"按钮
  await expect(sessionRow.getByRole("button", { name: "踢出" })).not.toBeVisible()
}

/**
 * 退出所有其他设备。
 */
export const revokeAllOthers: TaskFn = async (page) => {
  await expect(page.getByText("当前").first()).toBeVisible()

  // 如果有"退出所有其他设备"按钮则点击
  const revokeAllBtn = page.getByRole("button", { name: /退出所有其他设备/ })
  if (await revokeAllBtn.isVisible().catch(() => false)) {
    await revokeAllBtn.click()
    await expect(page.getByText("已踢出所有其他设备")).toBeVisible()
  }
}
