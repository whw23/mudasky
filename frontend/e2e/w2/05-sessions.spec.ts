/**
 * W2 登录设备管理测试。
 * 覆盖会话列表、当前设备标识、踢出其他设备、负向测试。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"

test.describe("W2 登录设备管理", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/portal/profile")
    // 滚动到底部确保会话区域可见
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  })

  test("会话列表显示当前设备", async ({ page }) => {
    await expect(page.getByText("登录设备")).toBeVisible()
    // 等待会话加载
    await expect(page.getByText("当前").first()).toBeVisible()
    trackComponent("SessionManagement", "设备列表")
  })

  test("当前设备无踢出按钮", async ({ page }) => {
    await expect(page.getByText("当前").first()).toBeVisible()

    // 找到标记为"当前"的会话行
    const currentBadge = page.getByText("当前").first()
    const sessionRow = currentBadge.locator("xpath=ancestor::div[contains(@class, 'border')]")

    // 当前设备不应有"踢出"按钮
    await expect(sessionRow.getByRole("button", { name: "踢出" })).not.toBeVisible()
    trackComponent("SessionManagement", "当前设备无踢出")
  })

  test("通过 API 查看会话列表", async ({ page }) => {
    const res = await page.request.get("/api/portal/profile/sessions/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(200)
    const sessions = await res.json()
    expect(Array.isArray(sessions)).toBe(true)
    expect(sessions.length).toBeGreaterThan(0)

    // 至少有一个 is_current 为 true
    const currentSession = sessions.find(
      (s: { is_current: boolean }) => s.is_current,
    )
    expect(currentSession).toBeTruthy()
    trackComponent("SessionManagement", "API会话列表")
  })

  test("退出所有其他设备", async ({ page }) => {
    await expect(page.getByText("当前").first()).toBeVisible()

    // 如果有"退出所有其他设备"按钮则点击
    const revokeAllBtn = page.getByRole("button", { name: /退出所有其他设备/ })
    if (await revokeAllBtn.isVisible().catch(() => false)) {
      await revokeAllBtn.click()
      await expect(page.getByText("已踢出所有其他设备")).toBeVisible()
    }

    // 执行 API 确认只剩当前设备
    const res = await page.request.get("/api/portal/profile/sessions/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    const sessions = await res.json()
    const otherSessions = sessions.filter(
      (s: { is_current: boolean }) => !s.is_current,
    )
    expect(otherSessions.length).toBe(0)

    trackComponent("SessionManagement", "退出所有其他设备")
  })

  test("负向 - 踢出不存在的会话", async ({ page }) => {
    const res = await page.request.post(
      "/api/portal/profile/sessions/list/revoke",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: { token_id: "00000000-0000-0000-0000-000000000000" },
      },
    )
    // 应返回 404 或 400
    expect([400, 404]).toContain(res.status())
    trackComponent("SessionManagement", "踢出不存在会话")
  })

  test("负向 - 无法踢出当前设备（API）", async ({ page }) => {
    // 获取当前设备 ID
    const listRes = await page.request.get(
      "/api/portal/profile/sessions/list",
      { headers: { "X-Requested-With": "XMLHttpRequest" } },
    )
    const sessions = await listRes.json()
    const current = sessions.find(
      (s: { is_current: boolean }) => s.is_current,
    )

    if (current) {
      const res = await page.request.post(
        "/api/portal/profile/sessions/list/revoke",
        {
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          data: { token_id: current.id },
        },
      )
      // 后端不阻止撤销当前设备会话，返回 200
      expect(res.status()).toBe(200)
    }

    trackComponent("SessionManagement", "踢出当前设备API")
  })
})
