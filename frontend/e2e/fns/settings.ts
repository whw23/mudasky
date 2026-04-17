/**
 * 设置管理业务操作函数。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 验证通用配置页面 */
export async function verifyGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "通用配置" }).waitFor({ timeout: 15_000 })
}

/** 编辑通用配置 */
export async function editGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "通用配置" }).waitFor({ timeout: 15_000 })
}

/** 验证网页设置页面 */
export async function verifyWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })
}

/** 编辑网页设置（点击可编辑区域，修改后回滚） */
export async function editWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })

  // 点击第一个 cursor-pointer 可编辑区域（品牌名称）
  const editArea = page.locator("main [class*='cursor-pointer']").first()
  await editArea.waitFor()
  await editArea.click()

  // 等待弹窗
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })

  // 找到第一个必填输入框
  const input = dialog.locator("input, textarea").first()
  await input.waitFor()
  const original = await input.inputValue()

  // 修改
  await input.clear()
  await input.fill("E2E-edit-test")

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 回滚
  await editArea.click()
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  const input2 = dialog.locator("input, textarea").first()
  await input2.waitFor()
  await input2.clear()
  await input2.fill(original)
  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
}
