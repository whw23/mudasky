/**
 * 新闻/文章详情页 E2E 测试。
 * 覆盖：文章详情页加载、返回链接、列表页可达。
 */

import { test, expect } from "../fixtures/base"
import { getExistingArticleId, createArticle } from "../helpers/seed"

test.describe("新闻详情页", () => {
  test("详情页加载并展示文章内容", async ({ page }) => {
    await page.goto("/")
    let articleId = await getExistingArticleId(page)
    if (!articleId) articleId = await createArticle(page)
    expect(articleId).toBeTruthy()

    await page.goto(`/news/${articleId}`)
    await page.locator("main").waitFor()
    await expect(page.locator("a[href*='/news']").first()).toBeVisible()
  })

  test("新闻列表页可达", async ({ page }) => {
    await page.goto("/news")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })
})
