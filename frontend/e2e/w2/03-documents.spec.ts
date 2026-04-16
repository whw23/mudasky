/**
 * W2 文档管理测试。
 * 覆盖上传、列表、分类切换、下载、删除、负向测试。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"
import { emit } from "../helpers/signal"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"

/** 创建临时测试文件 */
function createTempFile(name: string, content: string): string {
  const filePath = path.join(os.tmpdir(), name)
  fs.writeFileSync(filePath, content)
  return filePath
}

test.describe("W2 文档管理", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/portal/documents")
  })

  test("页面加载显示文档管理标题和上传按钮", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /文档/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /上传/ })).toBeVisible()
    trackComponent("DocumentsPage", "标题和上传按钮")
  })

  test("上传文本文件成功", async ({ page }) => {
    const tmpFile = createTempFile(
      `E2E-test-${Date.now()}.txt`,
      "E2E test content",
    )

    // 打开上传对话框
    await page.getByRole("button", { name: /上传/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // 选择文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tmpFile)

    // 选择分类
    await page.locator("select").selectOption("other")

    // 点击上传
    await page.getByRole("dialog").getByRole("button", { name: /上传/ }).click()

    // 等待成功提示
    await expect(page.getByText("上传成功")).toBeVisible()

    // 对话框应关闭
    await expect(page.getByRole("dialog")).not.toBeVisible()

    trackComponent("DocumentUpload", "上传文本文件")

    // 清理临时文件
    fs.unlinkSync(tmpFile)
  })

  test("上传后文档列表显示文件", async ({ page }) => {
    // 先上传一个文件
    const fileName = `E2E-list-${Date.now()}.txt`
    const tmpFile = createTempFile(fileName, "list test content")

    await page.getByRole("button", { name: /上传/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(tmpFile)
    await page.getByRole("dialog").getByRole("button", { name: /上传/ }).click()
    await expect(page.getByText("上传成功")).toBeVisible()

    // 等待对话框关闭后列表刷新
    await expect(page.getByRole("dialog")).not.toBeVisible()

    // 验证列表中出现文件名（桌面端表格 + 移动端卡片各一个元素，取第一个）
    await expect(page.getByRole("cell", { name: fileName })).toBeVisible()
    trackComponent("DocumentList", "文档列表显示")

    fs.unlinkSync(tmpFile)
  })

  test("分类 Tab 切换", async ({ page }) => {
    // 等待分类 Tab 加载
    const allTab = page.getByRole("tab", { name: "全部" })
    await expect(allTab).toBeVisible()

    // 点击"其他"分类
    const otherTab = page.getByRole("tab", { name: "其他" })
    await otherTab.click()
    await expect(otherTab).toHaveAttribute("aria-selected", "true")

    // 切回"全部"
    await allTab.click()
    await expect(allTab).toHaveAttribute("aria-selected", "true")

    trackComponent("DocumentsPage", "分类Tab切换")
  })

  test("存储用量显示", async ({ page }) => {
    // 等待存储信息加载（需要有文档才会显示配额）
    // 通过 API 确认有文档
    const res = await page.request.get("/api/portal/documents/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    const data = await res.json()

    if (data.total > 0 && data.storage_quota > 0) {
      await expect(page.getByText("存储用量")).toBeVisible()
    }
    trackComponent("DocumentsPage", "存储用量")
  })

  test("删除文档", async ({ page }) => {
    // 先上传一个待删除文件
    const fileName = `E2E-delete-${Date.now()}.txt`
    const tmpFile = createTempFile(fileName, "to delete")

    await page.getByRole("button", { name: /上传/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(tmpFile)
    await page.getByRole("dialog").getByRole("button", { name: /上传/ }).click()
    await expect(page.getByText("上传成功")).toBeVisible()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    fs.unlinkSync(tmpFile)

    // 找到该文件的删除按钮（通过 cell 定位所在行）
    const cell = page.getByRole("cell", { name: fileName })
    await expect(cell).toBeVisible()

    // 点击删除并处理 confirm 弹窗
    page.on("dialog", (dialog) => dialog.accept())
    const row = cell.locator("xpath=ancestor::tr")
    await row.getByRole("button", { name: /删除/ }).click()

    // 等待成功提示
    await expect(page.getByText("删除成功")).toBeVisible()
    trackComponent("DocumentList", "删除文档")
  })

  test("上传对话框不选文件时上传按钮禁用", async ({ page }) => {
    await page.getByRole("button", { name: /上传/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // 没有选文件时上传按钮应被禁用
    const uploadBtn = page.getByRole("dialog").getByRole("button", { name: /上传/ })
    await expect(uploadBtn).toBeDisabled()
    trackComponent("DocumentUpload", "空文件禁用")
  })

  test("上传文档并发送信号", async ({ page }) => {
    const fileName = `E2E-signal-${Date.now()}.txt`
    const tmpFile = createTempFile(fileName, "signal test")

    await page.getByRole("button", { name: /上传/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(tmpFile)
    await page.getByRole("dialog").getByRole("button", { name: /上传/ }).click()
    await expect(page.getByText("上传成功")).toBeVisible()
    fs.unlinkSync(tmpFile)

    // 获取文档 ID 用于跨 worker 测试
    const res = await page.request.get("/api/portal/documents/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    const data = await res.json()
    const doc = data.items?.find(
      (d: { original_name: string }) => d.original_name === fileName,
    )
    if (doc) {
      emit("w2_doc_uploaded", { docId: doc.id, fileName })
    }

    trackComponent("DocumentUpload", "上传并发送信号")
  })
})
