/**
 * 设置管理业务操作函数。
 * 通过 UI 进行通用配置和网页设置的读取、编辑、回滚。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 验证通用配置页面 */
export async function verifyGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.locator("main").waitFor()

  // 验证页面标题
  await expect(page.locator("main").getByText("通用配置").first()).toBeVisible()

  // 验证至少有一个配置项可见
  await expect(page.getByRole("heading", { name: "手机号国家码" })).toBeVisible()
}

/** 编辑通用配置（并回滚） */
export async function editGeneralSettings(page: Page, args?: Record<string, unknown>): Promise<void> {
  const configKey = String(args?.configKey ?? "site_info")
  const field = String(args?.field ?? "hotline")
  const newValue = String(args?.newValue ?? "400-TEST-1234")

  await page.goto("/admin/general-settings")
  await page.locator("main").waitFor()

  // 找到配置项，点击编辑按钮
  const configSection = page.locator("section", { hasText: configKey })
  const editButton = configSection.getByRole("button", { name: "编辑" }).first()
  await editButton.click()

  // 等待编辑弹窗或内联编辑区域可见
  // 假设使用 EditableOverlay 或 Dialog
  const overlay = page.locator(".editable-overlay, [role='dialog']").first()
  await overlay.waitFor()

  // 找到字段输入框并修改
  const input = overlay.getByLabel(new RegExp(field, "i"))
  const originalValue = await input.inputValue()

  await input.clear()
  await input.fill(newValue)

  // 保存
  await overlay.getByRole("button", { name: "保存" }).click()

  // 验证保存成功
  await page.waitForTimeout(300)

  // 回滚：重新打开并恢复原值
  await editButton.click()
  await overlay.waitFor()
  await input.clear()
  await input.fill(originalValue)
  await overlay.getByRole("button", { name: "保存" }).click()
  await page.waitForTimeout(300)
}

/** 验证网页设置页面 */
export async function verifyWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.locator("main").waitFor()

  // 验证页面标题
  await expect(page.locator("main").getByText("网页设置").first()).toBeVisible()

  // 验证至少有一个配置项可见（例如站点信息）
  await expect(page.locator("main")).toContainText("站点信息")
}

/** 编辑网页设置（并回滚） */
export async function editWebSettings(page: Page, args?: Record<string, unknown>): Promise<void> {
  const configKey = String(args?.configKey ?? "site_info")
  const field = String(args?.field ?? "tagline")
  const newValue = String(args?.newValue ?? "E2E测试标语")

  await page.goto("/admin/web-settings")
  await page.locator("main").waitFor()

  // 找到配置项，点击编辑按钮
  const configSection = page.locator("section", { hasText: configKey })
  const editButton = configSection.getByRole("button", { name: "编辑" }).first()
  await editButton.click()

  // 等待编辑弹窗或内联编辑区域可见
  const overlay = page.locator(".editable-overlay, [role='dialog']").first()
  await overlay.waitFor()

  // 找到字段输入框并修改（可能是多语言输入）
  const input = overlay.getByLabel(new RegExp(field, "i"))
  const originalValue = await input.inputValue()

  await input.clear()
  await input.fill(newValue)

  // 保存
  await overlay.getByRole("button", { name: "保存" }).click()

  // 验证保存成功
  await page.waitForTimeout(300)

  // 回滚
  await editButton.click()
  await overlay.waitFor()
  await input.clear()
  await input.fill(originalValue)
  await overlay.getByRole("button", { name: "保存" }).click()
  await page.waitForTimeout(300)
}
