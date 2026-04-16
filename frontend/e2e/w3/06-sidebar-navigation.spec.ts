/**
 * W3 侧边栏导航测试。
 * 验证 advisor 角色侧边栏菜单项的可见性和导航。
 */

import { test, expect, gotoAdmin, trackComponent, trackSecurity } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

test.describe("W3 侧边栏导航", () => {
  test.beforeEach(async () => {
    await waitFor("roles_assigned", 90_000)
  })

  test("侧边栏仅显示有权限的菜单项", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    trackComponent("AdminSidebar", "菜单可见性")

    const sidebar = page.locator("[role='complementary'] nav")

    // advisor 应能看到的菜单
    await expect(sidebar.getByText("学生管理")).toBeVisible()
    await expect(sidebar.getByText("联系人管理")).toBeVisible()
    await expect(sidebar.getByText("管理仪表盘")).toBeVisible()
  })

  test("点击学生管理导航正确", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    trackComponent("AdminSidebar", "学生管理导航")

    const sidebar = page.locator("[role='complementary'] nav")
    await sidebar.getByText("学生管理").click()
    await page.waitForURL(/\/admin\/students/)

    const table = page.locator("table")
    await expect(table).toBeVisible()
  })

  test("点击联系人管理导航正确", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    trackComponent("AdminSidebar", "联系人管理导航")

    const sidebar = page.locator("[role='complementary'] nav")
    await sidebar.getByText("联系人管理").click()
    await page.waitForURL(/\/admin\/contacts/)

    const table = page.locator("table")
    await expect(table).toBeVisible()
  })

  test("管理仪表盘加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    trackComponent("AdminSidebar", "仪表盘加载")

    await page.locator("main").waitFor()
    await expect(page.getByText("403")).not.toBeVisible()
  })

  test("返回官网链接可用", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    trackComponent("AdminSidebar", "返回官网")

    const backLink = page.locator("[role='complementary']").getByText("返回官网")
    await expect(backLink).toBeVisible()

    await backLink.click()
    await page.waitForURL(/^(?!.*\/admin)/)
  })

  test("负向：无权限菜单项不可见", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    trackSecurity("菜单权限", "advisor无权限菜单隐藏")

    const sidebar = page.locator("[role='complementary'] nav")

    // advisor 不应看到的菜单
    await expect(sidebar.getByText("用户管理")).not.toBeVisible()
    await expect(sidebar.getByText("文章管理")).not.toBeVisible()
    await expect(sidebar.getByText("角色管理")).not.toBeVisible()
    await expect(sidebar.getByText("分类管理")).not.toBeVisible()
  })
})
