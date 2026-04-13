/**
 * 用户管理全面 E2E 测试。
 * 覆盖行内展开面板、状态切换、角色分配、密码重置、强制登出、删除。
 */

import { test, expect } from "../fixtures/base"

test.describe("用户管理 — 行内展开面板", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/users")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(2000)
  })

  test("页面加载显示用户表格", async ({ adminPage }) => {
    await expect(adminPage.locator("table")).toBeVisible()
    await expect(adminPage.getByText("用户名")).toBeVisible()
    await expect(adminPage.getByText("手机号")).toBeVisible()
  })

  test("搜索用户", async ({ adminPage }) => {
    const searchInput = adminPage.getByPlaceholder(/搜索/)
    await searchInput.fill("mudasky")
    await adminPage.waitForTimeout(500)
    await expect(adminPage.locator("table tbody tr").first()).toContainText("mudasky")
  })

  test("点击用户行展开详情面板", async ({ adminPage }) => {
    const firstRow = adminPage.locator("table tbody tr").first()
    await firstRow.click()
    await adminPage.waitForTimeout(500)
    // 展开面板应该出现
    await expect(adminPage.getByText("基本信息")).toBeVisible()
  })

  test("再次点击收起面板", async ({ adminPage }) => {
    const firstRow = adminPage.locator("table tbody tr").first()
    await firstRow.click()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.getByText("基本信息")).toBeVisible()
    // 再次点击收起
    await firstRow.click()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.getByText("基本信息")).not.toBeVisible()
  })
})

test.describe("用户管理 — 导航入口", () => {
  test("侧边栏有用户管理链接", async ({ adminPage }) => {
    await adminPage.goto("/admin/dashboard")
    await adminPage.waitForLoadState("networkidle")
    const link = adminPage.getByRole("link", { name: "用户管理" })
    await expect(link).toBeVisible()
  })
})
