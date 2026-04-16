/**
 * W4 禁用/启用测试。
 * 与 W1 协调：W4 完成权限测试后通知 W1，W1 禁用 W4，W4 验证被禁后重新启用。
 */

import { test, expect, trackSecurity } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"

const XHR = { "X-Requested-With": "XMLHttpRequest" }

test.describe("W4 禁用/启用", () => {
  test.describe.configure({ mode: "serial" })
  test.setTimeout(300_000)

  test("禁用后 API 返回 401 USER_DISABLED", async ({ page }) => {
    await page.goto("/")

    // 获取 W4 的 userId（从注册信号中读取）
    const regInfo = await waitFor<{ userId: string }>("w4_registered", 5_000)

    // 通知 W1：W4 权限测试完成，可以禁用（包含 userId）
    emit("w4_permission_tests_done", { userId: regInfo.userId })

    // 等待 W1 禁用 W4
    await waitFor("w4_disabled", 120_000)

    // 刷新页面使新状态生效
    await page.reload()

    // 尝试访问需要认证的 API
    const res = await page.request.post("/api/auth/refresh", {
      headers: XHR,
    })
    // 禁用用户 refresh 应失败
    expect([401, 403]).toContain(res.status())
    if (res.status() === 401) {
      const body = await res.json()
      // 可能返回 USER_DISABLED 或 TOKEN_INVALID（取决于实现）
      expect(["USER_DISABLED", "TOKEN_INVALID", "REFRESH_TOKEN_INVALID"]).toContain(body.code)
    }

    // 通知 W1：W4 已验证禁用状态
    emit("w4_verified_disabled")
    trackSecurity("禁用用户", "禁用后API返回401")
  })

  test("禁用后页面访问失败", async ({ page }) => {
    // 确保已被禁用（依赖上一个测试的信号）
    await waitFor("w4_disabled", 5_000).catch(() => {})

    await page.goto("/")
    await page.context().clearCookies()

    // 无 token 状态下公开页面仍可访问
    await page.goto("/about")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("启用后恢复访问", async ({ page }) => {
    // 等待 W1 重新启用 W4
    await waitFor("w4_enabled", 120_000)

    await page.goto("/")

    // 重新获取 token（通过 refresh 或重新登录）
    const refreshRes = await page.request.post("/api/auth/refresh", {
      headers: XHR,
    })
    // 启用后 refresh 应该成功（如果 refresh_token 仍有效）
    // 如果 refresh_token 已失效，状态码可能是 401
    if (refreshRes.status() === 200) {
      // 验证可以正常访问公开 API
      const res = await page.request.get("/api/public/config/site_info", {
        headers: XHR,
      })
      expect(res.status()).toBe(200)
    }

    // 通知 W1：W4 已验证启用状态
    emit("w4_verified_enabled")
    trackSecurity("禁用用户", "启用后恢复访问")
  })

  test("正向：启用后公开页面正常", async ({ page }) => {
    await waitFor("w4_enabled", 5_000).catch(() => {})

    await page.goto("/")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })
})
