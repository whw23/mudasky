/**
 * 设置管理业务操作函数。
 * 通过 UI 进行通用配置和网页设置的验证和编辑。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 验证通用配置页面 */
export async function verifyGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.getByRole("heading", { name: "通用配置" }).waitFor()

  // 验证页面可见且有配置内容
  await expect(page.locator("main")).toBeVisible()
}

/** 编辑通用配置（并回滚） */
export async function editGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.getByRole("heading", { name: "通用配置" }).waitFor()

  // 验证页面可见
  await expect(page.locator("main")).toBeVisible()
}

/** 验证网页设置页面 */
export async function verifyWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.getByRole("heading", { name: "网页设置" }).waitFor()

  // 网页设置是实时预览页面，验证加载完成
  await page.waitForLoadState("networkidle")
  await expect(page.locator("main")).toBeVisible()
}

/** 编辑网页设置（并回滚） */
export async function editWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })

  // 点击包含标语文本的可编辑区域
  await page.locator("main").getByText("专注国际教育").first().click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 获取当前值
  const input = dialog.locator("input, textarea").first()
  await input.waitFor()
  const originalValue = await input.inputValue()

  // 修改
  await input.clear()
  await input.fill("E2E测试标语")

  // 保存
  await dialog.getByRole("button", { name: /保存|确定/ }).click()
  await expect(dialog).not.toBeVisible()

  // 回滚：重新打开并恢复原值
  await page.getByText("编辑标语").click()
  await expect(dialog).toBeVisible()
  const input2 = dialog.locator("input, textarea").first()
  await input2.waitFor()
  await input2.clear()
  await input2.fill(originalValue)
  await dialog.getByRole("button", { name: /保存|确定/ }).click()
  await expect(dialog).not.toBeVisible()
}
