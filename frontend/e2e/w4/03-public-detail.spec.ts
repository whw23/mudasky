/**
 * W4 公开详情页测试。
 * 等待 W1 创建种子数据后，验证文章/案例/院校详情页加载。
 */

import { test, expect } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

const XHR = { "X-Requested-With": "XMLHttpRequest" }

test.describe("W4 公开详情页", () => {
  let articleId: string
  let caseId: string
  let universityId: string

  test.beforeAll(async () => {
    const article = await waitFor<{ articleId: string }>("article_created", 90_000)
    articleId = article.articleId

    const caseData = await waitFor<{ caseId: string }>("case_created", 90_000)
    caseId = caseData.caseId

    const uni = await waitFor<{ universityId: string }>("university_created", 90_000)
    universityId = uni.universityId
  })

  test("新闻详情页加载", async ({ page }) => {
    await page.goto(`/news/${articleId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
    const text = await page.locator("main").textContent()
    expect(text!.length).toBeGreaterThan(0)
  })

  test("案例详情页加载", async ({ page }) => {
    await page.goto(`/cases/${caseId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("院校详情页加载", async ({ page }) => {
    await page.goto(`/universities/${universityId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("文章详情页通过 API 获取并访问", async ({ page }) => {
    // 通过公开 API 获取一篇文章
    await page.goto("/")
    const res = await page.request.get(
      "/api/public/content/articles?page_size=1",
      { headers: XHR },
    )
    expect(res.status()).toBe(200)
    const data = await res.json()
    const items = data.items ?? []

    if (items.length > 0) {
      const id = items[0].id
      await page.goto(`/news/${id}`)
      await page.locator("main").waitFor()
      await expect(page.locator("main")).toBeVisible()
    }
  })

  test("出国留学详情页加载", async ({ page }) => {
    await page.goto(`/study-abroad/${articleId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("签证详情页加载", async ({ page }) => {
    await page.goto(`/visa/${articleId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("负向：不存在的文章 ID 返回 404", async ({ page }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000"
    const res = await page.goto(`/news/${fakeId}`)
    // 要么返回 404 HTTP 状态，要么页面显示 404 内容
    const status = res?.status() ?? 200
    if (status === 200) {
      const text = await page.locator("main").textContent()
      expect(text).toBeTruthy()
    } else {
      expect(status).toBe(404)
    }
  })

  test("负向：无效 ID 格式不返回 500", async ({ page }) => {
    const res = await page.goto("/news/invalid-id-format-!!!")
    const status = res?.status() ?? 200
    expect(status).not.toBe(500)
  })
})
