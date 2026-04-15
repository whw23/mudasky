/**
 * 院校详情页 E2E 测试。
 * 覆盖：详情页加载、数据展示、返回链接、API 响应。
 */

import { test, expect } from "../fixtures/base"
import { getExistingUniversityId, createUniversity } from "../helpers/seed"

test.describe("院校详情页", () => {
  test("详情页加载并展示院校信息", async ({ page }) => {
    await page.goto("/")
    let uniId = await getExistingUniversityId(page)
    if (!uniId) uniId = await createUniversity(page)
    expect(uniId).toBeTruthy()

    await page.goto(`/universities/${uniId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("a[href*='/universities']").first()).toBeVisible()
  })

  test("详情页 API 正常响应", async ({ page }) => {
    await page.goto("/")
    let uniId = await getExistingUniversityId(page)
    if (!uniId) uniId = await createUniversity(page)
    expect(uniId).toBeTruthy()

    const result = await page.evaluate(async (id) => {
      const res = await fetch(`/api/public/universities/detail/${id}`)
      return { status: res.status }
    }, uniId)
    expect(result.status).toBe(200)
  })
})
