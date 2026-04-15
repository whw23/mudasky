/**
 * 文章详情页 E2E 测试。
 * 覆盖 4 个栏目（留学项目、签证办理、留学生活、申请条件）的详情页加载、
 * 返回链接、不存在 ID 和无效 ID 格式。
 */

import { test, expect } from "../fixtures/base"
import { createArticle } from "../helpers/seed"

const categories = [
  { path: "/study-abroad", slug: "study-abroad", name: "留学项目" },
  { path: "/visa", slug: "visa", name: "签证办理" },
  { path: "/life", slug: "life", name: "留学生活" },
  { path: "/requirements", slug: "requirements", name: "申请条件" },
]

for (const { path, slug, name } of categories) {
  test.describe(`${name}详情页 (${path})`, () => {
    test("详情页加载并展示文章内容", async ({ page }) => {
      await page.goto("/")
      const articleId = await createArticle(page, slug)
      expect(articleId).toBeTruthy()

      await page.goto(`${path}/${articleId}`)
      await page.locator("main").waitFor()

      // 文章标题应存在
      await expect(page.locator("h1")).toBeVisible()
      // 文章正文区域应存在
      await expect(page.locator("article")).toBeVisible()
    })

    test("返回链接指向正确的栏目列表页", async ({ page }) => {
      await page.goto("/")
      const articleId = await createArticle(page, slug)
      expect(articleId).toBeTruthy()

      await page.goto(`${path}/${articleId}`)
      await page.locator("main").waitFor()

      // 返回链接应指向栏目列表页
      const backLink = page.locator(`a[href*='${path}']`).first()
      await expect(backLink).toBeVisible()
      const href = await backLink.getAttribute("href")
      // href 可能包含 locale 前缀，但一定以栏目路径结尾
      expect(href).toContain(path)
    })

    test("不存在的 ID 显示 404 而非 500", async ({ page }) => {
      const fakeId = "00000000-0000-0000-0000-000000000000"
      const res = await page.goto(`${path}/${fakeId}`)

      // 页面不应返回 500
      expect(res?.status()).not.toBe(500)
      // Next.js notFound() 返回 404
      expect(res?.status()).toBe(404)
    })

    test("无效 ID 格式不崩溃", async ({ page }) => {
      const res = await page.goto(`${path}/invalid-id-format!!!`)

      // 不应返回 500 服务器错误
      expect(res?.status()).not.toBe(500)
      // 应返回 404（后端查不到非 UUID 格式的 ID）
      expect(res?.status()).toBe(404)
    })
  })
}
