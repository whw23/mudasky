/**
 * 管理后台内容管理 E2E 测试。
 * 覆盖文章管理、分类管理、院校管理、案例管理页面。
 */

import { test, expect } from "../fixtures/base"

test.describe("文章管理页面", () => {
  test("页面加载显示文章管理标题", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    await expect(adminPage.getByText("文章管理")).toBeVisible()
  })

  test("创建文章按钮可见", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    await expect(adminPage.getByRole("button", { name: /创建/ })).toBeVisible()
  })

  test("点击创建文章进入编辑器", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    await adminPage.getByRole("button", { name: /创建/ }).click()
    await adminPage.waitForTimeout(2000)
    // 编辑器页面应该显示标题输入
    await expect(adminPage.getByText(/创建文章|编辑文章/)).toBeVisible()
  })
})

test.describe("分类管理页面", () => {
  test("页面加载显示分类管理标题", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    await expect(adminPage.getByText("分类管理")).toBeVisible()
  })
})

test.describe("院校管理页面", () => {
  test("页面加载显示院校管理标题", async ({ adminPage }) => {
    await adminPage.goto("/admin/universities")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    await expect(adminPage.getByText("院校管理")).toBeVisible()
  })
})

test.describe("案例管理页面", () => {
  test("页面加载显示案例管理标题", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
    await expect(adminPage.getByText("案例管理")).toBeVisible()
  })
})
