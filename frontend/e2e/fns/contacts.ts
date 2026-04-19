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
  const response = await page.goto("/admin/contacts")

  // 如果被重定向（无权限），报告实际 URL
  const url = page.url()
  if (!url.includes("/admin/contacts")) {
    throw new Error(`被重定向到 ${url}，可能无 admin/contacts 权限`)
  }

  await page.getByRole("heading", { name: "联系人管理" }).waitFor({ timeout: 20_000 })
}

/**
 * 展开联系人面板。
 */
export const expandContact: TaskFn = async (page) => {
  // 导航到联系人管理页面
  await page.goto("/admin/contacts")
  await page.getByRole("heading", { name: "联系人管理" }).waitFor({ timeout: 20_000 })

  // 等待列表数据加载
  const rows = page.locator("tbody tr")
  await rows.first().waitFor({ timeout: 15_000 })

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
  await page.getByRole("heading", { name: "联系人管理" }).waitFor()
  const rows = page.locator("tbody tr")
  await rows.first().waitFor({ timeout: 15_000 })
  await rows.first().click()

  const markStatusHeading = page.locator("h3").filter({ hasText: "标记状态" })
  await markStatusHeading.waitFor({ timeout: 15_000 })

  // 状态下拉（shadcn Select）
  const statusSection = page.locator("section").filter({ hasText: "标记状态" })
  const trigger = statusSection.getByRole("combobox")
  await expect(trigger).toBeVisible()

  // 点击 trigger → 选择非当前状态的选项
  await trigger.click()
  const options = page.getByRole("option")
  await options.first().waitFor({ state: "visible", timeout: 10_000 })
  // 选择第二个选项（切换到不同状态）
  const count = await options.count()
  await options.nth(count > 1 ? 1 : 0).click()

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
  await page.getByRole("heading", { name: "联系人管理" }).waitFor()
  const rows = page.locator("tbody tr")
  await rows.first().waitFor({ timeout: 15_000 })
  await rows.first().click()

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
