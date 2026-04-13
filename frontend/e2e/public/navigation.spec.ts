/**
 * 公开页面导航 E2E 测试。
 * 验证导航栏所有链接可达，页面加载正常。
 */

import { test, expect } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const NAV_LINKS = [
  { name: "网站首页", url: "/" },
  { name: "院校选择", url: "/universities" },
  { name: "出国留学", url: "/study-abroad" },
  { name: "申请条件", url: "/requirements" },
  { name: "成功案例", url: "/cases" },
  { name: "签证办理", url: "/visa" },
  { name: "留学生活", url: "/life" },
  { name: "新闻政策", url: "/news" },
  { name: "关于我们", url: "/about" },
]

test.describe("公开页面导航", () => {
  test("首页加载包含品牌名", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText("慕大国际教育")
  })

  test("导航栏显示所有链接", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    for (const link of NAV_LINKS) {
      await expect(page.getByRole("link", { name: link.name }).first()).toBeVisible()
    }
  })

  for (const link of NAV_LINKS) {
    test(`导航到 ${link.name} (${link.url})`, async ({ page }) => {
      await page.goto(link.url)
      await page.waitForLoadState("networkidle")
      await expect(page.locator("body")).toBeVisible()
      // 验证不是 404 页面
      await expect(page.locator("body")).not.toContainText("404")
    })
  }

  test("底部包含 ICP 备案信息", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("footer")).toContainText("苏ICP备")
  })

  test("底部包含联系方式", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("footer")).toContainText("189-1268-6656")
  })

  test("语言切换可见", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const selector = page.getByRole("combobox")
    await expect(selector).toBeVisible()
  })
})

test.describe("院校页搜索和筛选", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/universities")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)
  })

  test("搜索框可见", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索院校/)
    await expect(searchInput).toBeVisible()
  })

  test("国家筛选下拉可见", async ({ page }) => {
    // 国家筛选选择器
    const countrySelect = page.locator("select").first()
    await expect(countrySelect).toBeVisible()
  })
})
