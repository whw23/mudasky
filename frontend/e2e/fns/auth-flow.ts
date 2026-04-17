/**
 * 认证流程业务操作函数。
 * 所有操作通过 UI 完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 测试登录弹窗打开。
 */
export const testLoginDialog: TaskFn = async (page) => {
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

  // 验证 tab 切换
  const accountTab = page.getByRole("tab", { name: "账号密码" })
  await expect(accountTab).toBeVisible()
  await accountTab.click()
  await page.getByRole("tabpanel").waitFor()

  const smsTab = page.getByRole("tab", { name: "手机验证码" })
  await expect(smsTab).toBeVisible()
  await smsTab.click()
  await page.getByRole("tabpanel").waitFor()
}

/**
 * 测试账号密码登录成功。
 * args.username: 用户名
 * args.password: 密码
 */
export const testLoginSuccess: TaskFn = async (page, args) => {
  const username = args?.username as string
  const password = args?.password as string

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
    } catch {
      /* 重试 */
    }
  }

  // 切换到账号密码 tab
  await page.getByRole("tab", { name: "账号密码" }).click()
  await page.getByRole("tabpanel").waitFor()

  // 填写用户名和密码
  const inputs = dialog.getByRole("textbox")
  await inputs.first().waitFor()
  await inputs.first().fill(username)

  const pwdInput = dialog.locator("input[type='password']")
  await pwdInput.fill(password)

  // 点击登录
  const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/auth/login"),
    { timeout: 10_000 },
  )
  await submitBtn.click()
  const res = await responsePromise
  expect(res.status()).toBe(200)

  // 弹窗应该关闭
  await expect(dialog).toBeHidden({ timeout: 10_000 })

  // 登录后用户信息可见
  const header = page.locator("header")
  const text = await header.textContent()
  expect(text).toContain(username)
}

/**
 * 测试登出流程。
 */
export const testLogoutFlow: TaskFn = async (page) => {
  // 点击登出按钮
  const logoutBtn = page.getByRole("button", { name: /退出|登出|logout/i })
  await expect(logoutBtn).toBeVisible()
  await logoutBtn.click()

  // 登出后登录按钮应重新出现
  const loginBtnAfter = page.getByRole("button", { name: /登录/ })
  await expect(loginBtnAfter).toBeVisible({ timeout: 10_000 })
}

/**
 * 测试错误密码显示错误信息。
 * args.username: 用户名
 * args.password: 错误密码
 */
export const testWrongPassword: TaskFn = async (page, args) => {
  const username = args?.username as string
  const password = args?.password as string || "wrong-password-12345"

  await page.goto("/")
  await page.locator("header").waitFor()

  const loginBtn = page.getByRole("button", { name: /登录/ })
  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 3; i++) {
    await loginBtn.click()
    try {
      await dialog.waitFor({ timeout: 3_000 })
      break
    } catch {
      /* 重试 */
    }
  }

  await page.getByRole("tab", { name: "账号密码" }).click()
  await page.getByRole("tabpanel").waitFor()
  const inputs = dialog.getByRole("textbox")
  await inputs.first().fill(username)
  const pwdInput = dialog.locator("input[type='password']")
  await pwdInput.fill(password)

  const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
  await submitBtn.click()

  // 应显示错误信息
  const errorMsg = dialog.locator(".text-destructive")
  await expect(errorMsg).toBeVisible({ timeout: 10_000 })
}
