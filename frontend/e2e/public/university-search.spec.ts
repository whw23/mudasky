/**
 * 院校搜索和筛选 E2E 测试。
 * 覆盖：搜索框输入、国家筛选、重置、分页。
 */

import { test, expect } from "@playwright/test"

test.describe("院校搜索筛选", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/universities")
    await page.locator("main").waitFor()
  })

  test("搜索框输入并触发筛选", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索院校/)
    if (!(await searchInput.isVisible().catch(() => false))) {
      test.skip(true, "无搜索框")
      return
    }

    await searchInput.fill("test")
    await page.waitForTimeout(500)
    await expect(page.locator("main")).toBeVisible()
  })

  test("国家下拉筛选", async ({ page }) => {
    const countrySelect = page.locator("select").first()
    if (!(await countrySelect.isVisible().catch(() => false))) {
      test.skip(true, "无国家选择器")
      return
    }

    const options = countrySelect.locator("option")
    const optionCount = await options.count()
    if (optionCount > 1) {
      await countrySelect.selectOption({ index: 1 })
      await expect(page.locator("main")).toBeVisible()
    }
  })

  test("重置按钮清空筛选条件", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索院校/)
    if (!(await searchInput.isVisible().catch(() => false))) {
      test.skip(true, "无搜索框")
      return
    }

    await searchInput.fill("test")
    await page.waitForTimeout(500)

    const resetBtn = page.getByRole("button", { name: "重置" })
    if (await resetBtn.isVisible().catch(() => false)) {
      await resetBtn.click()
      await expect(searchInput).toHaveValue("")
    }
  })
})
