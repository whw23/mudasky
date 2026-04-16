/**
 * 共享认证流程测试。
 * 使用独立浏览器上下文（无预存 auth），测试登录弹窗、tab 切换、登出。
 */

import { test, expect, trackComponent } from "../fixtures/base"

const ADMIN_USER = process.env.SEED_USER_E2E_USERNAME!
const ADMIN_PASS = process.env.SEED_USER_E2E_PASSWORD!

test.describe("认证流程", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("首页登录按钮可见", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    // 未登录时应显示登录/注册按钮
    const loginBtn = page.getByRole("button", { name: /登录/ })
    await expect(loginBtn).toBeVisible()
    trackComponent("LoginModal", "登录按钮")
  })

  test("点击登录弹出对话框", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    const loginBtn = page.getByRole("button", { name: /登录/ })
    await loginBtn.waitFor()

    // 重试点击（处理水合延迟）
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch {
        /* 水合未完成，重试 */
      }
    }
    await expect(dialog).toBeVisible()
  })

  test("Tab 切换：手机验证码和账号密码", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    // 打开登录弹窗
    const loginBtn = page.getByRole("button", { name: /登录/ })
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch { /* 重试 */ }
    }

    // 切换到账号密码 tab
    const accountTab = page.getByRole("tab", { name: "账号密码" })
    await expect(accountTab).toBeVisible()
    await accountTab.click()
    await page.getByRole("tabpanel").waitFor()

    // 切换回手机验证码 tab
    const smsTab = page.getByRole("tab", { name: "手机验证码" })
    await expect(smsTab).toBeVisible()
    await smsTab.click()
    await page.getByRole("tabpanel").waitFor()

    trackComponent("LoginModal", "tab切换")
  })

  test("关闭登录弹窗", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    const loginBtn = page.getByRole("button", { name: /登录/ })
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch { /* 重试 */ }
    }

    // 按 Escape 关闭
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    trackComponent("LoginModal", "关闭按钮")
  })

  test("账号密码登录成功", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    // 打开登录弹窗
    const loginBtn = page.getByRole("button", { name: /登录/ })
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch { /* 重试 */ }
    }

    // 切换到账号密码 tab
    await page.getByRole("tab", { name: "账号密码" }).click()
    await page.getByRole("tabpanel").waitFor()

    // 填写用户名和密码
    const inputs = dialog.getByRole("textbox")
    await inputs.first().waitFor()
    await inputs.first().fill(ADMIN_USER)

    // 密码输入框（type=password，不是 textbox role）
    const pwdInput = dialog.locator("input[type='password']")
    await pwdInput.fill(ADMIN_PASS)

    trackComponent("LoginModal", "用户名输入")
    trackComponent("LoginModal", "密码输入")

    // 点击登录
    const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login"),
      { timeout: 10_000 },
    )
    await submitBtn.click()
    const res = await responsePromise
    expect(res.status()).toBe(200)

    trackComponent("LoginModal", "登录提交")

    // 弹窗应该关闭
    await expect(dialog).toBeHidden({ timeout: 10_000 })
  })

  test("登录后用户信息可见", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    // 先登录
    const loginBtn = page.getByRole("button", { name: /登录/ })
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch { /* 重试 */ }
    }

    await page.getByRole("tab", { name: "账号密码" }).click()
    await page.getByRole("tabpanel").waitFor()
    const inputs = dialog.getByRole("textbox")
    await inputs.first().fill(ADMIN_USER)
    const pwdInput = dialog.locator("input[type='password']")
    await pwdInput.fill(ADMIN_PASS)

    const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
    await submitBtn.click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // 登录后 header 应显示用户名或手机号
    const header = page.locator("header")
    const text = await header.textContent()
    expect(text).toContain(ADMIN_USER)
  })

  test("登出后登录按钮重新出现", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    // 先登录
    const loginBtn = page.getByRole("button", { name: /登录/ })
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch { /* 重试 */ }
    }

    await page.getByRole("tab", { name: "账号密码" }).click()
    await page.getByRole("tabpanel").waitFor()
    const inputs = dialog.getByRole("textbox")
    await inputs.first().fill(ADMIN_USER)
    const pwdInput = dialog.locator("input[type='password']")
    await pwdInput.fill(ADMIN_PASS)

    const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
    await submitBtn.click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // 点击登出按钮
    const logoutBtn = page.getByRole("button", { name: /退出|登出|logout/i })
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    // 登出后登录按钮应重新出现
    const loginBtnAfter = page.getByRole("button", { name: /登录/ })
    await expect(loginBtnAfter).toBeVisible({ timeout: 10_000 })
  })

  test("负向：错误密码显示错误信息", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").waitFor()

    const loginBtn = page.getByRole("button", { name: /登录/ })
    const dialog = page.getByRole("dialog")
    for (let i = 0; i < 3; i++) {
      await loginBtn.click()
      try {
        await dialog.waitFor({ timeout: 3_000 })
        break
      } catch { /* 重试 */ }
    }

    await page.getByRole("tab", { name: "账号密码" }).click()
    await page.getByRole("tabpanel").waitFor()
    const inputs = dialog.getByRole("textbox")
    await inputs.first().fill(ADMIN_USER)
    const pwdInput = dialog.locator("input[type='password']")
    await pwdInput.fill("wrong-password-12345")

    const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
    await submitBtn.click()

    // 应显示错误信息
    const errorMsg = dialog.locator(".text-destructive")
    await expect(errorMsg).toBeVisible({ timeout: 10_000 })
  })
})
