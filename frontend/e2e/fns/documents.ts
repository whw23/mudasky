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

/** 创建临时测试文件。 */
function createTempFile(name: string, content: string): string {
  const filePath = path.join(os.tmpdir(), name)
  fs.writeFileSync(filePath, content)
  return filePath
}

/** 导航到文档管理页并验证。 */
export const viewDocuments: TaskFn = async (page) => {
  await page.goto("/portal/documents")
  await page.waitForLoadState("networkidle")
  await expect(page.getByRole("heading", { name: "文档管理" })).toBeVisible()
  await expect(page.getByRole("button", { name: "上传文档" })).toBeVisible()
}

/** 上传文档文件。 */
export const uploadDocument: TaskFn = async (page, args) => {
  const fileName = args?.fileName as string || `E2E-test-${Date.now()}.txt`
  const content = args?.content as string || "E2E test content"

  await page.goto("/portal/documents")
  await page.waitForLoadState("networkidle")

  const tmpFile = createTempFile(fileName, content)

  // 打开上传对话框
  await page.getByRole("button", { name: "上传文档" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 选择文件：先尝试 filechooser 事件，再 fallback 到 setInputFiles
  try {
    const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 3_000 })
    await dialog.getByText("点击选择文件").click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(tmpFile)
  } catch {
    // fallback：直接设置隐藏的 file input
    await dialog.locator('input[type="file"]').setInputFiles(tmpFile)
  }

  // 分类默认是"其他"，不需要改

  // 等待上传按钮启用（文件选择成功后才启用）
  const uploadBtn = dialog.getByRole("button", { name: "上传文档" })
  await expect(uploadBtn).toBeEnabled({ timeout: 5_000 })
  await uploadBtn.click()

  // 等待对话框关闭（上传成功）
  await expect(dialog).not.toBeVisible({ timeout: 15_000 })

  // 清理临时文件
  fs.unlinkSync(tmpFile)
}

/** 验证文档出现在列表中。 */
export const verifyDocumentInList: TaskFn = async (page, args) => {
  const fileName = args?.fileName as string
  await page.goto("/portal/documents")
  await page.waitForLoadState("networkidle")
  try {
    await expect(page.getByText(fileName)).toBeVisible({ timeout: 15_000 })
  } catch {
    // 调试：输出当前列表内容
    const listText = await page.locator("main").textContent().catch(() => "")
    throw new Error(`文件 "${fileName}" 未在列表中找到。页面内容: ${listText?.substring(0, 300)}`)
  }
}

/** 删除文档。 */
export const deleteDocument: TaskFn = async (page, args) => {
  const fileName = args?.fileName as string
  await page.goto("/portal/documents")
  await page.waitForLoadState("networkidle")

  // 找到文件行，点击删除
  const row = page.locator("tr", { hasText: fileName })
  page.once("dialog", (d) => d.accept())
  await row.getByRole("button", { name: /删除/ }).click()

  // 等待文件从列表消失
  await expect(page.getByText(fileName)).not.toBeVisible()
}

/** 切换文档分类 Tab。 */
export const switchDocumentTab: TaskFn = async (page) => {
  await page.goto("/portal/documents")
  await page.waitForLoadState("networkidle")

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

/** 验证存储用量显示。 */
export const viewStorageUsage: TaskFn = async (page) => {
  await page.goto("/portal/documents")
  await page.waitForLoadState("networkidle")
  await expect(page.getByText("存储用量")).toBeVisible()
}
