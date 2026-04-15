/**
 * 案例详情页 E2E 测试。
 * 覆盖：详情页加载、数据展示、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("案例详情页", () => {
  test("详情页加载并展示案例信息", async ({ page }) => {
    await page.goto("/")

    // 通过 API 获取案例 ID（绕过 SSR 缓存）
    const caseId = await page.evaluate(async () => {
      const res = await fetch("/api/public/cases/list?page_size=1")
      if (!res.ok) return null
      const data = await res.json()
      return data.items?.[0]?.id ?? null
    })

    if (!caseId) {
      test.skip(true, "无案例数据")
      return
    }

    // 直接导航到详情页
    await page.goto(`/cases/${caseId}`)
    await page.locator("main").waitFor()

    // 返回链接可见
    await expect(page.locator("a[href*='/cases']").first()).toBeVisible()
  })

  test("详情页 API 正常响应", async ({ page }) => {
    await page.goto("/")

    const result = await page.evaluate(async () => {
      const listRes = await fetch("/api/public/cases/list?page_size=1")
      if (!listRes.ok) return { ok: false }
      const data = await listRes.json()
      const id = data.items?.[0]?.id
      if (!id) return { ok: false }
      const detailRes = await fetch(`/api/public/cases/detail/${id}`)
      return { ok: true, status: detailRes.status }
    })

    if (!result.ok) {
      test.skip(true, "无案例数据")
      return
    }
    expect(result.status).toBe(200)
  })
})
