/**
 * Playwright 全局初始化。
 * 登录管理员 → 保存 storageState → 种子测试数据 → 预热入口页。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")
const WARMUP_PAGES = ["/", "/admin/dashboard", "/portal/overview"]

/** 从 storageState 提取 access_token cookie */
function getToken(): string {
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"))
  return state.cookies?.find((c: { name: string }) => c.name === "access_token")?.value ?? ""
}

/** 用管理员 token 调用 API */
async function apiPost(path: string, body: unknown) {
  const res = await fetch(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: `access_token=${getToken()}`,
    },
    body: JSON.stringify(body),
  })
  return res
}

async function apiGet(path: string) {
  return fetch(`http://localhost${path}`, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Cookie: `access_token=${getToken()}`,
    },
  })
}

async function globalSetup(_config: FullConfig) {
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  /* 如果已有有效的 auth 文件（1 小时内），跳过 */
  if (fs.existsSync(AUTH_FILE)) {
    const stat = fs.statSync(AUTH_FILE)
    if (Date.now() - stat.mtimeMs < 3600_000) return
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

  /* ── 保存登录状态 ── */
  await context.storageState({ path: AUTH_FILE })
  await browser.close()

  /* ── 种子测试数据（Node.js 层 fetch，从 storageState 提取 cookie） ── */
  const log: string[] = []

  // 1. 注册测试用户（不带管理员 cookie）
  try {
    const smsRes = await fetch("http://localhost/api/auth/sms-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ phone: "+8613900000088" }),
    })
    if (smsRes.ok) {
      const smsData = await smsRes.json() as { code: string }
      const regRes = await fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ phone: "+8613900000088", code: smsData.code, username: "E2E测试用户" }),
      })
      log.push(`register: ${regRes.status}`)
    }
  } catch { log.push("register: skipped") }

  // 2. 清除非管理员用户的 superuser 角色（让 user-actions 测试能操作）
  try {
    const usersRes = await apiGet("/api/admin/users/list")
    if (usersRes.ok) {
      const userData = await usersRes.json() as { items: { id: string; username: string; phone: string; role_name: string }[] }
      for (const u of userData.items ?? []) {
        // 跳过主管理员，只处理其他 superuser 用户
        if (u.username !== "mudasky" && u.role_name === "superuser") {
          const r = await apiPost("/api/admin/users/list/detail/assign-role", { user_id: u.id, role_id: null })
          log.push(`unassign ${u.phone}: ${r.status}`)
        }
      }
    }
  } catch { log.push("unassign: error") }

  // 3. 创建文章（每个分类一篇）
  try {
    const catRes = await apiGet("/api/admin/categories/list")
    if (catRes.ok) {
      const cats = await catRes.json() as { id: string; name: string; slug: string }[]
      for (const cat of Array.isArray(cats) ? cats : []) {
        const r = await apiPost("/api/admin/articles/list/create", {
          title: `E2E文章-${cat.name}`, slug: `e2e-${cat.slug}-${Date.now()}`,
          category_id: cat.id, content_type: "markdown", content: "E2E测试", status: "published",
        })
        log.push(`article ${cat.slug}: ${r.status}`)
      }
    }
  } catch { log.push("articles: error") }

  // 4. 创建案例
  try {
    const r = await apiPost("/api/admin/cases/list/create", {
      student_name: "E2E案例学生", university: "E2E大学", program: "E2E专业", year: 2026, testimonial: "E2E感言",
    })
    log.push(`case: ${r.status}`)
  } catch { log.push("case: error") }

  // 5. 创建院校
  try {
    const r = await apiPost("/api/admin/universities/list/create", {
      name: `E2E测试大学${Date.now()}`, name_en: "E2E Test Uni", country: "德国", city: "柏林",
      programs: ["计算机", "机械"], description: "E2E测试",
    })
    log.push(`university: ${r.status}`)
  } catch { log.push("university: error") }

  // eslint-disable-next-line no-console
  console.log("[global-setup] seed:", log.join(", "))

  /* ── 预热入口页（新开浏览器，用保存的 storageState） ── */
  const browser2 = await chromium.launch()
  const ctx2 = await browser2.newContext({ locale: "zh-CN", storageState: AUTH_FILE })
  const page2 = await ctx2.newPage()
  for (const p of WARMUP_PAGES) {
    await page2.goto(`http://localhost${p}`, { waitUntil: "load", timeout: 60_000 })
    await page2.waitForLoadState("networkidle").catch(() => {})
  }
  await browser2.close()
}

export default globalSetup
