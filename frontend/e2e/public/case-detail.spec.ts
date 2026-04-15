/**
 * 案例详情页 E2E 测试。
 * 覆盖：详情页加载、数据展示、返回链接、API 响应。
 */

import { test, expect } from "../fixtures/base"
import { getExistingCaseId, createCase } from "../helpers/seed"

test.describe("案例详情页", () => {
  test("详情页加载并展示案例信息", async ({ page }) => {
    await page.goto("/")
    let caseId = await getExistingCaseId(page)
    if (!caseId) caseId = await createCase(page)
    expect(caseId).toBeTruthy()

    await page.goto(`/cases/${caseId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("a[href*='/cases']").first()).toBeVisible()
  })

  test("详情页 API 正常响应", async ({ page }) => {
    await page.goto("/")
    let caseId = await getExistingCaseId(page)
    if (!caseId) caseId = await createCase(page)
    expect(caseId).toBeTruthy()

    const result = await page.evaluate(async (id) => {
      const res = await fetch(`/api/public/cases/detail/${id}`)
      return { status: res.status }
    }, caseId)
    expect(result.status).toBe(200)
  })
})
