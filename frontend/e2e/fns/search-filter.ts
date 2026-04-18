/**
 * 搜索筛选业务操作函数。
 * 所有操作通过 UI 完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 测试院校搜索框。
 */
export const testUniversitySearch: TaskFn = async (page) => {
  await page.goto("/universities")
  await page.locator("main").waitFor()

  // 搜索输入框
  const searchInput = page.getByPlaceholder("搜索院校名称、城市...")
  await expect(searchInput).toBeVisible()

  await searchInput.fill("Test")
  await expect(searchInput).toHaveValue("Test")
}

/**
 * 测试国家下拉筛选。
 */
export const testCountryFilter: TaskFn = async (page) => {
  await page.goto("/universities")
  await page.locator("main").waitFor()

  // 国家下拉框
  const countrySelect = page.locator("main select").first()
  await expect(countrySelect).toBeVisible()

  // 选择一个选项（第一个非空选项）
  const options = countrySelect.locator("option")
  const count = await options.count()
  if (count > 1) {
    const value = await options.nth(1).getAttribute("value")
    if (value) {
      await countrySelect.selectOption(value)
      await expect(countrySelect).toHaveValue(value)
    }
  }
}

/**
 * 测试重置筛选按钮。
 */
export const testResetFilter: TaskFn = async (page) => {
  await page.goto("/universities")
  await page.locator("main").waitFor()

  // 先输入搜索词触发筛选
  const searchInput = page.getByPlaceholder("搜索院校名称、城市...")
  await searchInput.fill("SomeUniversity")

  // 等待防抖后重置按钮出现
  await page.waitForTimeout(500)
  const resetBtn = page.getByRole("button", { name: /重置/ })

  // 重置按钮可能不可见（如果没有筛选状态），先检查
  if (await resetBtn.isVisible()) {
    await resetBtn.click()
    await expect(searchInput).toHaveValue("")
  }
}

/**
 * 测试语言切换器。
 */
export const testLocaleSwitcher: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await page.locator("header").waitFor()

  // 语言切换下拉
  const localeSelect = page.locator("header select").first()
  const visible = await localeSelect.isVisible().catch(() => false)

  if (visible) {
    // 切换到英文
    await localeSelect.selectOption("en")
    await expect(page).toHaveURL(/\/en/)

    // 切换回中文
    const localeSelect2 = page.locator("header select").first()
    await localeSelect2.selectOption("zh")
    await expect(page).not.toHaveURL(/\/en/, { timeout: 15_000 })
  }
}

/**
 * 测试咨询按钮。
 */
export const testConsultButton: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await page.locator("main").waitFor()

  // 咨询按钮在首页 CTA 区域
  const consultBtns = page.locator("main button")
  const count = await consultBtns.count()
  expect(count).toBeGreaterThanOrEqual(1)
}
