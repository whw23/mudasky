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

    const res = await page.request.post("/api/auth/login", {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: { phone: PHONE, code },
    })
    expect(res.status()).toBe(200)
    const result = { data: await res.json() }

    await page.context().storageState({ path: W3_AUTH })
    emit("w3_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })
  })
})
