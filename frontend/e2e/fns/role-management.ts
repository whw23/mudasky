/**
 * 角色管理业务操作函数。
 * 通过 UI 进行角色的创建、编辑、删除、权限分配。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 创建角色 */
export async function createRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const description = String(args?.description ?? "")
  const permissions = (args?.permissions as string[]) ?? []

  await page.goto("/admin/roles")
  await page.locator("main").waitFor()

  // 点击创建角色按钮
  await page.getByRole("button", { name: "创建角色" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByLabel("角色名称").fill(name)
  await dialog.getByLabel("描述").fill(description)

  // 选择权限（勾选 checkbox）
  for (const permission of permissions) {
    // 权限树中查找并勾选
    const checkbox = dialog.locator(`input[type="checkbox"][value="${permission}"]`)
    if (await checkbox.isVisible()) {
      await checkbox.check()
    }
  }

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByText(name)).toBeVisible()
}

/** 编辑角色 */
export async function editRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldName = String(args?.oldName ?? "")
  const newName = String(args?.newName ?? "")
  const newDescription = String(args?.newDescription ?? "")

  await page.goto("/admin/roles")
  await page.locator("main").waitFor()

  // 找到角色行，点击编辑
  const row = page.locator("div.grid", { hasText: oldName })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改名称和描述
  const nameInput = dialog.getByLabel("角色名称")
  await nameInput.clear()
  await nameInput.fill(newName)

  const descInput = dialog.getByLabel("描述")
  await descInput.clear()
  await descInput.fill(newDescription)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功
  await expect(page.getByText(newName)).toBeVisible()
}

/** 删除角色 */
export async function deleteRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const expectFail = Boolean(args?.expectFail ?? false)

  await page.goto("/admin/roles")
  await page.locator("main").waitFor()

  // 找到角色行，点击删除
  const row = page.locator("div.grid", { hasText: name })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  if (expectFail) {
    // 受保护角色删除失败，应该仍可见
    await page.waitForTimeout(500) // 等待请求完成
    await expect(page.getByText(name)).toBeVisible()
  } else {
    // 删除成功，从列表消失
    await expect(page.getByText(name)).not.toBeVisible()
  }
}

/** 验证角色列表可见 */
export async function verifyRoleList(page: Page): Promise<void> {
  await page.goto("/admin/roles")
  await page.locator("main").waitFor()

  // 验证至少有内置角色
  await expect(page.getByText("superuser")).toBeVisible()

  // 验证创建按钮可见
  await expect(page.getByRole("button", { name: "创建角色" })).toBeVisible()
}
