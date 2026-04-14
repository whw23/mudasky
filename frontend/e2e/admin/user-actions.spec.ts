/**
 * 用户管理操作 E2E 测试。
 * 覆盖展开面板后的状态切换、角色分配、密码重置、强制登出等操作 UI。
 */

import { test, expect } from "../fixtures/base"

/* 此测试需要有效的登录状态，单独运行或在 globalSetup 后立即运行 */
test.describe("用户管理操作", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/users")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    // 等待表格数据加载
    await adminPage.locator("table tbody tr").first().waitFor({ timeout: 15000 })
    // 展开第一个用户
    await adminPage.locator("table tbody tr").first().click()
    // 等待展开面板内容加载（面板会调 API 获取详情）
    await adminPage.getByText("基本信息").waitFor({ timeout: 15_000 })
    await adminPage.waitForTimeout(1000)
  })

  test("展开面板显示基本信息区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("基本信息")).toBeVisible()
  })

  test("展开面板显示角色分配区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("分配角色")).toBeVisible()
    // 角色下拉选择器
    const roleSelect = adminPage.locator("select").first()
    await expect(roleSelect).toBeVisible()
  })

  test("展开面板显示存储配额区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("存储配额")).toBeVisible()
  })

  test("展开面板显示重置密码区域", async ({ adminPage }) => {
    await expect(adminPage.getByText("重置密码")).toBeVisible()
  })

  test("展开面板显示强制登出按钮", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: "强制登出" })).toBeVisible()
  })

  test("状态切换按钮可见", async ({ adminPage }) => {
    // superuser 用户应该有禁用按钮
    const toggleBtn = adminPage.getByRole("button", { name: /禁用|启用/ })
    await expect(toggleBtn).toBeVisible()
  })
})
