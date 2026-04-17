/**
 * 侧边栏导航和仪表盘业务操作函数。
 * 验证 admin 侧边栏菜单项、导航跳转、仪表盘统计卡片。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 验证管理员侧边栏 */
export async function verifyAdminSidebar(page: Page, args?: Record<string, unknown>): Promise<void> {
  const role = String(args?.role ?? "superuser")

  await page.goto("/admin/dashboard")
  await page.locator("main").waitFor()

  // 桌面端侧边栏（避免匹配移动端隐藏的 aside）
  const sidebar = page.locator("aside").first()

  // 所有管理菜单项
  const menuItems = [
    "用户管理", "角色管理", "文章管理", "分类管理",
    "院校管理", "案例管理", "通用配置", "网页设置",
  ]

  // 根据角色验证可见性
  if (role === "superuser") {
    // superuser 能看到所有菜单
    for (const item of menuItems) {
      await expect(sidebar.getByRole("link", { name: item })).toBeVisible()
    }
  } else {
    // 其他角色根据权限判断（此处简化处理）
    // 实际应根据权限配置动态验证
  }

  // 验证返回官网链接
  await expect(sidebar.getByText("返回官网")).toBeVisible()
}

/** 测试管理员导航 */
export async function testAdminNavigation(page: Page): Promise<void> {
  await page.goto("/admin/dashboard")
  await page.locator("main").waitFor()

  const sidebar = page.locator("aside").first()

  // 测试用户管理导航
  await sidebar.getByRole("link", { name: "用户管理" }).click()
  await page.locator("main").waitFor()
  await expect(page).toHaveURL(/\/admin\/users/)

  // 测试文章管理导航
  await sidebar.getByRole("link", { name: "文章管理" }).click()
  await page.locator("main").waitFor()
  await expect(page).toHaveURL(/\/admin\/articles/)

  // 测试角色管理导航
  await sidebar.getByRole("link", { name: "角色管理" }).click()
  await page.locator("main").waitFor()
  await expect(page).toHaveURL(/\/admin\/roles/)

  // 测试分类管理导航
  await sidebar.getByRole("link", { name: "分类管理" }).click()
  await page.locator("main").waitFor()
  await expect(page).toHaveURL(/\/admin\/categories/)

  // 测试案例管理导航
  await sidebar.getByRole("link", { name: "案例管理" }).click()
  await page.locator("main").waitFor()
  await expect(page).toHaveURL(/\/admin\/cases/)

  // 测试院校管理导航
  await sidebar.getByRole("link", { name: "院校管理" }).click()
  await page.locator("main").waitFor()
  await expect(page).toHaveURL(/\/admin\/universities/)

  // 测试返回官网
  await sidebar.getByText("返回官网").click()
  await page.waitForURL(/^(?!.*\/admin)/)
}

/** 验证仪表盘 */
export async function verifyDashboard(page: Page): Promise<void> {
  await page.goto("/admin/dashboard")
  await page.locator("main").waitFor()

  // 验证统计卡片
  await expect(page.getByText("用户总数")).toBeVisible()
  await expect(page.getByText("文章总数")).toBeVisible()
  await expect(page.getByText("已发布文章")).toBeVisible()
  await expect(page.getByText("分类总数")).toBeVisible()

  // 验证最近记录列表
  await expect(page.getByText("最近注册用户")).toBeVisible()
  await expect(page.getByText("最近文章")).toBeVisible()

  // 验证快捷操作链接
  await expect(page.getByText("快捷操作")).toBeVisible()

  const main = page.locator("main")
  const userMgmt = main.getByRole("link", { name: "用户管理" })
    .or(main.getByRole("button", { name: "用户管理" }))
  const articleMgmt = main.getByRole("link", { name: "文章管理" })
    .or(main.getByRole("button", { name: "文章管理" }))

  await expect(userMgmt.first()).toBeVisible()
  await expect(articleMgmt.first()).toBeVisible()
}

/** 验证菜单高亮状态 */
export async function verifyMenuHighlight(page: Page, args?: Record<string, unknown>): Promise<void> {
  const menuName = String(args?.menuName ?? "用户管理")
  const path = String(args?.path ?? "/admin/users")

  await page.goto(path)
  await page.locator("main").waitFor()

  // 验证当前菜单有激活样式
  const activeLink = page.locator("aside").first().getByRole("link", { name: menuName })
  await expect(activeLink).toHaveClass(/bg-primary/)
}
