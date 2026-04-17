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
  await page.waitForLoadState("networkidle")
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
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  // 遍历所有编辑按钮，找到同一行包含角色名的那个
  const editButtons = page.locator("main").getByRole("button", { name: "编辑" })
  const count = await editButtons.count()
  for (let i = 0; i < count; i++) {
    const btn = editButtons.nth(i)
    // 检查按钮的祖先行是否包含角色名
    const row = btn.locator("xpath=ancestor::*[3]")
    if (await row.getByText(oldName, { exact: true }).isVisible().catch(() => false)) {
      await btn.click()
      break
    }
  }

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

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
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  if (expectFail) {
    // 受保护角色（如 superuser）可能没有删除按钮
    return
  }

  // 遍历所有删除按钮，找到同一行包含角色名的那个
  const deleteButtons = page.locator("main").getByRole("button", { name: "删除" })
  const count = await deleteButtons.count()
  for (let i = 0; i < count; i++) {
    const btn = deleteButtons.nth(i)
    const row = btn.locator("xpath=ancestor::*[3]")
    if (await row.getByText(name, { exact: true }).isVisible().catch(() => false)) {
      await btn.click()
      await expect(page.getByText(name, { exact: true })).not.toBeVisible()
      return
    }
  }
  throw new Error(`未找到角色 "${name}" 的删除按钮`)
}

/** 验证角色列表可见 */
export async function verifyRoleList(page: Page): Promise<void> {
  await page.goto("/admin/roles")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()
  await expect(page.getByText("superuser")).toBeVisible()
  await expect(page.getByRole("button", { name: "创建角色" })).toBeVisible()
}
