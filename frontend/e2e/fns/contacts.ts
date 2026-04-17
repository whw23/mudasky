/**
 * 联系人管理业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 查看联系人列表。
 */
export const viewContactList: TaskFn = async (page) => {
  await page.goto("/admin/contacts")
  await page.waitForLoadState("networkidle")
  // 等待侧边栏加载完成（确认在 admin 面板）
  await page.locator("aside, [role='complementary']").first().waitFor({ timeout: 15_000 })
  await page.getByRole("heading", { name: "联系人管理" }).waitFor({ timeout: 15_000 })
}

/**
 * 展开联系人面板。
 */
export const expandContact: TaskFn = async (page) => {
  const rows = page.locator("tbody tr")
  const rowCount = await rows.count()
  if (rowCount === 0) {
    return
  }

  await rows.first().click()

  // 等待面板加载
  const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
  await basicInfoHeading.waitFor()

  const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
  await expect(markStatusHeading).toBeVisible()
  const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
  await expect(addNoteHeading).toBeVisible()
}

/**
 * 标记联系状态。
 * args.status: 状态值（如 "contacted"）
 */
export const markContactStatus: TaskFn = async (page, args) => {
  const status = args?.status as string || "contacted"

  const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
  await markStatusHeading.waitFor()

  // 状态下拉
  const statusSection = page.locator("section").filter({ hasText: "标记状态" })
  const select = statusSection.locator("select")
  await expect(select).toBeVisible()

  // 选择状态
  await select.selectOption(status)

  // 点击保存
  const saveResponse = page.waitForResponse((r) =>
    r.url().includes("/admin/contacts/list/detail/mark") && r.status() === 200,
  )
  await statusSection.getByRole("button", { name: "保存" }).click()
  await saveResponse
}

/**
 * 添加联系人备注。
 * args.note: 备注内容
 */
export const addContactNote: TaskFn = async (page, args) => {
  const note = args?.note as string || `E2E-advisor-contact-note-${Date.now()}`

  const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
  await addNoteHeading.waitFor()

  const noteSection = page.locator("section").filter({ hasText: "添加备注" })
  const textarea = noteSection.locator("textarea")
  await textarea.fill(note)

  const saveResponse = page.waitForResponse((r) =>
    r.url().includes("/admin/contacts/list/detail/note") && r.status() === 200,
  )
  await noteSection.getByRole("button", { name: "保存" }).click()
  await saveResponse
}
