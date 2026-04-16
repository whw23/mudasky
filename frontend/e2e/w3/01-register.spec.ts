/**
 * W3 注册。
 * 注册新账号并保存 storageState。
 */

import { test, expect } from "../fixtures/base"
import { emit } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W3_AUTH = path.join(__dirname, "..", ".auth", "w3.json")
const PHONE = `+86-1390001${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-advisor-${Date.now()}`

test.describe("W3 注册", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("自注册", async ({ page }) => {
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

    await page.context().storageState({ path: W3_AUTH })
    emit("w3_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })
  })
})
