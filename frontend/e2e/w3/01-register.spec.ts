/**
 * W3 注册测试。
 * 注册 → 发信号 → 等待 W1 赋权 → refresh token → 保存新 storageState。
 */

import { test, expect } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W3_AUTH = path.join(__dirname, "..", ".auth", "w3.json")
const PHONE = `+861390001${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-advisor-${Date.now()}`

test.describe("W3 注册", () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.setTimeout(120_000)

  test("自注册并等待赋权", async ({ page }) => {
    await page.goto("/")
    const code = await getSmsCode(page, PHONE)
    expect(code).toBeTruthy()

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

    emit("w3_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })

    // 等待 W1 赋权
    await waitFor("w3_advisor", 90_000)

    // refresh token 获取新权限
    await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })

    // 保存含新权限的 storageState
    await page.context().storageState({ path: W3_AUTH })
  })
})
