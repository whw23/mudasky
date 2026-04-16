/**
 * W2 注册。
 * 注册新账号并保存 storageState。
 * dependencies 保证本 project 在 W1 setup 之前完成。
 * W1 setup 赋权后，W2 主测试用 storageState 中的 cookie 调 refresh 获取新权限。
 */

import { test, expect } from "../fixtures/base"
import { emit } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W2_AUTH = path.join(__dirname, "..", ".auth", "w2.json")
const PHONE = `+86-1390000${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-student-${Date.now()}`

test.describe("W2 注册", () => {
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

    await page.context().storageState({ path: W2_AUTH })
    emit("w2_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })
  })
})
