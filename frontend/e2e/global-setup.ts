/**
 * Playwright 全局初始化。
 * 登录管理员 → 保存 storageState → 预热所有页面（触发 Next.js 编译）。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")

/** 需要预热的所有页面路径 */
const WARMUP_PAGES = [
  /* 公开页面 */
  "/", "/news", "/universities", "/cases",
  "/study-abroad", "/visa", "/life", "/requirements", "/about",
  /* 管理后台 */
  "/admin/dashboard", "/admin/users", "/admin/roles",
  "/admin/articles", "/admin/categories", "/admin/universities",
  "/admin/cases", "/admin/students", "/admin/contacts",
  "/admin/general-settings", "/admin/web-settings",
  /* 用户中心 */
  "/portal/overview", "/portal/profile", "/portal/documents",
]

async function globalSetup(_config: FullConfig) {
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  /* 如果已有有效的 auth 文件（1 小时内），跳过登录 */
  if (fs.existsSync(AUTH_FILE)) {
    const stat = fs.statSync(AUTH_FILE)
    const age = Date.now() - stat.mtimeMs
    if (age < 3600_000) return
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ locale: "zh-CN" })
  const page = await context.newPage()

  /* ── 登录 ── */
  await page.goto("http://localhost/", { waitUntil: "networkidle", timeout: 60_000 })

  const loginBtn = page.getByRole("button", { name: /登录/ })
  await loginBtn.waitFor({ timeout: 30_000 })
  await loginBtn.click()

  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ timeout: 15_000 })

  await page.getByRole("tab", { name: "账号密码" }).click()
  await page.getByRole("tabpanel").waitFor({ timeout: 5_000 })

  const inputs = dialog.getByRole("textbox")
  await inputs.first().waitFor({ timeout: 5_000 })
  await inputs.first().fill("mudasky")
  await inputs.nth(1).fill("mudasky@12321.")

  await page.getByRole("tabpanel").getByRole("button", { name: "登录" }).click()

  try {
    await dialog.waitFor({ state: "hidden", timeout: 15_000 })
  } catch {
    await page.screenshot({ path: path.join(dir, "login-failed.png") })
    throw new Error("登录失败 — 截图已保存到 e2e/.auth/login-failed.png")
  }

  await context.storageState({ path: AUTH_FILE })

  /* ── 种子测试数据（E2E 前缀，teardown 清理） ── */
  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  }
  const api = (url: string, body?: Record<string, unknown>) =>
    page.request.post(`http://localhost${url}`, { headers, data: body })
  const apiGet = (url: string) =>
    page.request.get(`http://localhost${url}`, { headers })

  // 1. 注册一个非 superuser 测试用户（会自动成为 visitor）
  const smsRes = await api("/api/auth/sms-code", { phone: "+8613900000088" }).catch(() => null)
  if (smsRes?.ok()) {
    const smsData = await smsRes.json()
    await api("/api/auth/register", {
      phone: "+8613900000088",
      code: smsData.code,
      username: "E2E测试用户",
    }).catch(() => {})
  }

  // 2. 获取分类列表，每个分类创建一篇文章
  const catRes = await apiGet("/api/admin/categories/list").catch(() => null)
  if (catRes?.ok()) {
    const categories = await catRes.json()
    for (const cat of Array.isArray(categories) ? categories : []) {
      await api("/api/admin/articles/list/create", {
        title: `E2E文章-${cat.name}`,
        slug: `e2e-article-${cat.slug}-${Date.now()}`,
        category_id: cat.id,
        content_type: "markdown",
        content: "E2E 测试文章内容",
        status: "published",
      }).catch(() => {})
    }
  }

  // 3. 创建案例
  const caseRes = await apiGet("/api/admin/cases/list").catch(() => null)
  const caseData = caseRes?.ok() ? await caseRes.json() : null
  const cases = caseData?.items ?? caseData ?? []
  if (!cases.some((c: { title?: string; student_name?: string }) =>
    (c.title ?? c.student_name ?? "").startsWith("E2E"))) {
    await api("/api/admin/cases/list/create", {
      student_name: "E2E案例学生",
      university: "E2E大学",
      program: "E2E专业",
      year: 2026,
      testimonial: "E2E 测试感言",
    }).catch(() => {})
  }

  // 4. 创建院校
  const uniRes = await apiGet("/api/admin/universities/list").catch(() => null)
  const uniData = uniRes?.ok() ? await uniRes.json() : null
  const unis = uniData?.items ?? uniData ?? []
  if (!unis.some((u: { name?: string }) => (u.name ?? "").startsWith("E2E"))) {
    await api("/api/admin/universities/list/create", {
      name: "E2E测试大学",
      name_en: "E2E Test University",
      country: "德国",
      city: "柏林",
      programs: ["计算机科学", "机械工程"],
      description: "E2E 测试院校",
    }).catch(() => {})
  }

  /* ── 预热所有页面（触发 Next.js dev 编译） ── */
  for (const p of WARMUP_PAGES) {
    await page.goto(`http://localhost${p}`, { waitUntil: "load", timeout: 60_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  }

  await browser.close()
}

export default globalSetup
