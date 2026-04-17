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
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "通用配置" }).waitFor({ timeout: 15_000 })
  await expect(page.locator("main")).toBeVisible()
}

/** 编辑通用配置（验证页面可交互） */
export async function editGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "通用配置" }).waitFor({ timeout: 15_000 })
  await expect(page.locator("main")).toBeVisible()
}

/** 验证网页设置页面 */
export async function verifyWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })
  await expect(page.locator("main")).toBeVisible()
}

/** 编辑网页设置（点击 Hero 区域编辑并回滚） */
export async function editWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })

  // 点击 Hero 区域（标题 【慕大国际教育】 所在的可点击区域）
  const heroArea = page.locator("main h1").first()
  await heroArea.click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 找到"标题"中文输入框
  const titleInput = dialog.getByPlaceholder("标题（必填）")
  await titleInput.waitFor()
  const originalValue = await titleInput.inputValue()

  // 修改
  await titleInput.clear()
  await titleInput.fill("E2E-标题测试")

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 回滚：重新点击 Hero 区域
  await page.locator("main h1").first().click()
  await expect(dialog).toBeVisible()

  const titleInput2 = dialog.getByPlaceholder("标题（必填）")
  await titleInput2.waitFor()
  await titleInput2.clear()
  await titleInput2.fill(originalValue)

  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
}
