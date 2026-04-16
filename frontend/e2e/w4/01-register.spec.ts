/**
 * W4 注册测试。
 * 注册 → 发信号 → 等待角色分配完成 → 保存 storageState。W4 保持 visitor。
 */

import { test, expect } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W4_AUTH = path.join(__dirname, "..", ".auth", "w4.json")
const PHONE = `+861390002${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-visitor-${Date.now()}`

test.describe("W4 注册", () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.setTimeout(120_000)

  test("自注册并等待赋权完成", async ({ page }) => {
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

    emit("w4_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user.id,
    })

    // 等待所有角色分配完成
    await waitFor("roles_assigned", 90_000)

    // 保存 storageState
    await page.context().storageState({ path: W4_AUTH })
  })
})
