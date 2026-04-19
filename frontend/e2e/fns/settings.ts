/**
 * 设置管理业务操作函数。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 验证通用配置页面 */
export async function verifyGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.getByRole("heading", { name: "通用配置" }).waitFor({ timeout: 15_000 })
}

/** 编辑通用配置（修改手机号国家码后回滚） */
export async function editGeneralSettings(page: Page): Promise<void> {
  await page.goto("/admin/general-settings")
  await page.getByRole("heading", { name: "通用配置" }).waitFor({ timeout: 15_000 })

  // 获取表格中第二行（美国 +1）的启用状态
  const table = page.locator("main table, main [role='table']").first()
  await table.waitFor()

  // 找到美国行的 checkbox（第二个 checkbox）
  const usCheckbox = table.locator("input[type='checkbox']").nth(1)
  await usCheckbox.waitFor()
  const originalChecked = await usCheckbox.isChecked()

  // 切换美国行的启用状态
  await usCheckbox.click()

  // 点击保存按钮
  const saveBtn = page.getByRole("button", { name: "保存" })
  await saveBtn.waitFor()

  // 等待保存 API 响应
  const saveResponse = page.waitForResponse(
    (resp) => resp.url().includes("/api/admin/general-settings/list/edit") && resp.status() === 200,
    { timeout: 10_000 }
  )
  await saveBtn.click()
  await saveResponse

  // 立即回滚：切换回原始状态
  await usCheckbox.click()

  // 再次保存
  const rollbackResponse = page.waitForResponse(
    (resp) => resp.url().includes("/api/admin/general-settings/list/edit") && resp.status() === 200,
    { timeout: 10_000 }
  )
  await saveBtn.click()
  await rollbackResponse

  // 验证回滚成功（reload 后检查状态）
  await page.reload()
  await table.waitFor()
  const finalCheckbox = table.locator("input[type='checkbox']").nth(1)
  await finalCheckbox.waitFor()
  const finalChecked = await finalCheckbox.isChecked()
  await expect(finalChecked).toBe(originalChecked)
}

/** 验证网页设置页面 */
export async function verifyWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })
}

/** 编辑网页设置（修改品牌名称后回滚） */
export async function editWebSettings(page: Page): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 15_000 })

  // 点击品牌区域打开编辑弹窗
  const editArea = page.locator("main [class*='cursor-pointer']").first()
  await editArea.waitFor()
  await editArea.click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })

  // 读取原始值
  const input = dialog.getByPlaceholder(/必填/)
  await input.waitFor()
  const original = await input.inputValue()

  // 修改并保存
  await input.clear()
  await input.fill(`E2E-${Date.now()}`)
  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 立即回滚：重新打开同一区域
  await editArea.click()
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  const input2 = dialog.getByPlaceholder(/必填/)
  await input2.waitFor()
  await input2.clear()
  await input2.fill(original)
  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 验证回滚成功
  await page.reload()
  await expect(page.locator("main").getByText(original).first()).toBeVisible({ timeout: 10_000 })
}
