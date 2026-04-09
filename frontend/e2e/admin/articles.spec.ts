/**
 * 文章管理 E2E 测试。
 * 覆盖：页面加载、Tab 筛选功能。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("文章管理", () => {
  test("页面加载并展示表格和筛选 Tab", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")
    await expect(adminPage.getByRole("heading", { name: "文章管理" })).toBeVisible()

    /* 筛选 Tab */
    await expect(adminPage.getByRole("tab", { name: "全部" })).toBeVisible()
    await expect(adminPage.getByRole("tab", { name: "草稿" })).toBeVisible()
    await expect(adminPage.getByRole("tab", { name: "已发布" })).toBeVisible()

    /* 表格列头 */
    await expect(adminPage.getByText("标题")).toBeVisible()
    await expect(adminPage.getByText("操作")).toBeVisible()
  })

  test("Tab 筛选切换", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")

    /* 点击草稿 Tab */
    await adminPage.getByRole("tab", { name: "草稿" }).click()
    await expect(adminPage.getByRole("tab", { name: "草稿" })).toHaveAttribute("aria-selected", "true")

    /* 点击已发布 Tab */
    await adminPage.getByRole("tab", { name: "已发布" }).click()
    await expect(adminPage.getByRole("tab", { name: "已发布" })).toHaveAttribute("aria-selected", "true")

    /* 切回全部 */
    await adminPage.getByRole("tab", { name: "全部" }).click()
    await expect(adminPage.getByRole("tab", { name: "全部" })).toHaveAttribute("aria-selected", "true")
  })
})
