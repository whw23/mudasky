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

  const searchInput = page.getByPlaceholder("搜索院校名称、城市...")
  await expect(searchInput).toBeVisible()

  await searchInput.fill("Test")
  await expect(searchInput).toHaveValue("Test")
}

/**
 * 测试国家下拉筛选（shadcn Select）。
 */
export const testCountryFilter: TaskFn = async (page) => {
  await page.goto("/universities")
  await page.locator("main").waitFor()

  // shadcn Select 的 trigger 是 combobox role
  const triggers = page.locator("main").getByRole("combobox")
  const countryTrigger = triggers.first()
  await expect(countryTrigger).toBeVisible()

  // 点击打开下拉
  await countryTrigger.click()

  // 等待选项出现，选择第一个非"全部"的选项
  const options = page.getByRole("option")
  const count = await options.count()
  if (count > 1) {
    await options.nth(1).click()
  } else {
    await page.keyboard.press("Escape")
  }
}

/**
 * 测试重置筛选按钮。
 */
export const testResetFilter: TaskFn = async (page) => {
  await page.goto("/universities")
  await page.locator("main").waitFor()

  const searchInput = page.getByPlaceholder("搜索院校名称、城市...")
  await searchInput.fill("SomeUniversity")

  await page.waitForTimeout(500)
  const resetBtn = page.getByRole("button", { name: /重置/ })

  if (await resetBtn.isVisible()) {
    await resetBtn.click()
    await expect(searchInput).toHaveValue("")
  }
}

/**
 * 测试语言切换器（shadcn Select）。
 */
export const testLocaleSwitcher: TaskFn = async (page) => {
  await page.goto("/")
  await page.locator("header").waitFor()

  // 语言切换器是 header 中的 combobox
  const localeSelect = page.locator("header").getByRole("combobox")
  const visible = await localeSelect.isVisible().catch(() => false)

  if (visible) {
    // 打开下拉 → 切换到英文
    await localeSelect.click()
    const enOption = page.getByRole("option", { name: "English" })
    await enOption.waitFor({ state: "visible", timeout: 5_000 })
    await enOption.click()
    await expect(page).toHaveURL(/\/en/)

    // 打开下拉 → 切换回中文
    const localeSelect2 = page.locator("header").getByRole("combobox")
    await localeSelect2.click()
    const zhOption = page.getByRole("option", { name: "中文" })
    await zhOption.waitFor({ state: "visible", timeout: 5_000 })
    await zhOption.click()
    await expect(page).not.toHaveURL(/\/en/, { timeout: 15_000 })
  }
}

/**
 * 测试咨询按钮。
 */
export const testConsultButton: TaskFn = async (page) => {
  await page.goto("/")
  await page.locator("main").waitFor()

  const consultBtns = page.locator("main button")
  const count = await consultBtns.count()
  expect(count).toBeGreaterThanOrEqual(1)
}
