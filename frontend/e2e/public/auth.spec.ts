/**
 * 认证流程 E2E 测试。
 * 覆盖登录弹窗交互、密码登录、登出、未登录重定向。
 */

import { test, expect } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("认证 — 登录弹窗", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("未登录时显示登录/注册按钮", async ({ page }) => {
    const btn = page.getByRole("button", { name: /登录/ })
    await expect(btn).toBeVisible()
  })

  test("点击登录按钮打开弹窗", async ({ page }) => {
    await page.getByRole("button", { name: /登录/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("tab", { name: "手机验证码" })).toBeVisible()
    await expect(dialog.getByRole("tab", { name: "账号密码" })).toBeVisible()
  })

  test("手机验证码 tab 默认选中", async ({ page }) => {
    await page.getByRole("button", { name: /登录/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    const smsTab = dialog.getByRole("tab", { name: "手机验证码" })
    await expect(smsTab).toHaveAttribute("aria-selected", "true")
  })

  test("切换到账号密码 tab", async ({ page }) => {
    await page.getByRole("button", { name: /登录/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    await dialog.getByRole("tab", { name: "账号密码" }).click()
    await expect(dialog.getByRole("tabpanel")).toContainText("密码")
  })

  test("关闭弹窗", async ({ page }) => {
    await page.getByRole("button", { name: /登录/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    await dialog.getByRole("button", { name: "Close" }).click()
    await expect(dialog).not.toBeVisible()
  })
})

test.describe("认证 — 密码登录", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: /登录/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    await dialog.getByRole("tab", { name: "账号密码" }).click()
    await expect(page.getByRole("tabpanel")).toBeVisible()
  })

  test("错误密码显示错误提示", async ({ page }) => {
    const dialog = page.getByRole("dialog")
    const panel = dialog.getByRole("tabpanel")
    const inputs = panel.getByRole("textbox")
    await inputs.first().fill("mudasky")
    await inputs.nth(1).fill("wrongpassword")
    await panel.getByRole("button", { name: "登录" }).click()
    // 等待错误提示
    await expect(page.locator(".text-destructive")).toBeVisible()
  })

  test("正确凭据登录成功", async ({ page }) => {
    const dialog = page.getByRole("dialog")
    const panel = dialog.getByRole("tabpanel")
    const inputs = panel.getByRole("textbox")
    await inputs.first().fill("mudasky")
    await inputs.nth(1).fill("mudasky@12321.")
    await panel.getByRole("button", { name: "登录" }).click()
    // 弹窗关闭
    await expect(dialog).not.toBeVisible()
  })
})

test.describe("认证 — 登出", () => {
  test("登录后登出，刷新不再登录", async ({ page }) => {
    // 先登录
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: /登录/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    await dialog.getByRole("tab", { name: "账号密码" }).click()
    await expect(page.getByRole("tabpanel")).toBeVisible()
    const panel = dialog.getByRole("tabpanel")
    const inputs = panel.getByRole("textbox")
    await inputs.first().fill("mudasky")
    await inputs.nth(1).fill("mudasky@12321.")
    await panel.getByRole("button", { name: "登录" }).click()
    await expect(dialog).not.toBeVisible()

    // 登出
    // 导航到 portal 触发已登录状态
    await page.goto("/portal/profile")
    await page.waitForLoadState("networkidle")
    await page.locator("main").waitFor().catch(() => {})
    // 可能有登出按钮或需要通过 API 登出
    await page.evaluate(() => fetch("/api/auth/logout", { method: "POST", credentials: "include" }))
    await page.reload()
    await page.waitForLoadState("networkidle")
    // 刷新后应该被重定向到首页（因为 portal 需要登录）
    await page.waitForURL(/\/$/)
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe("认证 — 未登录重定向", () => {
  test("未登录访问 portal 重定向到首页", async ({ page }) => {
    await page.goto("/portal/profile")
    await page.waitForURL(/\/$/)
    await expect(page).toHaveURL(/\/$/)
  })

  test("未登录访问 admin 重定向到首页", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await page.waitForURL(/\/$/)
    await expect(page).toHaveURL(/\/$/)
  })
})
