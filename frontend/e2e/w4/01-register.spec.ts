/**
 * W4 注册。
 * 注册新账号并保存 storageState。W4 保持 visitor 角色。
 */

import { test, expect } from "../fixtures/base"
import { emit } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W4_AUTH = path.join(__dirname, "..", ".auth", "w4.json")
const PHONE = `+86-1390002${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-visitor-${Date.now()}`

test.describe("W4 注册", () => {
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

    await page.context().storageState({ path: W4_AUTH })
    emit("w4_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })
  })
})
