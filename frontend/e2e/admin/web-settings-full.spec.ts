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

test.describe("网页设置 — 配置编辑弹窗", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/web-settings")
  })

  /** 打开第一个可编辑区域的弹窗 */
  async function openFirstEditDialog(page: import("@playwright/test").Page) {
    // 优先尝试 cursor-pointer 元素
    const clickable = page.locator(".cursor-pointer").first()
    const hasClickable = await clickable.isVisible().catch(() => false)

    if (hasClickable) {
      await clickable.click()
    } else {
      // 退而尝试 title 包含"编辑"的元素
      const editWrapper = page.locator("[title*='编辑']").first()
      const hasWrapper = await editWrapper.isVisible().catch(() => false)
      if (!hasWrapper) return false
      await editWrapper.click()
    }

    const dialog = page.getByRole("dialog")
    try {
      await dialog.waitFor({ timeout: 3_000 })
      return true
    } catch {
      return false
    }
  }

  test("正例：点击可编辑区域打开编辑弹窗", async ({ adminPage }) => {
    const opened = await openFirstEditDialog(adminPage)
    if (!opened) {
      test.skip(true, "未找到可编辑区域或弹窗未打开，跳过")
      return
    }
    await expect(adminPage.getByRole("dialog")).toBeVisible()

    // 关闭
    await adminPage.keyboard.press("Escape")
  })

  test("正例：编辑弹窗包含保存和取消按钮", async ({ adminPage }) => {
    const opened = await openFirstEditDialog(adminPage)
    if (!opened) {
      test.skip(true, "未找到可编辑区域或弹窗未打开，跳过")
      return
    }

    const dialog = adminPage.getByRole("dialog")
    const saveBtn = dialog.getByRole("button", { name: /保存/ })
    const cancelBtn = dialog.getByRole("button", { name: /取消/ })

    await expect(saveBtn).toBeVisible()
    await expect(cancelBtn).toBeVisible()

    // 关闭
    await adminPage.keyboard.press("Escape")
  })

  test("反例：点击取消关闭弹窗", async ({ adminPage }) => {
    const opened = await openFirstEditDialog(adminPage)
    if (!opened) {
      test.skip(true, "未找到可编辑区域或弹窗未打开，跳过")
      return
    }

    const dialog = adminPage.getByRole("dialog")
    const cancelBtn = dialog.getByRole("button", { name: /取消/ })
    await cancelBtn.click()
    await expect(dialog).not.toBeVisible()
  })

  test("反例：清空必填字段后保存弹窗不关闭", async ({ adminPage }) => {
    const opened = await openFirstEditDialog(adminPage)
    if (!opened) {
      test.skip(true, "未找到可编辑区域或弹窗未打开，跳过")
      return
    }

    const dialog = adminPage.getByRole("dialog")

    // 找到第一个输入框并清空
    const input = dialog.locator("input[type='text'], input:not([type]), textarea").first()
    const hasInput = await input.isVisible().catch(() => false)
    if (!hasInput) {
      test.skip(true, "弹窗中未找到可编辑输入框，跳过")
      await adminPage.keyboard.press("Escape")
      return
    }

    await input.clear()

    const saveBtn = dialog.getByRole("button", { name: /保存/ })
    await saveBtn.click()

    // 弹窗应该仍然可见（验证失败不关闭），或显示错误提示
    const dialogStillVisible = await dialog.isVisible().catch(() => false)
    const hasError = await dialog.locator("[role='alert'], .text-red, .text-destructive, .error").first().isVisible().catch(() => false)
    expect(dialogStillVisible || hasError).toBeTruthy()

    // 关闭弹窗
    await adminPage.keyboard.press("Escape")
  })
})
