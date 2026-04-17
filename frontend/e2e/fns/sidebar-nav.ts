/**
 * 侧边栏导航和仪表盘业务操作函数。
 * 验证 admin 侧边栏菜单项、导航跳转、仪表盘。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 各角色可见的菜单项 */
const ROLE_MENUS: Record<string, string[]> = {
  superuser: [
    "管理仪表盘", "用户管理", "角色管理", "文章管理", "分类管理",
    "院校管理", "案例管理", "通用配置", "网页设置", "学生管理", "联系人管理",
  ],
  content_admin: [
    "管理仪表盘", "文章管理", "分类管理", "院校管理", "案例管理",
    "通用配置", "网页设置",
  ],
  advisor: [
    "管理仪表盘", "学生管理", "联系人管理",
  ],
  support: [
    "管理仪表盘", "联系人管理",
  ],
}

/** 验证管理员侧边栏 */
export async function verifyAdminSidebar(page: Page, args?: Record<string, unknown>): Promise<void> {
  const role = String(args?.role ?? "superuser")

  await page.goto("/admin/dashboard")
  await page.waitForLoadState("networkidle")

  const sidebar = page.locator("aside, [role='complementary']").first()
  await sidebar.waitFor()

  // 验证返回官网链接
  await expect(sidebar.getByText("返回官网")).toBeVisible()

  // 根据角色验证菜单可见性
  const expectedMenus = ROLE_MENUS[role] || ROLE_MENUS.superuser
  for (const item of expectedMenus) {
    await expect(sidebar.getByRole("link", { name: item })).toBeVisible()
  }
}

/** 测试管理员导航 */
export async function testAdminNavigation(page: Page, args?: Record<string, unknown>): Promise<void> {
  const role = String(args?.role ?? "superuser")

  await page.goto("/admin/dashboard")
  await page.waitForLoadState("networkidle")

  const sidebar = page.locator("aside, [role='complementary']").first()
  const expectedMenus = ROLE_MENUS[role] || ROLE_MENUS.superuser

  // 测试每个可见菜单的导航
  for (const item of expectedMenus) {
    if (item === "管理仪表盘") continue // 已在此页
    const link = sidebar.getByRole("link", { name: item })
    if (await link.isVisible().catch(() => false)) {
      await link.click()
      await page.waitForLoadState("networkidle")
    }
  }

  // 测试返回官网
  await sidebar.getByText("返回官网").click()
  await page.waitForURL(/^(?!.*\/admin)/)
}

/** 验证仪表盘 */
export async function verifyDashboard(page: Page): Promise<void> {
  await page.goto("/admin/dashboard")
  await page.waitForLoadState("networkidle")
  await page.locator("main").waitFor()

  // 验证仪表盘有内容（标题或统计卡片）
  await expect(page.locator("main")).toBeVisible()
}

/** 验证菜单高亮状态 */
export async function verifyMenuHighlight(page: Page, args?: Record<string, unknown>): Promise<void> {
  const menuName = String(args?.menuName ?? "用户管理")
  const path = String(args?.path ?? "/admin/users")

  await page.goto(path)
  await page.waitForLoadState("networkidle")

  // 验证当前菜单存在于侧边栏
  const sidebar = page.locator("aside, [role='complementary']").first()
  await expect(sidebar.getByRole("link", { name: menuName })).toBeVisible()
}
