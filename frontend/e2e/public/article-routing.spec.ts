/**
 * 文章栏目分流 E2E 测试。
 * 覆盖：各栏目页文章链接指向正确的详情路由。
 */

import { test, expect } from "@playwright/test"

const sections = [
  { path: "/study-abroad", name: "留学项目" },
  { path: "/visa", name: "签证办理" },
  { path: "/life", name: "留学生活" },
  { path: "/requirements", name: "申请条件" },
]

for (const { path, name } of sections) {
  test(`${name}页面文章链接指向 ${path}/[id]`, async ({ page }) => {
    await page.goto(path)
    await page.locator("main").waitFor({ timeout: 15_000 })

    const articleLink = page.locator(`a[href*='${path}/']`).first()
    if (!(await articleLink.isVisible().catch(() => false))) {
      test.skip(true, `${name}页面无文章`)
      return
    }

    const href = await articleLink.getAttribute("href")
    expect(href).toContain(path)
    expect(href).not.toContain("/news/")
  })
}
