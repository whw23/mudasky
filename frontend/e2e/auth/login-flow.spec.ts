/**
 * 登录流程 E2E 测试。
 * 覆盖弹窗打开/关闭、tab 切换、账号密码登录、空表单验证、保持登录 checkbox。
 */

import { test, expect } from "@playwright/test"

test.describe("登录流程", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("登录弹窗打开和关闭", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    /* 关闭弹窗 -- 按 Escape */
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 })
  })

  test("登录弹窗 tab 切换", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    /* 默认是手机验证码 tab */
    await expect(page.getByRole("tab", { name: /手机验证码/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: /账号密码/ })).toBeVisible()

    /* 切换到账号密码 */
    await page.getByRole("tab", { name: /账号密码/ }).click()
    const tabpanel = page.getByRole("tabpanel")
    await expect(tabpanel).toBeVisible({ timeout: 5_000 })
  })

  test("保持登录 checkbox 默认选中", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    const checkbox = page.getByRole("checkbox", { name: /保持登录/ })
    await expect(checkbox).toBeChecked()
  })

  test("空表单提交不关闭弹窗", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    await page.getByRole("tab", { name: /账号密码/ }).click()
    await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 5_000 })

    /* 不填写直接点登录 */
    await page.getByRole("tabpanel").getByRole("button", { name: /登录/ }).click()

    /* 弹窗应该还在 */
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("账号密码登录成功", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /登录/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 })

    /* 切到账号密码 tab */
    await page.getByRole("tab", { name: /账号密码/ }).click()
    await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 5_000 })

    /* 填写登录信息 */
    const dialog = page.getByRole("dialog")
    await dialog.locator("#login-account").fill("mudasky")
    await dialog.locator("#login-account-pwd").fill("mudasky@12321.")

    /* 点击登录 */
    await page.getByRole("tabpanel").getByRole("button", { name: /登录/ }).click()

    /* 弹窗应关闭 */
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 })

    /* 应显示用户名 */
    await expect(page.getByText("mudasky")).toBeVisible({ timeout: 10_000 })
  })
})
