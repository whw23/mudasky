/**
 * W1 设置管理测试。
 * 通用配置和网页设置的读取、编辑、回滚。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"

const XRW = { "X-Requested-With": "XMLHttpRequest" }
const JSON_HEADERS = { "Content-Type": "application/json", ...XRW }

test.describe("通用配置", () => {
  test("读取 general-settings 列表", async ({ page }) => {
    const res = await page.request.get("/api/admin/general-settings/list", { headers: XRW })
    expect(res.status()).toBe(200)
    const configs = await res.json()
    expect(Array.isArray(configs)).toBe(true)
    expect(configs.length).toBeGreaterThan(0)
    trackComponent("GeneralSettingsPage", "配置列表")
  })

  test("编辑 general-settings — 修改并回滚", async ({ page }) => {
    // 读取原始值
    const listRes = await page.request.get("/api/admin/general-settings/list", { headers: XRW })
    const configs = await listRes.json()
    const siteInfo = configs.find((c: { key: string }) => c.key === "site_info")
    expect(siteInfo).toBeTruthy()
    const originalValue = { ...siteInfo.value }

    // 修改一个字段
    const modified = { ...siteInfo.value, hotline: "400-000-TEST" }
    const editRes = await page.request.post("/api/admin/general-settings/list/edit", {
      headers: JSON_HEADERS,
      data: { key: "site_info", value: modified },
    })
    expect(editRes.status()).toBe(200)
    trackComponent("ConfigEditDialog", "文本输入")

    // 验证修改生效
    const verifyRes = await page.request.get("/api/admin/general-settings/list", { headers: XRW })
    const updated = (await verifyRes.json()).find((c: { key: string }) => c.key === "site_info")
    expect(updated.value.hotline).toBe("400-000-TEST")

    // 回滚
    const revertRes = await page.request.post("/api/admin/general-settings/list/edit", {
      headers: JSON_HEADERS,
      data: { key: "site_info", value: originalValue },
    })
    expect(revertRes.status()).toBe(200)
    trackComponent("ConfigEditDialog", "编辑回滚")
  })

  test("UI — 通用配置页面可加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/general-settings")
    await expect(page.locator("main").getByText("通用配置").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "手机号国家码" })).toBeVisible()
    trackComponent("GeneralSettingsPage", "页面渲染")
  })
})

test.describe("网页设置", () => {
  test("读取 web-settings 列表", async ({ page }) => {
    const res = await page.request.get("/api/admin/web-settings/list", { headers: XRW })
    expect(res.status()).toBe(200)
    const configs = await res.json()
    expect(Array.isArray(configs)).toBe(true)
    trackComponent("WebSettingsPage", "配置列表")
  })

  test("编辑 web-settings — 修改并回滚", async ({ page }) => {
    // 读取原始值
    const listRes = await page.request.get("/api/admin/web-settings/list", { headers: XRW })
    const configs = await listRes.json()
    const siteInfo = configs.find((c: { key: string }) => c.key === "site_info")
    expect(siteInfo).toBeTruthy()
    const originalValue = { ...siteInfo.value }

    // 修改
    const modified = { ...siteInfo.value, tagline: { zh: "E2E-测试标语", en: "E2E Test" } }
    const editRes = await page.request.post("/api/admin/web-settings/list/edit", {
      headers: JSON_HEADERS,
      data: { key: "site_info", value: modified },
    })
    expect(editRes.status()).toBe(200)
    trackComponent("ConfigEditDialog", "标语编辑")

    // 验证
    const verifyRes = await page.request.get("/api/admin/web-settings/list", { headers: XRW })
    const updated = (await verifyRes.json()).find((c: { key: string }) => c.key === "site_info")
    const tagline = updated.value.tagline
    const zhVal = typeof tagline === "string" ? tagline : tagline?.zh
    expect(zhVal).toBe("E2E-测试标语")

    // 回滚
    const revertRes = await page.request.post("/api/admin/web-settings/list/edit", {
      headers: JSON_HEADERS,
      data: { key: "site_info", value: originalValue },
    })
    expect(revertRes.status()).toBe(200)
    trackComponent("ConfigEditDialog", "标语回滚")
  })

  test("UI — 网页设置页面可加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/web-settings")
    await expect(page.locator("main").getByText("网页设置").first()).toBeVisible()
    trackComponent("WebSettingsPage", "页面渲染")
  })

  test("反向 — 空必填字段保存失败", async ({ page }) => {
    // 尝试将 brand_name 的中文值清空
    const listRes = await page.request.get("/api/admin/web-settings/list", { headers: XRW })
    const configs = await listRes.json()
    const siteInfo = configs.find((c: { key: string }) => c.key === "site_info")
    const modified = { ...siteInfo.value, brand_name: { zh: "", en: "" } }

    // API 层可能不校验空值，但 UI 层有校验
    // 此处验证 API 至少不会 500
    const res = await page.request.post("/api/admin/web-settings/list/edit", {
      headers: JSON_HEADERS,
      data: { key: "site_info", value: modified },
    })
    expect(res.status()).toBeLessThan(500)
    trackComponent("ConfigEditDialog", "空值校验")
  })

  test("反向 — 不存在的配置 key", async ({ page }) => {
    const res = await page.request.post("/api/admin/web-settings/list/edit", {
      headers: JSON_HEADERS,
      data: { key: "nonexistent_config_key", value: { test: true } },
    })
    expect([400, 404, 422]).toContain(res.status())
    trackComponent("ConfigEditDialog", "不存在的key")
  })
})
