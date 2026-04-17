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

  // 展开指定学生
  const row = page.locator("tbody tr").nth(studentIndex)
  await row.click()
  await page.getByText("文件列表").first().waitFor()

  // 文档区域包含表头或暂无文件提示
  const fileSection = page.locator("section").filter({ hasText: "文件列表" })
  await expect(fileSection).toBeVisible()

  // 应有文件或至少显示区域
  const hasTable = await fileSection.locator("table").count()
  const hasNoFiles = await fileSection.getByText("暂无文件").count()
  expect(hasTable + hasNoFiles).toBeGreaterThan(0)
}
