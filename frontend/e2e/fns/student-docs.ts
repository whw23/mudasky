/**
 * 学生文档查看业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 查看学生文档列表。
 * args.studentIndex: 学生行索引（默认0，第一个学生）
 */
export const viewStudentDocuments: TaskFn = async (page, args) => {
  const studentIndex = args?.studentIndex as number ?? 0

  // 确保在学生管理页面
  await page.goto("/admin/students")
  await page.getByRole("heading", { name: "学生管理" }).waitFor()

  // 等待学生列表加载完成（loading 消失）
  const dataRows = page.locator("tbody tr.cursor-pointer")
  const noDataRow = page.locator("tbody tr").filter({ hasText: /暂无|没有/ })

  // 等待数据行或空状态出现
  await dataRows.first().or(noDataRow.first()).waitFor({ timeout: 30_000 })

  // 如果没有学生数据，验证空状态展示并返回
  if (await noDataRow.count() > 0 && await dataRows.count() === 0) {
    return
  }

  // 展开指定学生
  await dataRows.nth(studentIndex).click()

  // 等待面板加载（文件列表区域）
  await page.getByText("文件列表").first().waitFor({ timeout: 30_000 })

  // 文档区域包含表头或暂无文件提示
  const fileSection = page.locator("section").filter({ hasText: "文件列表" })
  await expect(fileSection).toBeVisible()

  // 应有文件或至少显示区域
  const hasTable = await fileSection.locator("table").count()
  const hasNoFiles = await fileSection.getByText("暂无文件").count()
  expect(hasTable + hasNoFiles).toBeGreaterThan(0)
}
