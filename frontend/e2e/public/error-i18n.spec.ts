/**
 * API 错误码国际化 E2E 测试。
 * 验证 API 错误消息通过前端翻译显示。
 */

import { test, expect } from "../fixtures/base"

/* 清除认证状态，使用未登录的浏览器 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("错误码国际化", () => {
  test("登录错误密码显示翻译后的错误消息", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" })

    /* 等待 Next.js dev 编译完成 */
    await page
      .waitForFunction(
        () => !document.body.textContent?.includes("Compiling"),
      )
      .catch(() => {})
    await page.waitForLoadState("networkidle")

    /* 点击登录按钮 */
    const loginBtn = page.getByRole("button", { name: /登录/ })
    await loginBtn.waitFor()
    await loginBtn.click()

    /* 等待弹窗出现 */
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()

    /* 切换到账号密码 tab */
    await page.getByRole("tab", { name: "账号密码" }).click()
    await expect(page.getByRole("tabpanel")).toBeVisible()

    /* 填写错误的登录凭据 */
    const accountInput = dialog.getByPlaceholder("用户名或手机号")
    await accountInput.waitFor()
    await accountInput.fill("mudasky")

    const passwordInput = dialog.locator('input[type="password"]')
    await passwordInput.fill("wrong_password_12345")

    /* 提交表单 */
    await page
      .getByRole("tabpanel")
      .getByRole("button", { name: "登录" })
      .click()

    /* 验证错误消息显示（翻译后的 PASSWORD_INCORRECT） */
    await expect(dialog.getByText("密码不正确")).toBeVisible()
  })
})
