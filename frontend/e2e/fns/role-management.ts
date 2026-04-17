/**
 * 角色管理业务操作函数。
 * 通过 UI 进行角色的创建、编辑、删除。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 找到角色行中的指定按钮（通过角色名文本定位其所在行） */
async function findRoleButton(page: Page, roleName: string, buttonName: string) {
  // 精确匹配角色名文本，然后找到同一行的按钮
  // 角色名在 generic 元素中，按钮在同级 generic 中
  const nameEl = page.locator("main").getByText(roleName, { exact: true })
  // 向上找到包含按钮的行容器（父级的父级）
  return nameEl.locator("xpath=..").getByRole("button", { name: buttonName })
}

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

  const editBtn = await findRoleButton(page, oldName, "编辑")
  await editBtn.click()

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
    const nameEl = page.locator("main").getByText(name, { exact: true })
    const parentRow = nameEl.locator("xpath=..")
    const hasDeleteBtn = await parentRow.getByRole("button", { name: "删除" }).isVisible().catch(() => false)
    if (!hasDeleteBtn) return // 无删除按钮 = 正确的保护行为
    await parentRow.getByRole("button", { name: "删除" }).click()
    await expect(page.getByText(name)).toBeVisible()
  } else {
    const deleteBtn = await findRoleButton(page, name, "删除")
    await deleteBtn.click()
    await expect(page.getByText(name, { exact: true })).not.toBeVisible()
  }
}

/** 验证角色列表可见 */
export async function verifyRoleList(page: Page): Promise<void> {
  await page.goto("/admin/roles")
  await page.waitForLoadState("networkidle")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  await expect(page.getByText("superuser")).toBeVisible()
  await expect(page.getByRole("button", { name: "创建角色" })).toBeVisible()
}
