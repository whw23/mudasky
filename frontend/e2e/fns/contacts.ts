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
  // 先导航到首页确认登录状态
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // 再导航到联系人管理
  await page.goto("/admin/contacts")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "联系人管理" }).waitFor({ timeout: 20_000 })
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

  // 等待面板加载（高负载下可能较慢）
  const basicInfoHeading = page.locator("h3").filter({ hasText: "基本信息" })
  await basicInfoHeading.waitFor({ timeout: 15_000 })

  const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
  await expect(markStatusHeading).toBeVisible({ timeout: 15_000 })
  const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
  await expect(addNoteHeading).toBeVisible()
}

/**
 * 标记联系状态。
 * args.status: 状态值（如 "contacted"）
 */
export const markContactStatus: TaskFn = async (page, args) => {
  const status = args?.status as string || "contacted"

  // 确保在联系人页面且面板已展开
  await page.goto("/admin/contacts")
  await page.waitForLoadState("networkidle")
  const rows = page.locator("tbody tr")
  if (await rows.count() > 0) {
    await rows.first().click()
  }

  const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
  await markStatusHeading.waitFor({ timeout: 15_000 })

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

  // 确保在联系人页面且面板已展开
  await page.goto("/admin/contacts")
  await page.waitForLoadState("networkidle")
  const rows = page.locator("tbody tr")
  if (await rows.count() > 0) {
    await rows.first().click()
  }

  const addNoteHeading = page.locator("h3").filter({ hasText: "添加备注" })
  await addNoteHeading.waitFor({ timeout: 15_000 })

  const noteSection = page.locator("section").filter({ hasText: "添加备注" })
  const textarea = noteSection.locator("textarea")
  await textarea.fill(note)

  const saveResponse = page.waitForResponse((r) =>
    r.url().includes("/admin/contacts/list/detail/note") && r.status() === 200,
  )
  await noteSection.getByRole("button", { name: "保存" }).click()
  await saveResponse
}
