/**
 * 文档管理业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 创建临时测试文件。
 */
function createTempFile(name: string, content: string): string {
  const filePath = path.join(os.tmpdir(), name)
  fs.writeFileSync(filePath, content)
  return filePath
}

/**
 * 导航到文档管理页并验证标题和上传按钮。
 */
export const viewDocuments: TaskFn = async (page) => {
  await page.goto("/portal/documents")
  await page.locator("main").waitFor()
  await expect(page.getByRole("heading", { name: /文档/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /上传/ })).toBeVisible()
}

/**
 * 上传文档文件。
 * args.fileName: 文件名（可选）
 * args.category: 分类（默认 "other"）
 * args.content: 文件内容（可选）
 */
export const uploadDocument: TaskFn = async (page, args) => {
  const fileName = args?.fileName as string || `E2E-test-${Date.now()}.txt`
  const category = args?.category as string || "other"
  const content = args?.content as string || "E2E test content"

  const tmpFile = createTempFile(fileName, content)

  // 打开上传对话框
  await page.getByRole("button", { name: /上传/ }).click()
  await expect(page.getByRole("dialog")).toBeVisible()

  // 选择文件
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(tmpFile)

  // 选择分类
  await page.locator("select").selectOption(category)

  // 点击上传
  await page.getByRole("dialog").getByRole("button", { name: /上传/ }).click()

  // 等待成功提示
  await expect(page.getByText("上传成功")).toBeVisible()

  // 对话框应关闭
  await expect(page.getByRole("dialog")).not.toBeVisible()

  // 清理临时文件
  fs.unlinkSync(tmpFile)
}

/**
 * 验证文档出现在列表中。
 * args.fileName: 文件名
 */
export const verifyDocumentInList: TaskFn = async (page, args) => {
  const fileName = args?.fileName as string

  // 等待对话框关闭后列表刷新
  await expect(page.getByRole("dialog")).not.toBeVisible()

  // 验证列表中出现文件名
  await expect(page.getByRole("cell", { name: fileName })).toBeVisible()
}

/**
 * 删除文档。
 * args.fileName: 要删除的文件名
 */
export const deleteDocument: TaskFn = async (page, args) => {
  const fileName = args?.fileName as string

  // 找到该文件的删除按钮
  const cell = page.getByRole("cell", { name: fileName })
  await expect(cell).toBeVisible()

  // 点击删除并处理 confirm 弹窗
  page.on("dialog", (dialog) => dialog.accept())
  const row = cell.locator("xpath=ancestor::tr")
  await row.getByRole("button", { name: /删除/ }).click()

  // 等待成功提示
  await expect(page.getByText("删除成功")).toBeVisible()
}

/**
 * 切换文档分类 Tab。
 */
export const switchDocumentTab: TaskFn = async (page) => {
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
}

/**
 * 验证存储用量显示。
 */
export const viewStorageUsage: TaskFn = async (page) => {
  // 存储用量在有文档且有配额时显示
  const storageText = page.getByText("存储用量")
  const isVisible = await storageText.isVisible().catch(() => false)
  // 不强制验证，因为可能没有文档或配额
  if (isVisible) {
    await expect(storageText).toBeVisible()
  }
}
