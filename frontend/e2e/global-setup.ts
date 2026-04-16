/**
 * Playwright 全局初始化。
 * 用 e2e_test_superuser 登录 → 保存 W1 storageState → 清理信号 → 预热。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"
import { cleanup as cleanupSignals } from "./helpers/signal"
import { cleanupBreakers } from "./fixtures/base"

const AUTH_DIR = path.join(__dirname, ".auth")
const W1_AUTH = path.join(AUTH_DIR, "w1.json")
const BASE = process.env.BASE_URL || "http://localhost"
const ADMIN_USER = "e2e_test_superuser"
const ADMIN_PASS = "e2e_test_superuser@12321."

const WARMUP_PAGES = [
  "/",
  "/admin/dashboard",
  "/admin/articles",
  "/admin/users",
  "/admin/cases",
  "/admin/categories",
  "/admin/universities",
  "/admin/roles",
  "/admin/students",
  "/admin/contacts",
  "/admin/general-settings",
  "/admin/web-settings",
  "/portal/overview",
  "/portal/profile",
  "/portal/documents",
]

async function globalSetup(_config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  /* 如果已有有效的 auth 文件（1 小时内），跳过 */
  if (fs.existsSync(W1_AUTH)) {
    const stat = fs.statSync(W1_AUTH)
    if (Date.now() - stat.mtimeMs < 3600_000) return
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ locale: "zh-CN" })
  const page = await context.newPage()

  /* ── 登录 ── */
  // 生产模式首次 SSR 编译可能需要 60s+
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 })
  const loginBtn = page.getByRole("button", { name: /登录/ })
  await loginBtn.waitFor({ timeout: 60_000 })

  // 重试点击登录按钮（生产模式水合较慢）
  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 5; i++) {
    await loginBtn.click()
    try {
      await dialog.waitFor({ timeout: 5_000 })
      break
    } catch {
      if (i === 4) throw new Error("登录弹窗未打开 — 5 次重试均失败")
    }
  }
  await page.getByRole("tab", { name: "账号密码" }).click()
  await page.getByRole("tabpanel").waitFor({ timeout: 10_000 })

  const inputs = dialog.getByRole("textbox")
  await inputs.first().waitFor({ timeout: 5_000 })
  await inputs.first().fill(ADMIN_USER)
  await inputs.nth(1).fill(ADMIN_PASS)
  // 重试点击登录（处理 JS 水合未完成导致首次点击无效）
  const loginBtn2 = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
  for (let i = 0; i < 5; i++) {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login"),
      { timeout: 10_000 },
    ).catch(() => null)
    await loginBtn2.click()
    const res = await responsePromise
    if (res) {
      if (res.status() !== 200) {
        const body = await res.json().catch(() => ({}))
        await page.screenshot({ path: path.join(AUTH_DIR, "login-failed.png") })
        throw new Error(`登录 API 返回 ${res.status()}: ${JSON.stringify(body)}`)
      }
      break
    }
  }

  try {
    await dialog.waitFor({ state: "hidden", timeout: 10_000 })
  } catch {
    await page.screenshot({ path: path.join(AUTH_DIR, "login-failed.png") })
    throw new Error("登录失败 — 截图已保存到 e2e/.auth/login-failed.png")
  }

  await context.storageState({ path: W1_AUTH })
  await browser.close()

  /* ── 清理信号和熔断状态 ── */
  cleanupSignals()
  cleanupBreakers()

  /* ── 预热入口页 ── */
  const browser2 = await chromium.launch()
  const ctx2 = await browser2.newContext({ locale: "zh-CN", storageState: W1_AUTH })
  const page2 = await ctx2.newPage()
  for (const p of WARMUP_PAGES) {
    await page2.goto(`${BASE}${p}`, { waitUntil: "load", timeout: 60_000 })
    await page2.waitForLoadState("networkidle").catch(() => {})
  }
  await browser2.close()
}

export default globalSetup
