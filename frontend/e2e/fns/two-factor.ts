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
