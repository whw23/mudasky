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
  // 导航到学生管理页面
  await page.goto("/admin/students")
  await page.locator("main").waitFor()
  const table = page.locator("table")
  await expect(table).toBeVisible()

  // 取消"仅我的学生"筛选
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  if (await checkbox.isChecked()) {
    await checkbox.uncheck()
    await page.waitForTimeout(1000)
  }

  const firstRow = page.locator("tbody tr").first()
  await firstRow.waitFor({ timeout: 15_000 })
  await firstRow.click()

  // 等待面板加载
  const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
  await basicInfoHeading.waitFor({ timeout: 15_000 })
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

  // 导航到学生管理页面并展开学生面板
  await page.goto("/admin/students")
  await page.locator("main").waitFor()
  const table = page.locator("table")
  await expect(table).toBeVisible()

  // 取消"仅我的学生"筛选，确保能看到所有学生
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  if (await checkbox.isChecked()) {
    await checkbox.uncheck()
    await page.waitForTimeout(1000)
  }

  const firstRow = page.locator("tbody tr").first()
  await firstRow.waitFor({ timeout: 15_000 })
  await firstRow.click()

  await page.locator("h3").filter({ hasText: "基本信息" }).waitFor({ timeout: 15_000 })

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

/**
 * 分配顾问给学生（触发 /api/admin/students/list/detail/assign-advisor）。
 */
export const assignAdvisor: TaskFn = async (page) => {
  // 导航到学生管理页面并展开学生面板
  await page.goto("/admin/students")
  await page.locator("main").waitFor()

  // 取消"仅我的学生"筛选
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  if (await checkbox.isChecked()) {
    await checkbox.uncheck()
    await page.waitForTimeout(1000)
  }

  const firstRow = page.locator("tbody tr").first()
  await firstRow.waitFor({ timeout: 15_000 })
  await firstRow.click()

  await page.locator("h3").filter({ hasText: "基本信息" }).waitFor({ timeout: 15_000 })

  // 找到"分配顾问"区域
  const advisorSection = page.locator("section").filter({ hasText: "分配顾问" })
  await expect(advisorSection).toBeVisible()

  // 选择顾问（假设下拉框有选项）
  const selectTrigger = advisorSection.getByRole("combobox")
  if (await selectTrigger.isVisible().catch(() => false)) {
    await selectTrigger.click()

    // 等待下拉选项出现
    const firstOption = page.getByRole("option").first()
    await firstOption.waitFor({ timeout: 5_000 })

    // 监听 API 响应
    const assignResponse = page.waitForResponse(
      (r) => r.url().includes("/api/admin/students/list/detail/assign-advisor") && r.request().method() === "POST",
      { timeout: 15_000 }
    )

    await firstOption.click()
    await assignResponse
  }
}

/**
 * 降级学生为访客（触发 /api/admin/students/list/detail/downgrade）。
 */
export const downgradeStudent: TaskFn = async (page) => {
  // 导航到学生管理页面并展开学生面板
  await page.goto("/admin/students")
  await page.locator("main").waitFor()

  // 取消"仅我的学生"筛选
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  if (await checkbox.isChecked()) {
    await checkbox.uncheck()
    await page.waitForTimeout(1000)
  }

  const firstRow = page.locator("tbody tr").first()
  await firstRow.waitFor({ timeout: 15_000 })
  await firstRow.click()

  await page.locator("h3").filter({ hasText: "基本信息" }).waitFor({ timeout: 15_000 })

  // 找到"降级"或"转为访客"按钮
  const downgradeBtn = page.getByRole("button", { name: /降级|转为访客/ })
  if (await downgradeBtn.isVisible().catch(() => false)) {
    // 监听 API 响应
    const downgradeResponse = page.waitForResponse(
      (r) => r.url().includes("/api/admin/students/list/detail/downgrade") && r.request().method() === "POST",
      { timeout: 15_000 }
    )

    await downgradeBtn.click()

    // 如果有确认弹窗
    const alertDialog = page.getByRole("alertdialog")
    if (await alertDialog.isVisible().catch(() => false)) {
      await alertDialog.getByRole("button", { name: /确认|降级/ }).click()
    }

    await downgradeResponse
  }
}

/**
 * 查看学生文档详情（触发 /api/admin/students/list/detail/documents/list/detail）。
 */
export const viewStudentDocumentDetail: TaskFn = async (page) => {
  // 导航到学生管理页面并展开学生面板
  await page.goto("/admin/students")
  await page.locator("main").waitFor()

  // 取消"仅我的学生"筛选
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  if (await checkbox.isChecked()) {
    await checkbox.uncheck()
    await page.waitForTimeout(1000)
  }

  const firstRow = page.locator("tbody tr").first()
  await firstRow.waitFor({ timeout: 15_000 })
  await firstRow.click()

  await page.locator("h3").filter({ hasText: "文件列表" }).waitFor({ timeout: 15_000 })

  // 找到文件列表区域
  const filesSection = page.locator("section").filter({ hasText: "文件列表" })
  await expect(filesSection).toBeVisible()

  // 查找文档行
  const docRow = filesSection.locator("tr").nth(1)
  if (await docRow.isVisible().catch(() => false)) {
    // 点击查看详情按钮
    const detailBtn = docRow.getByRole("button", { name: /详情|查看/ })

    if (await detailBtn.isVisible().catch(() => false)) {
      const detailResponse = page.waitForResponse(
        (r) => r.url().includes("/api/admin/students/list/detail/documents/list/detail") && r.request().method() === "POST",
        { timeout: 15_000 }
      )

      await detailBtn.click()
      await detailResponse

      // 关闭详情弹窗
      const dialog = page.getByRole("dialog")
      if (await dialog.isVisible().catch(() => false)) {
        await dialog.getByRole("button", { name: /关闭|取消/ }).click()
      }
    }
  }
}

/**
 * 下载学生文档（触发 /api/admin/students/list/detail/documents/list/detail/download）。
 */
export const downloadStudentDocument: TaskFn = async (page) => {
  // 导航到学生管理页面并展开学生面板
  await page.goto("/admin/students")
  await page.locator("main").waitFor()

  // 取消"仅我的学生"筛选
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  if (await checkbox.isChecked()) {
    await checkbox.uncheck()
    await page.waitForTimeout(1000)
  }

  const firstRow = page.locator("tbody tr").first()
  await firstRow.waitFor({ timeout: 15_000 })
  await firstRow.click()

  await page.locator("h3").filter({ hasText: "文件列表" }).waitFor({ timeout: 15_000 })

  // 找到文件列表区域
  const filesSection = page.locator("section").filter({ hasText: "文件列表" })
  await expect(filesSection).toBeVisible()

  // 查找文档行
  const docRow = filesSection.locator("tr").nth(1)
  if (await docRow.isVisible().catch(() => false)) {
    // 点击下载按钮
    const downloadBtn = docRow.getByRole("button", { name: /下载/ })

    if (await downloadBtn.isVisible().catch(() => false)) {
      const downloadResponse = page.waitForResponse(
        (r) => r.url().includes("/api/admin/students/list/detail/documents/list/detail/download") && r.request().method() === "POST",
        { timeout: 15_000 }
      )

      await downloadBtn.click()
      await downloadResponse
    }
  }
}
