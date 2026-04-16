/**
 * W1 禁用/启用/删除测试。
 * 最后运行，通过信号与 W4 协调。
 */

import { test, expect, trackComponent } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"

const XRW = { "X-Requested-With": "XMLHttpRequest" }
const JSON_HEADERS = { "Content-Type": "application/json", ...XRW }

test.describe.serial("W4 禁用/启用协调", () => {
  test.setTimeout(300_000)
  let w4UserId: string

  test("等待 W4 权限测试完成并获取用户 ID", async () => {
    const signal = await waitFor<{ userId: string }>("w4_permission_tests_done", 240_000)
    w4UserId = signal.userId
    expect(w4UserId).toBeTruthy()
  })

  test("禁用 W4 账号", async ({ page }) => {
    const res = await page.request.post("/api/admin/users/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { user_id: w4UserId, is_active: false },
    })
    expect(res.status()).toBe(200)

    // 验证已禁用
    const detailRes = await page.request.get(
      `/api/admin/users/list/detail?user_id=${w4UserId}`,
      { headers: XRW },
    )
    expect((await detailRes.json()).is_active).toBe(false)

    emit("w4_disabled")
    trackComponent("UserExpandPanel", "W4禁用")
  })

  test("等待 W4 验证禁用状态", async () => {
    await waitFor("w4_verified_disabled", 60_000)
  })

  test("启用 W4 账号", async ({ page }) => {
    const res = await page.request.post("/api/admin/users/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { user_id: w4UserId, is_active: true },
    })
    expect(res.status()).toBe(200)

    emit("w4_enabled")
    trackComponent("UserExpandPanel", "W4启用")
  })

  test("等待 W4 验证启用状态", async () => {
    await waitFor("w4_verified_enabled", 60_000)
  })

  test("删除临时测试账号（非 W4）", async ({ page }) => {
    // 查找 E2E-temp 开头的残留账号
    const listRes = await page.request.get(
      "/api/admin/users/list?search=E2E-temp",
      { headers: XRW },
    )
    const users = (await listRes.json()).items || []
    for (const u of users) {
      if (u.username?.startsWith("E2E-temp")) {
        await page.request.post("/api/admin/users/list/detail/delete", {
          headers: JSON_HEADERS,
          data: { user_id: u.id },
        })
      }
    }
    trackComponent("UserExpandPanel", "残留清理")
  })
})
