/**
 * API 错误码国际化 E2E 测试。
 * 验证 API 错误消息通过前端翻译显示。
 */

import { test, expect } from "@playwright/test"

/* 清除认证状态，使用未登录的浏览器 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("错误码国际化", () => {
  test("登录错误密码显示翻译后的错误消息", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 60_000 })

    /* 等待 Next.js dev 编译完成 */
    await page
      .waitForFunction(
        () => !document.body.textContent?.includes("Compiling"),
        { timeout: 60_000 },
      )
      .catch(() => {})
    await page.waitForLoadState("networkidle")

    /* 点击登录按钮 */
    const loginBtn = page.getByRole("button", { name: /登录/ })
    await loginBtn.waitFor({ timeout: 30_000 })
    await page.waitForTimeout(2000)
    await loginBtn.click()

    /* 等待弹窗出现 */
    const dialog = page.getByRole("dialog")
    await dialog.waitFor({ timeout: 15_000 })

    /* 切换到账号密码 tab */
    await page.getByRole("tab", { name: "账号密码" }).click()
    await page.waitForTimeout(1000)

    /* 填写错误的登录凭据 */
    const accountInput = dialog.getByPlaceholder("用户名或手机号")
    await accountInput.waitFor({ timeout: 10_000 })
    await accountInput.fill("mudasky")

    const passwordInput = dialog.locator('input[type="password"]')
    await passwordInput.fill("wrong_password_12345")

    /* 提交表单 */
    await page
      .getByRole("tabpanel")
      .getByRole("button", { name: "登录" })
      .click()

    /* 验证错误消息显示（翻译后的 PASSWORD_INCORRECT） */
    await expect(dialog.getByText("密码不正确")).toBeVisible({
      timeout: 10_000,
    })
  })
})
