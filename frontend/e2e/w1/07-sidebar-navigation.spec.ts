/**
 * W1 侧边栏导航和仪表盘测试。
 * 仪表盘统计卡片、菜单项导航、返回官网链接、快捷操作。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"

test.describe("仪表盘", () => {
  test("统计卡片正确加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")

    // 统计卡片可见（至少有用户总数、文章总数）
    await expect(page.getByText("用户总数")).toBeVisible()
    await expect(page.getByText("文章总数")).toBeVisible()
    await expect(page.getByText("已发布文章")).toBeVisible()
    await expect(page.getByText("分类总数")).toBeVisible()
    trackComponent("StatCard", "统计卡片")
  })

  test("最近记录列表可见", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    await expect(page.getByText("最近注册用户")).toBeVisible()
    await expect(page.getByText("最近文章")).toBeVisible()
    trackComponent("RecentList", "最近记录")
  })

  test("快捷操作链接可见", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    await expect(page.getByText("快捷操作")).toBeVisible()
    // Button render={<Link>} 被 base-ui 赋予 role="button"，用 link/button 均可匹配
    const main = page.locator("main")
    const userMgmt = main.getByRole("link", { name: "用户管理" })
      .or(main.getByRole("button", { name: "用户管理" }))
    const articleMgmt = main.getByRole("link", { name: "文章管理" })
      .or(main.getByRole("button", { name: "文章管理" }))
    await expect(userMgmt.first()).toBeVisible()
    await expect(articleMgmt.first()).toBeVisible()
    trackComponent("Dashboard", "快捷操作")
  })
})

test.describe("侧边栏导航", () => {
  test("所有管理菜单项可见", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")

    // 桌面端侧边栏（避免匹配移动端隐藏的 aside）
    const sidebar = page.locator("aside").first()
    const menuItems = [
      "用户管理", "角色管理", "文章管理", "分类管理",
      "院校管理", "案例管理", "通用配置", "网页设置",
    ]
    for (const item of menuItems) {
      await expect(sidebar.getByRole("link", { name: item })).toBeVisible()
    }
    trackComponent("AdminSidebar", "所有菜单链接")
  })

  test("点击菜单导航到正确页面", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")

    const sidebar = page.locator("aside").first()

    // 点击用户管理
    await sidebar.getByRole("link", { name: "用户管理" }).click()
    await page.locator("main").waitFor()
    await expect(page).toHaveURL(/\/admin\/users/)
    trackComponent("AdminSidebar", "用户管理导航")

    // 点击文章管理
    await sidebar.getByRole("link", { name: "文章管理" }).click()
    await page.locator("main").waitFor()
    await expect(page).toHaveURL(/\/admin\/articles/)
    trackComponent("AdminSidebar", "文章管理导航")

    // 点击角色管理
    await sidebar.getByRole("link", { name: "角色管理" }).click()
    await page.locator("main").waitFor()
    await expect(page).toHaveURL(/\/admin\/roles/)
    trackComponent("AdminSidebar", "角色管理导航")
  })

  test("返回官网链接可见并可点击", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")

    const backLink = page.locator("aside").first().getByText("返回官网")
    await expect(backLink).toBeVisible()
    trackComponent("AdminSidebar", "返回官网链接")

    // 点击返回官网
    await backLink.click()
    await page.waitForURL(/^(?!.*\/admin)/)
    trackComponent("AdminSidebar", "返回官网导航")
  })

  test("点击分类管理 — 分类列表加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    await page.locator("aside").first().getByRole("link", { name: "分类管理" }).click()
    await page.locator("main").waitFor()
    await expect(page).toHaveURL(/\/admin\/categories/)
    // 有"创建分类"按钮
    await expect(page.getByRole("button", { name: "创建分类" })).toBeVisible()
    trackComponent("AdminSidebar", "分类管理导航")
  })

  test("点击案例管理 — 案例列表加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    await page.locator("aside").first().getByRole("link", { name: "案例管理" }).click()
    await page.locator("main").waitFor()
    await expect(page).toHaveURL(/\/admin\/cases/)
    await expect(page.getByRole("button", { name: "添加案例" })).toBeVisible()
    trackComponent("AdminSidebar", "案例管理导航")
  })

  test("点击院校管理 — 院校列表加载", async ({ page }) => {
    await gotoAdmin(page, "/admin/dashboard")
    await page.locator("aside").first().getByRole("link", { name: "院校管理" }).click()
    await page.locator("main").waitFor()
    await expect(page).toHaveURL(/\/admin\/universities/)
    await expect(page.getByRole("button", { name: "添加院校" })).toBeVisible()
    trackComponent("AdminSidebar", "院校管理导航")
  })

  test("当前菜单高亮状态", async ({ page }) => {
    await gotoAdmin(page, "/admin/users")
    // 用户管理链接应有激活样式（bg-primary/20 class）
    const userLink = page.locator("aside").first().getByRole("link", { name: "用户管理" })
    await expect(userLink).toHaveClass(/bg-primary/)
    trackComponent("AdminSidebar", "菜单高亮")
  })
})
