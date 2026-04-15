/**
 * Playwright 全局初始化。
 * 登录管理员 → 保存 storageState → 预热所有页面（触发 Next.js 编译）。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")

/** 预热关键入口页（触发共享 JS bundle 编译，其他页面复用） */
const WARMUP_PAGES = [
  "/",
  "/admin/dashboard",
  "/portal/overview",
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

  /* ── 种子测试数据（通过 page.evaluate 调用 API，自动带 cookie） ── */
  await page.goto("http://localhost/", { waitUntil: "load", timeout: 30_000 })

  await page.evaluate(async () => {
    const h = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }
    const post = (url: string, body: unknown) =>
      fetch(url, { method: "POST", headers: h, body: JSON.stringify(body), credentials: "include" })
    const get = (url: string) =>
      fetch(url, { headers: h, credentials: "include" })

    // 1. 注册一个非 superuser 测试用户（不带 credentials 避免覆盖管理员 cookie）
    try {
      const smsRes = await fetch("/api/auth/sms-code", {
        method: "POST", headers: h,
        body: JSON.stringify({ phone: "+8613900000088" }),
      })
      if (smsRes.ok) {
        const smsData = await smsRes.json()
        await fetch("/api/auth/register", {
          method: "POST", headers: h,
          body: JSON.stringify({ phone: "+8613900000088", code: smsData.code, username: "E2E测试用户" }),
        }).catch(() => {})
      }
    } catch { /* 已注册或失败均忽略 */ }
    // 确保 E2E 用户不是 superuser
    try {
      const usersRes = await get("/api/admin/users/list?keyword=E2E")
      if (usersRes.ok) {
        const userData = await usersRes.json()
        const items = userData.items ?? userData ?? []
        for (const u of items) {
          if (u.username?.startsWith("E2E") && u.role_name === "superuser") {
            await post("/api/admin/users/list/detail/assign-role", {
              user_id: u.id, role_id: null,
            }).catch(() => {})
          }
        }
      }
    } catch { /* 忽略 */ }

    // 2. 获取分类列表，每个分类创建一篇文章
    try {
      const catRes = await get("/api/admin/categories/list")
      if (catRes.ok) {
        const categories = await catRes.json()
        for (const cat of Array.isArray(categories) ? categories : []) {
          await post("/api/admin/articles/list/create", {
            title: `E2E文章-${cat.name}`,
            slug: `e2e-article-${cat.slug}-${Date.now()}`,
            category_id: cat.id,
            content_type: "markdown",
            content: "E2E 测试文章内容",
            status: "published",
          }).catch(() => {})
        }
      }
    } catch { /* 忽略 */ }

    // 3. 创建案例
    try {
      await post("/api/admin/cases/list/create", {
        student_name: "E2E案例学生",
        university: "E2E大学",
        program: "E2E专业",
        year: 2026,
        testimonial: "E2E 测试感言",
      }).catch(() => {})
    } catch { /* 忽略 */ }

    // 4. 创建院校
    try {
      await post("/api/admin/universities/list/create", {
        name: `E2E测试大学${Date.now()}`,
        name_en: "E2E Test University",
        country: "德国",
        city: "柏林",
        programs: ["计算机科学", "机械工程"],
        description: "E2E 测试院校",
      }).catch(() => {})
    } catch { /* 忽略 */ }
  })

  /* ── 预热所有页面（触发 Next.js dev 编译） ── */
  for (const p of WARMUP_PAGES) {
    await page.goto(`http://localhost${p}`, { waitUntil: "load", timeout: 60_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  }

  await browser.close()
}

export default globalSetup
