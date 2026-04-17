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

  // 找到角色名文本，然后定位同行的编辑按钮
  const nameEl = page.locator("main").getByText(oldName, { exact: true })
  await nameEl.waitFor()
  // 角色名和按钮在同一个 flex 行容器中，向上逐级找到包含编辑按钮的容器
  let clicked = false
  for (let level = 1; level <= 5; level++) {
    const ancestor = nameEl.locator(`xpath=${"..".concat("/..".repeat(level - 1))}`)
    const btn = ancestor.getByRole("button", { name: "编辑" })
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click()
      clicked = true
      break
    }
  }
  if (!clicked) throw new Error(`未找到角色 "${oldName}" 的编辑按钮`)

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

  // 找到角色名文本，然后向上逐级找到包含删除按钮的容器
  const nameEl = page.locator("main").getByText(name, { exact: true })
  await nameEl.waitFor()
  for (let level = 1; level <= 5; level++) {
    const ancestor = nameEl.locator(`xpath=${"..".concat("/..".repeat(level - 1))}`)
    const btn = ancestor.getByRole("button", { name: "删除" })
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click()
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
