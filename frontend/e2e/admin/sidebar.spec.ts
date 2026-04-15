/**
 * 管理后台侧边栏 E2E 测试。
 * 验证所有导航链接可见并可导航。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("管理后台侧边栏", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/dashboard")
  })

  test("显示所有管理菜单项", async ({ adminPage }) => {
    await expect(adminPage.getByRole("link", { name: "管理仪表盘" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "用户管理" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "角色管理" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "文章管理" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "分类管理" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "院校管理" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "案例管理" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "通用配置" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "网页设置" })).toBeVisible()
  })

  test("返回官网链接", async ({ adminPage }) => {
    const backLink = adminPage.getByRole("link", { name: "返回官网" })
    await expect(backLink).toBeVisible()
  })

  test("点击文章管理导航到正确页面", async ({ adminPage }) => {
    await adminPage.getByRole("link", { name: "文章管理" }).click()
    await adminPage.waitForURL(/\/admin\/articles/, { timeout: 10_000 })
    await expect(adminPage).toHaveURL(/\/admin\/articles/)
  })

  test("点击分类管理导航到正确页面", async ({ adminPage }) => {
    await adminPage.getByRole("link", { name: "分类管理" }).click()
    await adminPage.waitForURL(/\/admin\/categories/, { timeout: 10_000 })
    await expect(adminPage).toHaveURL(/\/admin\/categories/)
  })

  test("点击院校管理导航到正确页面", async ({ adminPage }) => {
    await adminPage.getByRole("link", { name: "院校管理" }).click()
    await adminPage.waitForURL(/\/admin\/universities/, { timeout: 10_000 })
    await expect(adminPage).toHaveURL(/\/admin\/universities/)
  })

  test("点击案例管理导航到正确页面", async ({ adminPage }) => {
    await adminPage.getByRole("link", { name: "案例管理" }).click()
    await adminPage.waitForURL(/\/admin\/cases/, { timeout: 10_000 })
    await expect(adminPage).toHaveURL(/\/admin\/cases/)
  })
})
