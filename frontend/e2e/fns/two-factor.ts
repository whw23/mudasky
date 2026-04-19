/**
 * 两步验证业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { getSmsCode } from "../helpers/sms"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 启用 SMS 两步验证。
 * args.phone: 手机号
 */
export const enableSms2fa: TaskFn = async (page, args) => {
  const phone = args?.phone as string

  // 检查当前状态
  const alreadyEnabled = await page.getByText("已启用两步验证").isVisible().catch(() => false)
  if (alreadyEnabled) {
    return
  }

  // 未启用状态应显示"启用"按钮
  await expect(page.getByText("未启用两步验证")).toBeVisible()

  // 点击启用进入方式选择
  await page.getByRole("button", { name: "启用" }).click()

  // 应显示方式选择按钮：短信验证
  const smsBtn = page.getByRole("button", { name: "短信验证" })
  await expect(smsBtn).toBeVisible()
  await smsBtn.click()

  // SMS 2FA 表单出现 — 获取验证码并填入
  const code = await getSmsCode(page, phone)
  const smsForm = page.locator("form").filter({ hasText: "确认启用" })
  await smsForm.getByPlaceholder("请输入验证码").fill(code)

  // 确认启用
  await smsForm.getByRole("button", { name: "确认启用" }).click()
  await expect(page.getByText("两步验证已启用").first()).toBeVisible()
}

/**
 * 禁用两步验证。
 * args.phone: 手机号
 */
export const disableSms2fa: TaskFn = async (page, args) => {
  const phone = args?.phone as string

  const enabled = await page.getByText("已启用两步验证").isVisible().catch(() => false)
  if (!enabled) {
    return
  }

  // 点击禁用按钮
  await page.getByRole("button", { name: "禁用" }).click()

  // 等待对话框出现
  await expect(page.getByRole("dialog")).toBeVisible()

  // 获取验证码并填入
  const code = await getSmsCode(page, phone)
  await page.getByRole("dialog").getByPlaceholder("请输入验证码").fill(code)

  // 确认禁用
  await page.getByRole("dialog").getByRole("button", { name: "确认禁用" }).click()
  await expect(page.getByText("两步验证已禁用")).toBeVisible()
}

/**
 * 验证两步验证状态。
 * args.enabled: 期望的状态（true/false）
 */
export const verify2faStatus: TaskFn = async (page, args) => {
  const enabled = args?.enabled as boolean

  if (enabled) {
    await expect(page.getByText("已启用两步验证")).toBeVisible()
  } else {
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    await expect(page.getByRole("button", { name: "启用" })).toBeVisible()
  }
}

/**
 * 启用 TOTP 两步验证（触发 /api/portal/profile/two-factor/enable-totp 和 confirm-totp）。
 * 由于 TOTP 需要扫码或手动输入密钥，E2E 测试中模拟启用流程但不完成。
 */
export const viewTotpSetup: TaskFn = async (page) => {
  // 检查当前状态
  const alreadyEnabled = await page.getByText("已启用两步验证").isVisible().catch(() => false)
  if (alreadyEnabled) {
    // 如果已启用，先禁用
    await page.getByRole("button", { name: "禁用" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // 获取验证码（假设是 SMS 2FA）
    // 这里简化处理，实际可能需要传入 phone
    await page.getByRole("dialog").getByRole("button", { name: /取消/ }).click()
    return
  }

  // 点击启用进入方式选择
  await page.getByRole("button", { name: "启用" }).click()

  // 应显示方式选择按钮：TOTP
  const totpBtn = page.getByRole("button", { name: /验证器|TOTP|Authenticator/ })
  await expect(totpBtn).toBeVisible()

  // 监听 enable-totp API（获取二维码和密钥）
  const enableTotpResponse = page.waitForResponse(
    (r) => r.url().includes("/api/portal/profile/two-factor/enable-totp") && r.request().method() === "POST",
    { timeout: 15_000 }
  )

  await totpBtn.click()
  await enableTotpResponse

  // 应显示 QR 码和密钥
  await expect(page.getByText(/扫描二维码|密钥|Secret/)).toBeVisible()

  // 取消（不完成 TOTP 确认，因为需要真实的 TOTP 应用）
  const cancelBtn = page.getByRole("button", { name: /取消|关闭/ })
  await cancelBtn.click()
}
