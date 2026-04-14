/**
 * E2E 测试辅助：获取 DEBUG 模式下的短信验证码。
 */

import type { Page } from "@playwright/test"

/**
 * 发送短信验证码并返回验证码（仅 DEBUG 模式）。
 */
export async function getSmsCode(page: Page, phone: string): Promise<string> {
  const result = await page.evaluate(async (ph) => {
    const res = await fetch("/api/auth/sms-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ phone: ph }),
      credentials: "include",
    })
    const data = await res.json()
    return data.code as string
  }, phone)
  return result
}
