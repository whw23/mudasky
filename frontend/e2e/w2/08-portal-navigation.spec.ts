/**
 * W2 用户中心导航测试。
 * 覆盖侧边栏菜单、导航高亮、返回官网链接。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"

test.describe("W2 用户中心导航", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/portal/overview")
  })

  test("侧边栏显示所有菜单项", async ({ page }) => {
    await expect(page.getByRole("link", { name: "总览" })).toBeVisible()
    await expect(page.getByRole("link", { name: "个人资料" })).toBeVisible()
    await expect(page.getByRole("link", { name: "文档管理" })).toBeVisible()
    trackComponent("UserSidebar", "所有菜单链接")
  })

  test("点击个人资料导航正确", async ({ page }) => {
    await page.getByRole("link", { name: "个人资料" }).click()
    await page.waitForURL(/.*portal\/profile.*/)
    await expect(page.getByText("基本信息")).toBeVisible()
    trackComponent("UserSidebar", "导航到个人资料")
  })

  test("点击文档管理导航正确", async ({ page }) => {
    await page.getByRole("link", { name: "文档管理" }).click()
    await page.waitForURL(/.*portal\/documents.*/)
    await expect(page.getByRole("heading", { name: /文档/ })).toBeVisible()
    trackComponent("UserSidebar", "导航到文档管理")
  })

  test("当前页面菜单高亮", async ({ page }) => {
    // 总览页的链接应有激活样式（bg-primary/10）
    const overviewLink = page.getByRole("link", { name: "总览" })
    await expect(overviewLink).toHaveClass(/text-primary/)

    // 其他链接不应有激活样式
    const profileLink = page.getByRole("link", { name: "个人资料" })
    await expect(profileLink).not.toHaveClass(/text-primary/)

    trackComponent("UserSidebar", "当前页面高亮")
  })

  test("返回官网链接可用", async ({ page }) => {
    const backLink = page.getByRole("link", { name: "返回官网" })
    await expect(backLink).toBeVisible()
    await backLink.click()
    // 应导航到首页
    await page.waitForURL(/.*\/(?:zh|en)?(?:\/)?$/)
    trackComponent("UserSidebar", "返回官网")
  })

  test("导航后侧边栏高亮更新", async ({ page }) => {
    // 先在总览页
    await expect(page.getByRole("link", { name: "总览" })).toHaveClass(/text-primary/)

    // 点击文档管理
    await page.getByRole("link", { name: "文档管理" }).click()
    await page.waitForURL(/.*portal\/documents.*/)

    // 文档管理应高亮，总览不应高亮
    await expect(page.getByRole("link", { name: "文档管理" })).toHaveClass(/text-primary/)
    await expect(page.getByRole("link", { name: "总览" })).not.toHaveClass(/text-primary/)

    trackComponent("UserSidebar", "导航高亮更新")
  })
})
