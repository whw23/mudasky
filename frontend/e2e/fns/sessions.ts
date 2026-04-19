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
  await page.goto("/portal/profile")

  // 登录设备区域在 profile 页面底部，滚动到可见
  const sessionsHeading = page.getByText("登录设备")
  await sessionsHeading.scrollIntoViewIfNeeded()
  await expect(sessionsHeading).toBeVisible()
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
 * 踢出单个设备（触发 /api/portal/profile/sessions/list/revoke）。
 */
export const revokeSingleSession: TaskFn = async (page) => {
  await page.goto("/portal/profile")

  // 滚动到登录设备区域
  const sessionsHeading = page.getByText("登录设备")
  await sessionsHeading.scrollIntoViewIfNeeded()
  await expect(sessionsHeading).toBeVisible()

  // 找到第一个非当前设备的踢出按钮
  const kickBtns = page.getByRole("button", { name: "踢出" })
  const count = await kickBtns.count()

  if (count > 0) {
    // 监听 API 响应
    const revokeResponse = page.waitForResponse(
      (r) => r.url().includes("/api/portal/profile/sessions/list/revoke") && r.request().method() === "POST",
      { timeout: 15_000 }
    )

    await kickBtns.first().click()
    await revokeResponse

    await expect(page.getByText("设备已踢出")).toBeVisible()
  }
}

/**
 * 退出所有其他设备（触发 /api/portal/profile/sessions/list/revoke-all）。
 */
export const revokeAllOthers: TaskFn = async (page) => {
  await page.goto("/portal/profile")

  // 滚动到登录设备区域
  const sessionsHeading = page.getByText("登录设备")
  await sessionsHeading.scrollIntoViewIfNeeded()
  await expect(sessionsHeading).toBeVisible()

  // 如果有"退出所有其他设备"按钮则点击
  const revokeAllBtn = page.getByRole("button", { name: /退出所有其他设备/ })
  if (await revokeAllBtn.isVisible().catch(() => false)) {
    // 监听 API 响应
    const revokeAllResponse = page.waitForResponse(
      (r) => r.url().includes("/api/portal/profile/sessions/list/revoke-all") && r.request().method() === "POST",
      { timeout: 15_000 }
    )

    await revokeAllBtn.click()
    await revokeAllResponse

    await expect(page.getByText("已踢出所有其他设备")).toBeVisible()
  }
}
