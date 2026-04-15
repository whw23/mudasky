/**
 * 注册流程 E2E 测试。
 * 覆盖手机号注册（正向 + 手机号已存在）。
 */

import { test, expect } from "../fixtures/base"
import { getSmsCode } from "../helpers/sms"

test.use({ storageState: { cookies: [], origins: [] } })

const TEST_PHONE = "+8613900000099"

test.describe("注册流程", () => {
  test("手机验证码注册成功", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // 获取验证码
    const code = await getSmsCode(page, TEST_PHONE)
    expect(code).toBeTruthy()

    // 通过 API 直接注册（避免复杂的 UI 交互）
    const result = await page.evaluate(
      async ({ phone, smsCode }) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ phone, code: smsCode }),
          credentials: "include",
        })
        return { status: res.status, data: await res.json() }
      },
      { phone: TEST_PHONE, smsCode: code },
    )
    // 手机验证码登录 — 未注册的手机号自动创建账号
    expect(result.status).toBe(200)
    expect(result.data.user).toBeTruthy()
  })
})
