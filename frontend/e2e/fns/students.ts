/**
 * 学生管理业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 查看学生列表。
 */
export const viewStudentList: TaskFn = async (page) => {
  await page.goto("/admin/students")
  await page.locator("main").waitFor()
  const table = page.locator("table")
  await expect(table).toBeVisible()
}

/**
 * 切换"仅我的学生"筛选。
 */
export const toggleMyStudentsFilter: TaskFn = async (page) => {
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  const checked = await checkbox.isChecked()

  if (checked) {
    const responsePromise = page.waitForResponse((r) =>
      r.url().includes("/admin/students/list") && r.status() === 200,
    )
    await checkbox.uncheck()
    await responsePromise
  } else {
    const responsePromise = page.waitForResponse((r) =>
      r.url().includes("/admin/students/list") && r.status() === 200,
    )
    await checkbox.check()
    await responsePromise
  }
}

/**
 * 展开学生面板。
 */
export const expandStudent: TaskFn = async (page) => {
  const firstRow = page.locator("tbody tr").first()
  await firstRow.click()

  // 等待面板加载
  const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
  await basicInfoHeading.waitFor()
  await expect(page.locator("h3").filter({ hasText: "编辑" })).toBeVisible()
  await expect(page.getByText("分配顾问").first()).toBeVisible()
  await expect(page.getByText("文件列表").first()).toBeVisible()
}

/**
 * 编辑学生备注。
 * args.note: 备注内容
 */
export const editStudentNote: TaskFn = async (page, args) => {
  const note = args?.note as string || `E2E-advisor-note-${Date.now()}`

  await page.locator("h3").filter({ hasText: "基本信息" }).waitFor()

  // 填写备注
  const noteArea = page.locator("section").filter({ hasText: "编辑" }).locator("textarea")
  await noteArea.fill(note)

  // 点击保存
  const saveBtn = page.locator("section").filter({ hasText: "编辑" }).getByRole("button", { name: "保存" })
  const saveResponse = page.waitForResponse((r) =>
    r.url().includes("/admin/students/list/detail/edit") && r.status() === 200,
  )
  await saveBtn.click()
  await saveResponse
}
