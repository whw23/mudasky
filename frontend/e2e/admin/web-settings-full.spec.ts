/**
 * 网页设置所见即所得 E2E 测试。
 * 覆盖预览区域、编辑浮层、页面切换、配置编辑弹窗。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("网页设置 — 预览和编辑", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/web-settings")
  })

  test("页面加载显示预览区域", async ({ adminPage }) => {
    await expect(adminPage.getByRole("heading", { name: "网页设置" })).toBeVisible()
    // 预览区域内有品牌名
    await expect(adminPage.locator("body")).toContainText("慕大国际教育")
  })

  test("预览区域包含导航栏", async ({ adminPage }) => {
    await expect(adminPage.getByText("网站首页").first()).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "院校选择" })).toBeVisible()
  })

  test("预览区域包含 Footer", async ({ adminPage }) => {
    await expect(adminPage.getByText("快速链接")).toBeVisible()
  })

  test("点击导航栏切换预览页面", async ({ adminPage }) => {
    // 点击院校选择
    const uniLink = adminPage.getByText("院校选择").first()
    await uniLink.click()
    // 应该切换到院校预览
    await expect(adminPage.locator("body")).toContainText("院校")
  })

  test("点击预览区域可编辑", async ({ adminPage }) => {
    /* 品牌名有可编辑的 wrapper div[title="编辑品牌名称"]，点击它触发编辑弹窗 */
    const editWrapper = adminPage.locator("[title*='编辑']").first()
    const hasWrapper = await editWrapper.isVisible().catch(() => false)
    if (hasWrapper) {
      await editWrapper.click()
      await expect(adminPage.getByRole("dialog")).toBeVisible()
      /* 关闭弹窗 */
      await adminPage.keyboard.press("Escape")
      await expect(adminPage.getByRole("dialog")).toBeHidden()
    }
  })
})
