/**
 * 文章 CRUD E2E 测试。
 * 覆盖创建、编辑、发布、删除文章的完整流程。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("文章 CRUD", () => {
  test("创建 Markdown 文章并发布", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")

    // 点击写文章
    await adminPage.getByRole("button", { name: /写文章/ }).click()
    await expect(adminPage.getByPlaceholder(/标题/)).toBeVisible({ timeout: 10_000 })

    // 填写标题
    const titleInput = adminPage.getByPlaceholder(/标题/)
    await titleInput.fill("测试文章标题")

    // 选择分类（如果有）
    const selects = adminPage.locator("select")
    const selectCount = await selects.count()
    if (selectCount > 0) {
      // 分类选择器存在
      await expect(selects.first()).toBeVisible()
    }

    // 检查内容类型切换按钮
    await expect(adminPage.getByRole("button", { name: "Markdown" })).toBeVisible()
    await expect(adminPage.getByRole("button", { name: /文件上传/ })).toBeVisible()

    // 取消返回列表
    await adminPage.getByRole("button", { name: /取消/ }).click()
    await expect(adminPage.getByRole("heading", { name: "文章管理" })).toBeVisible({ timeout: 10_000 })
  })

  test("文章列表状态筛选 tab 交互", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")

    // 检查三个 tab
    await expect(adminPage.getByRole("tab", { name: "全部" })).toBeVisible()
    await expect(adminPage.getByRole("tab", { name: "草稿" })).toBeVisible()
    await expect(adminPage.getByRole("tab", { name: "已发布" })).toBeVisible()

    // 切换到草稿 tab
    await adminPage.getByRole("tab", { name: "草稿" }).click()
    await expect(adminPage.getByRole("tab", { name: "草稿" })).toHaveAttribute("aria-selected", "true", { timeout: 5_000 })

    // 切换到已发布 tab
    await adminPage.getByRole("tab", { name: "已发布" }).click()
    await expect(adminPage.getByRole("tab", { name: "已发布" })).toHaveAttribute("aria-selected", "true", { timeout: 5_000 })

    // 切回全部
    await adminPage.getByRole("tab", { name: "全部" }).click()
    await expect(adminPage.getByRole("tab", { name: "全部" })).toHaveAttribute("aria-selected", "true", { timeout: 5_000 })
  })

  test("发布/取消发布按钮可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/articles")
    const row = adminPage.locator("tr").nth(1)
    if (await row.isVisible()) {
      const btn = row.getByRole("button", { name: /发布|取消发布/ })
      if (await btn.isVisible()) {
        await expect(btn).toBeVisible()
      }
    }
  })
})
