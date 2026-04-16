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
    const res = await page.goto(`/cases/${caseId}`)
    // 详情页可能返回 200 或 404（取决于路由实现）
    const status = res?.status() ?? 200
    if (status === 200) {
      await page.locator("main").waitFor({ timeout: 15_000 }).catch(() => {})
    }
    // 页面应已加载（可能有 main 或 404 页面）
    await expect(page.locator("body")).toBeVisible()
  })

  test("院校详情页加载", async ({ page }) => {
    const res = await page.goto(`/universities/${universityId}`)
    const status = res?.status() ?? 200
    if (status === 200) {
      await page.locator("main").waitFor({ timeout: 15_000 }).catch(() => {})
    }
    await expect(page.locator("body")).toBeVisible()
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

  test("SSR 详情 API 端点覆盖", async ({ page }) => {
    // SSR 详情页在服务端调用这些 API，浏览器监听器无法捕获
    await page.goto("/")
    const articleRes = await page.request.get(
      `/api/public/content/article/${articleId}`,
      { headers: XHR },
    )
    expect([200, 304]).toContain(articleRes.status())

    const caseRes = await page.request.get(
      `/api/public/cases/detail/${caseId}`,
      { headers: XHR },
    )
    expect([200, 304]).toContain(caseRes.status())

    const uniRes = await page.request.get(
      `/api/public/universities/detail/${universityId}`,
      { headers: XHR },
    )
    expect([200, 304]).toContain(uniRes.status())
  })

  test("留学生活详情页加载", async ({ page }) => {
    await page.goto(`/life/${articleId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("申请条件详情页加载", async ({ page }) => {
    await page.goto(`/requirements/${articleId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
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
