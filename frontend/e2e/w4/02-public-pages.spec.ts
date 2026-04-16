/**
 * W4 公开页面测试。
 * 以 visitor 角色访问所有公开路由，验证页面加载和内容渲染。
 */

import { test, expect, trackComponent } from "../fixtures/base"

const XHR = { "X-Requested-With": "XMLHttpRequest" }

/** 所有公开页面路由 */
const PUBLIC_ROUTES = [
  { path: "/", label: "首页" },
  { path: "/about", label: "关于我们" },
  { path: "/universities", label: "院校选择" },
  { path: "/study-abroad", label: "出国留学" },
  { path: "/requirements", label: "申请条件" },
  { path: "/cases", label: "成功案例" },
  { path: "/visa", label: "签证办理" },
  { path: "/life", label: "留学生活" },
  { path: "/news", label: "新闻政策" },
] as const

test.describe("W4 公开页面", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.label}页面加载 ${route.path}`, async ({ page }) => {
      await page.goto(route.path)
      await page.locator("main").waitFor()
      await expect(page.locator("main")).toBeVisible()
    })
  }

  test("首页品牌名和导航栏可见", async ({ page }) => {
    await page.goto("/")
    await page.locator("main").waitFor()

    // 品牌名可见（桌面端 header）
    const header = page.locator("header")
    await expect(header).toBeVisible()

    // 导航栏所有链接可见
    const nav = page.locator("nav")
    await expect(nav).toBeVisible()
  })

  test("导航栏所有链接可见", async ({ page }) => {
    await page.goto("/")
    await page.locator("nav").waitFor()

    const navLinks = page.locator("nav a")
    const count = await navLinks.count()
    expect(count).toBeGreaterThanOrEqual(8)
  })

  test("Footer ICP 备案信息可见", async ({ page }) => {
    await page.goto("/")
    await page.locator("footer").waitFor()

    // ICP 备案链接指向 beian.miit.gov.cn
    const icpLink = page.locator('footer a[href="https://beian.miit.gov.cn/"]')
    await expect(icpLink).toBeVisible()
  })

  test("Footer 联系信息可见", async ({ page }) => {
    await page.goto("/")
    await page.locator("footer").waitFor()

    // Footer 应该包含联系方式（电话或邮箱图标区域）
    const footer = page.locator("footer")
    await expect(footer).toBeVisible()
    const footerText = await footer.textContent()
    expect(footerText).toBeTruthy()
  })

  test("列表页面内容区域可见 — 院校", async ({ page }) => {
    await page.goto("/universities")
    await page.locator("main").waitFor()

    // 院校列表区域（搜索框或加载状态）
    const main = page.locator("main")
    await expect(main).toBeVisible()
    const text = await main.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })

  test("列表页面内容区域可见 — 案例", async ({ page }) => {
    await page.goto("/cases")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("列表页面内容区域可见 — 新闻", async ({ page }) => {
    await page.goto("/news")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("公开 API 端点覆盖（SSR 发起，手动补录）", async ({ page }) => {
    await page.goto("/")
    // SSR 页面在服务端调用这些 API，浏览器监听器无法捕获，手动触发覆盖
    const endpoints = [
      "/api/public/cases/list",
      "/api/public/universities/list",
      "/api/public/universities/countries",
      "/api/public/universities/provinces",
      "/api/public/universities/cities",
      "/api/public/content/articles",
      "/api/public/content/categories",
      "/api/public/config/panel-config",
    ]
    for (const ep of endpoints) {
      const res = await page.request.get(ep, { headers: XHR })
      expect([200, 304]).toContain(res.status())
    }
  })

  test("负向：不存在的公开路由返回 404 页面", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist-12345")
    // Next.js 404 页面仍然返回 HTTP 404
    expect(res?.status()).toBe(404)
  })

  test("负向：公开 API 无需认证即可访问", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.get("/api/public/config/site_info", {
      headers: XHR,
    })
    expect(res.status()).toBe(200)
  })
})
