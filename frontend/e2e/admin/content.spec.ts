/**
 * 管理后台内容管理 E2E 测试。
 * 覆盖文章管理、分类管理、院校管理、案例管理页面。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("文章管理页面", () => {
  test("页面加载显示文章管理标题", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")
    await expect(adminPage.getByRole("heading", { name: "文章管理" })).toBeVisible()
  })

  test("写文章按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")
    await expect(adminPage.getByRole("button", { name: /写文章/ })).toBeVisible()
  })

  test("点击写文章进入编辑器", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")
    await adminPage.getByRole("button", { name: /写文章/ }).click()
    await expect(adminPage.getByRole("heading", { name: /写文章/ })).toBeVisible()
  })
})

test.describe("分类管理页面", () => {
  test("页面加载显示分类管理标题", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/categories")
    await expect(adminPage.getByRole("heading", { name: "分类管理" })).toBeVisible()
  })
})

test.describe("院校管理页面", () => {
  test("页面加载显示院校管理标题", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/universities")
    await expect(adminPage.getByRole("heading", { name: "院校管理" })).toBeVisible()
  })
})

test.describe("案例管理页面", () => {
  test("页面加载显示案例管理标题", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/cases")
    await expect(adminPage.getByRole("heading", { name: "案例管理" })).toBeVisible()
  })
})
