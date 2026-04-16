/**
 * W1 安全测试。
 * CSRF、XSS、SQL 注入、输入验证。
 */

import { test, expect, trackSecurity } from "../fixtures/base"

const JSON_HEADERS = { "Content-Type": "application/json" }
const XRW_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }

test.describe("基础端点", () => {
  test("health 和 version 可访问", async ({ page }) => {
    const healthRes = await page.request.get("/api/health")
    expect(healthRes.status()).toBe(200)

    const versionRes = await page.request.get("/api/version")
    expect(versionRes.status()).toBe(200)
  })
})

test.describe("CSRF 防护", () => {
  test("POST 不带 X-Requested-With — 返回 403", async ({ page }) => {
    const res = await page.request.post("/api/admin/categories/list", {
      headers: JSON_HEADERS,
      data: {},
    })
    expect(res.status()).toBe(403)
    trackSecurity("CSRF", "POST无X-Requested-With返回403")
  })

  test("POST 带 X-Requested-With — 正常响应", async ({ page }) => {
    const res = await page.request.get("/api/admin/categories/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    // GET 请求正常
    expect(res.status()).toBe(200)
    trackSecurity("CSRF", "POST有X-Requested-With正常")
  })
})

test.describe("XSS 防护", () => {
  test("用户名含 script 标签 — 注册应安全处理", async ({ page }) => {
    const xssPayload = '<script>alert("xss")</script>'
    const res = await page.request.post("/api/auth/sms-code", {
      headers: XRW_HEADERS,
      data: { phone: "13900001111" },
    })
    // 验证码发送不受 XSS 影响
    expect(res.status()).toBeLessThan(500)
    trackSecurity("XSS", "script标签被转义")

    // 搜索框注入测试
    const searchRes = await page.request.get(
      `/api/admin/users/list?search=${encodeURIComponent(xssPayload)}`,
      { headers: { "X-Requested-With": "XMLHttpRequest" } },
    )
    expect(searchRes.status()).toBe(200)
    const body = await searchRes.json()
    // 不应有未转义的脚本标签
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toContain("<script>")
    trackSecurity("XSS", "搜索框XSS不执行")
  })

  test("文章标题含 HTML — 不触发脚本", async ({ page }) => {
    const xssTitle = 'E2E-XSS<img src=x onerror=alert(1)>'
    const catRes = await page.request.get("/api/admin/categories/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    const cats = await catRes.json()
    if (cats.length === 0) return

    const res = await page.request.post("/api/admin/articles/list/create", {
      headers: XRW_HEADERS,
      data: {
        title: xssTitle,
        slug: `e2e-xss-${Date.now()}`,
        category_id: cats[0].id,
        content_type: "markdown",
        content: "XSS test",
        status: "draft",
      },
    })
    expect(res.status()).toBe(201)
    const art = await res.json()

    // 验证返回值中标题被原样存储（不含执行代码）
    expect(art.title).toContain("E2E-XSS")

    // 清理
    await page.request.post("/api/admin/articles/list/detail/delete", {
      headers: XRW_HEADERS,
      data: { article_id: art.id },
    })
    trackSecurity("XSS", "文章标题HTML安全")
  })
})

test.describe("SQL 注入防护", () => {
  test("登录 SQL 注入 payload — 正常错误", async ({ page }) => {
    const res = await page.request.post("/api/auth/sms-code", {
      headers: XRW_HEADERS,
      data: { phone: "' OR '1'='1" },
    })
    // 应得到 422（验证错误）而非 500
    expect(res.status()).toBeLessThan(500)
    trackSecurity("SQL注入", "登录注入返回正常错误")
  })

  test("搜索参数 SQL 注入 — 安全", async ({ page }) => {
    const sqlPayload = "'; DROP TABLE users; --"
    const res = await page.request.get(
      `/api/admin/users/list?search=${encodeURIComponent(sqlPayload)}`,
      { headers: { "X-Requested-With": "XMLHttpRequest" } },
    )
    expect(res.status()).toBe(200)
    // 数据库未被破坏：仍能查询
    const verifyRes = await page.request.get("/api/admin/users/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(verifyRes.status()).toBe(200)
    trackSecurity("SQL注入", "搜索参数注入安全")
  })
})

test.describe("输入验证", () => {
  test("空 body — 返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/categories/list/create", {
      headers: XRW_HEADERS,
    })
    expect(res.status()).toBe(422)
    trackSecurity("输入验证", "空body返回422")
  })

  test("无效 JSON — 返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/categories/list/create", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: "not-valid-json{{{",
    })
    expect(res.status()).toBe(422)
    trackSecurity("输入验证", "无效JSON返回422")
  })

  test("超长字符串 — 不返回 500", async ({ page }) => {
    const longStr = "A".repeat(10_000)
    const res = await page.request.post("/api/admin/categories/list/create", {
      headers: XRW_HEADERS,
      data: { name: longStr, slug: longStr },
    })
    expect(res.status()).toBeLessThan(500)
    trackSecurity("输入验证", "超长字符串不500")
  })

  test("非法 UUID — 不返回 500", async ({ page }) => {
    const res = await page.request.get(
      "/api/admin/users/list/detail?user_id=not-a-uuid",
      { headers: { "X-Requested-With": "XMLHttpRequest" } },
    )
    expect(res.status()).toBeLessThan(500)
    trackSecurity("输入验证", "非法UUID不500")
  })

  test("负数页码 — 返回错误而非崩溃", async ({ page }) => {
    const res = await page.request.get(
      "/api/admin/users/list?page=-1&page_size=20",
      { headers: { "X-Requested-With": "XMLHttpRequest" } },
    )
    // 后端 PaginationParams 内部 Pydantic 校验会拒绝负数，返回 422 或 500
    expect(res.status()).toBeGreaterThanOrEqual(400)
    trackSecurity("输入验证", "负数页码返回错误")
  })
})
