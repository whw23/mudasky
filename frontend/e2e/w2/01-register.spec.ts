/**
 * W2 注册测试。
 * 注册新账号，保存 storageState，等待 W1 赋予 student 角色后刷新 token。
 */

import { test, expect } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W2_AUTH = path.join(__dirname, "..", ".auth", "w2.json")
const PHONE = `+861390000${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-student-${Date.now()}`

test.describe("W2 注册", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("自注册并等待赋权", async ({ page }) => {
    await page.goto("/")
    const code = await getSmsCode(page, PHONE)
    expect(code).toBeTruthy()

    // SMS 登录（未注册手机号自动创建账号）
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
      { phone: PHONE, smsCode: code },
    )
    expect(result.status).toBe(200)
    expect(result.data.user).toBeTruthy()

    await page.context().storageState({ path: W2_AUTH })
    emit("w2_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })

    // 等待 W1 赋权
    await waitFor("w2_student", 60_000)

    // refresh token 获取新权限
    const refreshRes = await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(refreshRes.status()).toBe(200)

    // 重新保存 storageState
    await page.context().storageState({ path: W2_AUTH })
  })
})
