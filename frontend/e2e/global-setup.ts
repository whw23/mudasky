/**
 * Playwright 全局初始化。
 * 登录 mudasky 管理员并保存 cookie/storageState 供所有测试复用。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")

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

  await page.goto("http://localhost/", { waitUntil: "networkidle", timeout: 60_000 })

  /* 等待水合完成 */
  const loginBtn = page.getByRole("button", { name: /登录/ })
  await loginBtn.waitFor({ timeout: 30_000 })

  await loginBtn.click()

  /* 等待弹窗 */
  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ timeout: 15_000 })

  /* 切到账号密码 tab */
  await page.getByRole("tab", { name: "账号密码" }).click()
  await page.getByRole("tabpanel").waitFor({ timeout: 5_000 })

  /* 用 role=textbox 定位输入框 */
  const inputs = dialog.getByRole("textbox")
  await inputs.first().waitFor({ timeout: 5_000 })
  await inputs.first().fill("mudasky")
  await inputs.nth(1).fill("mudasky@12321.")

  /* 点击 tabpanel 内的登录按钮 */
  await page.getByRole("tabpanel").getByRole("button", { name: "登录" }).click()

  /* 等待弹窗关闭 */
  try {
    await dialog.waitFor({ state: "hidden", timeout: 15_000 })
  } catch {
    await page.screenshot({ path: path.join(dir, "login-failed.png") })
    throw new Error("登录失败 — 截图已保存到 e2e/.auth/login-failed.png")
  }

  /* 保存登录状态 */
  await context.storageState({ path: AUTH_FILE })

  /* 预热所有管理后台页面 — 用已登录的浏览器访问触发 SSR + client bundle 编译 */
  const adminPages = [
    "/admin/dashboard", "/admin/users", "/admin/roles",
  ]
  for (const p of adminPages) {
    await page.goto(`http://localhost${p}`, { waitUntil: "load", timeout: 60_000 })
    /* 等待该页面的 JS bundle 编译完成 */
    await page.waitForFunction(
      () => {
        const indicator = document.querySelector('[data-next-mark]')
        return !indicator || document.readyState === "complete"
      },
      { timeout: 60_000 },
    ).catch(() => {})
    await page.waitForLoadState("networkidle")
  }

  await browser.close()
}

export default globalSetup
