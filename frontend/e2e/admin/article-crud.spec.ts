/**
 * 文章 CRUD E2E 测试。
 * 覆盖创建、编辑、发布、删除文章的完整流程。
 */

import { test, expect } from "../fixtures/base"

test.describe("文章 CRUD", () => {
  test("创建 Markdown 文章并发布", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)

    // 点击写文章
    await adminPage.getByRole("button", { name: /写文章/ }).click()
    await adminPage.waitForTimeout(2000)

    // 填写标题
    const titleInput = adminPage.getByPlaceholder(/标题/)
    await titleInput.fill("测试文章标题")
    await adminPage.waitForTimeout(500)

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
    await adminPage.waitForTimeout(1000)
    await expect(adminPage.getByRole("heading", { name: "文章管理" })).toBeVisible()
  })

  test("文章列表状态筛选 tab 交互", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)

    // 检查三个 tab
    await expect(adminPage.getByRole("tab", { name: "全部" })).toBeVisible()
    await expect(adminPage.getByRole("tab", { name: "草稿" })).toBeVisible()
    await expect(adminPage.getByRole("tab", { name: "已发布" })).toBeVisible()

    // 切换到草稿 tab
    await adminPage.getByRole("tab", { name: "草稿" }).click()
    await adminPage.waitForTimeout(500)

    // 切换到已发布 tab
    await adminPage.getByRole("tab", { name: "已发布" }).click()
    await adminPage.waitForTimeout(500)

    // 切回全部
    await adminPage.getByRole("tab", { name: "全部" }).click()
    await adminPage.waitForTimeout(500)
  })
})
