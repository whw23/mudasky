/**
 * 文档管理 E2E 测试。
 * 覆盖：页面加载、分类 Tab 切换、上传按钮、未登录重定向。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"
import { test as baseTest, expect as baseExpect } from "@playwright/test"

test.describe("文档管理页面", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/documents")
  })

  test("页面加载显示文档管理标题", async ({ adminPage }) => {
    await expect(
      adminPage.getByRole("heading", { name: "文档管理" }),
    ).toBeVisible()
  })

  test("分类 Tab 可见且可切换", async ({ adminPage }) => {
    /* 默认 "全部" tab 应激活 */
    const allTab = adminPage.getByRole("tab", { name: "全部" })
    await expect(allTab).toBeVisible()
    await expect(allTab).toHaveAttribute("data-state", "active")

    /* 切换到 "成绩单" tab */
    const transcriptTab = adminPage.getByRole("tab", { name: "成绩单" })
    await expect(transcriptTab).toBeVisible()
    await transcriptTab.click()
    await expect(transcriptTab).toHaveAttribute("data-state", "active")
    await expect(allTab).toHaveAttribute("data-state", "inactive")

    /* 切换到 "其他" tab */
    const otherTab = adminPage.getByRole("tab", { name: "其他" })
    await expect(otherTab).toBeVisible()
    await otherTab.click()
    await expect(otherTab).toHaveAttribute("data-state", "active")
  })

  test("上传文档按钮可见", async ({ adminPage }) => {
    await expect(
      adminPage.getByRole("button", { name: /上传文档/ }),
    ).toBeVisible()
  })

  test("所有分类 Tab 均可见", async ({ adminPage }) => {
    const categories = ["全部", "成绩单", "证书", "护照", "语言考试", "申请材料", "其他"]
    for (const cat of categories) {
      await expect(adminPage.getByRole("tab", { name: cat })).toBeVisible()
    }
  })
})

baseTest.describe("文档管理 — 未登录", () => {
  baseTest.use({ storageState: { cookies: [], origins: [] } })

  baseTest("未登录访问文档页面重定向", async ({ page }) => {
    await page.goto("/portal/documents")
    await page.waitForURL((url) => !url.pathname.includes("/portal"))
    const url = page.url()
    baseExpect(url).not.toContain("/portal")
  })

  baseTest("未登录看不到文档管理内容", async ({ page }) => {
    await page.goto("/portal/documents")
    await page.waitForURL((url) => !url.pathname.includes("/portal"))
    await baseExpect(
      page.getByRole("heading", { name: "文档管理" }),
    ).not.toBeVisible()
  })
})
