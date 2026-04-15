/**
 * 公开 API 端点覆盖测试。
 * 通过 page.evaluate 直接调用无前端页面的 API 端点。
 */

import { test, expect } from "../fixtures/base"

test.describe("公开 API — 案例详情", () => {
  test("GET /public/cases/detail/{id} 正常响应", async ({ page }) => {
    await page.goto("/")
    const result = await page.evaluate(async () => {
      const listRes = await fetch("/api/public/cases/list?page_size=1")
      if (!listRes.ok) return { listStatus: listRes.status, detailStatus: -1 }
      const listData = await listRes.json()
      const items = listData.items ?? []
      if (!items.length) return { listStatus: 200, detailStatus: -1, noData: true }
      const caseId = items[0].id
      const detailRes = await fetch(`/api/public/cases/detail/${caseId}`)
      return { listStatus: 200, detailStatus: detailRes.status }
    })
    expect(result.listStatus).toBe(200)
    if (!result.noData) {
      expect(result.detailStatus).toBe(200)
    }
  })

  test("GET /public/cases/detail/不存在ID 返回 404", async ({ page }) => {
    await page.goto("/")
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/public/cases/detail/00000000-0000-0000-0000-000000000000")
      return { status: res.status }
    })
    expect([404, 422]).toContain(response.status)
  })
})

test.describe("公开 API — 院校详情", () => {
  test("GET /public/universities/detail/{id} 正常响应", async ({ page }) => {
    await page.goto("/")
    const result = await page.evaluate(async () => {
      const listRes = await fetch("/api/public/universities/list?page_size=1")
      if (!listRes.ok) return { listStatus: listRes.status, detailStatus: -1 }
      const listData = await listRes.json()
      const items = listData.items ?? []
      if (!items.length) return { listStatus: 200, detailStatus: -1, noData: true }
      const uniId = items[0].id
      const detailRes = await fetch(`/api/public/universities/detail/${uniId}`)
      return { listStatus: 200, detailStatus: detailRes.status }
    })
    expect(result.listStatus).toBe(200)
    if (!result.noData) {
      expect(result.detailStatus).toBe(200)
    }
  })
})
