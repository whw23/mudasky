/**
 * 认证流程业务操作函数。
 * 所有操作通过 UI 完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 通过 UI 确保未登录状态后打开登录弹窗 */
async function openLoginDialog(page: Page): Promise<void> {
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 等待 header 中任一按钮出现（"登录/注册" 或 "退出"）
  const loginBtn = page.getByRole("button", { name: /登录/ })
  const logoutBtn = page.getByRole("button", { name: "退出" })
  await loginBtn.or(logoutBtn).first().waitFor({ state: "visible", timeout: 15_000 })

  // 如果已登录，先通过 UI 退出
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await loginBtn.waitFor({ state: "visible", timeout: 15_000 })
  }

  await loginBtn.click()
  await page.getByRole("dialog").waitFor({ state: "visible" })
}

/**
 * 测试登录弹窗打开。
 */
export const testLoginDialog: TaskFn = async (page) => {
  await openLoginDialog(page)
  const dialog = page.getByRole("dialog")

  // 验证 tab 切换
  const accountTab = page.getByRole("tab", { name: "账号密码" })
  await expect(accountTab).toBeVisible()
  await accountTab.click()
  await page.getByRole("tabpanel").waitFor()

  const smsTab = page.getByRole("tab", { name: "手机验证码" })
  await expect(smsTab).toBeVisible()
  await smsTab.click()
  await page.getByRole("tabpanel").waitFor()

  // 关闭弹窗
  await dialog.getByRole("button", { name: "Close" }).click()
}

/**
 * 测试账号密码登录成功。
 * args.username: 用户名
 * args.password: 密码
 */
export const testLoginSuccess: TaskFn = async (page, args) => {
  const username = args?.username as string
  const password = args?.password as string

  await openLoginDialog(page)

  // 切换到账号密码 tab
  await page.getByRole("tab", { name: "账号密码" }).click()

  // 填写用户名和密码
  await page.getByPlaceholder("用户名或手机号").fill(username)
  await page.getByPlaceholder("请输入密码").fill(password)

  // 点击登录
  await page.getByRole("dialog").getByRole("button", { name: "登录" }).click()

  // 弹窗应该关闭
  await page.getByRole("dialog").waitFor({ state: "hidden" })

  // 登录后 header 应有退出按钮
  await expect(page.getByRole("button", { name: "退出" })).toBeVisible()
}

/**
 * 测试登出流程。
 */
export const testLogoutFlow: TaskFn = async (page) => {
  // 导航到首页
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 点击退出按钮
  await page.getByRole("button", { name: "退出" }).click()

  // 登出后登录按钮应重新出现
  await expect(page.getByRole("button", { name: /登录/ })).toBeVisible()
}

/**
 * 测试错误密码显示错误信息。
 * args.username: 用户名
 * args.password: 错误密码
 */
export const testWrongPassword: TaskFn = async (page, args) => {
  const username = args?.username as string
  const password = args?.password as string || "wrong-password-12345"

  await openLoginDialog(page)

  // 切换到账号密码 tab
  await page.getByRole("tab", { name: "账号密码" }).click()

  // 填写用户名和错误密码
  await page.getByPlaceholder("用户名或手机号").fill(username)
  await page.getByPlaceholder("请输入密码").fill(password)

  // 点击登录
  await page.getByRole("dialog").getByRole("button", { name: "登录" }).click()

  // 应显示错误信息（弹窗不关闭）
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 错误提示应该出现
  await expect(dialog.locator("[role='alert'], .text-destructive")).toBeVisible({ timeout: 10_000 })
}
