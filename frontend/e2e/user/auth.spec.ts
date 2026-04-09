/**
 * 认证流程 E2E 测试。
 */

import { test, expect } from "@playwright/test"

test.describe("登录流程", () => {
  test("管理员登录成功后跳转到后台", async ({ page }) => {
    await page.goto("/")
    await page.getByText("登录").click()
    await page.locator('input[name="phone"]').fill("mudasky")
    await page.locator('input[type="password"]').fill("mudasky@12321.")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/admin/**")
    await expect(page).toHaveURL(/admin/)
  })
})
