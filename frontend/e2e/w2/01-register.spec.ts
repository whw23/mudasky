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

    const res = await page.request.post("/api/auth/login", {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: { phone: PHONE, code },
    })
    expect(res.status()).toBe(200)
    const result = { data: await res.json() }

    await page.context().storageState({ path: W2_AUTH })
    emit("w2_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })
  })
})
