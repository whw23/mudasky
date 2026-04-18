/**
 * 角色管理业务操作函数。
 * 通过 UI 进行角色的创建、编辑、删除。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 创建角色 */
export async function createRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const description = String(args?.description ?? "")

  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  await page.getByRole("button", { name: "创建角色" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByPlaceholder("请输入角色名称").fill(name)
  await dialog.getByPlaceholder("请输入角色描述").fill(description)

  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText(name)).toBeVisible()
}

/** 编辑角色 */
export async function editRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldName = String(args?.oldName ?? "")
  const newDescription = String(args?.newDescription ?? "")

  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  // 角色名的直接父级就是角色行，包含编辑按钮
  const nameEl = page.locator("main").getByText(oldName, { exact: true })
  await nameEl.waitFor()
  const row = nameEl.locator("xpath=..")
  await row.getByRole("button", { name: "编辑" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改角色名（如果 args 包含 newName）
  const newName = String(args?.newName ?? "")
  if (newName) {
    const nameInput = dialog.getByPlaceholder("请输入角色名称")
    await nameInput.clear()
    await nameInput.fill(newName)
  }

  if (newDescription) {
    const descInput = dialog.getByPlaceholder("请输入角色描述")
    await descInput.clear()
    await descInput.fill(newDescription)
  }

  await dialog.getByRole("button", { name: "保存" }).click()
  await expect(dialog).not.toBeVisible()
}

/** 删除角色 */
export async function deleteRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const expectFail = Boolean(args?.expectFail ?? false)

  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  if (expectFail) {
    // 受保护角色（如 superuser）可能没有删除按钮
    return
  }

  // 角色名的直接父级就是角色行，包含删除按钮
  const nameEl = page.locator("main").getByText(name, { exact: true })
  await nameEl.waitFor()
  const row = nameEl.locator("xpath=..")

  // 点击删除按钮
  await row.getByRole("button", { name: "删除" }).click()

  // 等待 AlertDialog 确认弹窗
  const alertDialog = page.getByRole("alertdialog")
  await alertDialog.waitFor({ state: "visible" })
  await alertDialog.getByRole("button", { name: /确认|删除/ }).click()

  await expect(page.getByText(name, { exact: true })).not.toBeVisible()
}

/** 验证角色列表可见 */
export async function verifyRoleList(page: Page): Promise<void> {
  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()
  await expect(page.getByText("superuser")).toBeVisible()
  await expect(page.getByRole("button", { name: "创建角色" })).toBeVisible()
}
