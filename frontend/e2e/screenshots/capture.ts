/**
 * 截图脚本：登录后截取所有管理后台和用户中心页面。
 */

import { chromium } from "@playwright/test"
import * as path from "path"

const SCREENSHOTS_DIR = path.join(__dirname)

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  // 登录
  console.log("Logging in...")
  await page.goto("http://localhost/", { waitUntil: "networkidle", timeout: 60000 })
  await page.waitForTimeout(3000)
  await page.getByRole("button", { name: /登录/ }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ timeout: 15000 })
  await dialog.getByRole("tab", { name: "账号密码" }).click()
  await page.waitForTimeout(500)
  const inputs = dialog.getByRole("textbox")
  await inputs.first().fill(process.env.SEED_USER_1_USERNAME!)
  await inputs.nth(1).fill(process.env.SEED_USER_1_PASSWORD!)
  await page.getByRole("tabpanel").getByRole("button", { name: "登录" }).click()
  await dialog.waitFor({ state: "hidden", timeout: 15000 })
  console.log("Logged in!")
  await page.waitForTimeout(2000)

  // 管理后台页面
  const adminPages = [
    "/admin/dashboard",
    "/admin/users",
    "/admin/roles",
    "/admin/web-settings",
    "/admin/general-settings",
    "/admin/web-settings",
  ]

  for (const p of adminPages) {
    const name = p.replace(/\//g, "-").slice(1)
    console.log(`Capturing ${p}...`)
    await page.goto(`http://localhost${p}`, { waitUntil: "networkidle", timeout: 60000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true })
  }

  // 用户中心页面
  const portalPages = [
    "/portal/overview",
    "/portal/profile",
    "/portal/documents",
  ]

  for (const p of portalPages) {
    const name = p.replace(/\//g, "-").slice(1)
    console.log(`Capturing ${p}...`)
    await page.goto(`http://localhost${p}`, { waitUntil: "networkidle", timeout: 60000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true })
  }

  await browser.close()
  console.log("All screenshots captured!")
}

main().catch(console.error)
