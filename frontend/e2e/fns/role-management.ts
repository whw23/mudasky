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

  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  // 点击创建角色按钮
  await page.getByRole("button", { name: "创建角色" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByPlaceholder("请输入角色名称").fill(name)
  await dialog.getByPlaceholder("请输入角色描述").fill(description)

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
  const newDescription = String(args?.newDescription ?? "")

  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  // 找到角色行（grid 布局，用 locator + hasText 定位），点击编辑
  const roleRow = page.locator("main >> text=" + oldName).locator("..")
  await roleRow.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改描述
  if (newDescription) {
    const descInput = dialog.getByPlaceholder("请输入角色描述")
    await descInput.clear()
    await descInput.fill(newDescription)
  }

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()
}

/** 删除角色 */
export async function deleteRole(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const expectFail = Boolean(args?.expectFail ?? false)

  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  // 找到角色行（包含角色名的容器中的删除按钮）
  const roleRow = page.locator("main").locator(`text=${name}`).locator("xpath=ancestor::*[.//button]").first()
  const deleteButton = roleRow.getByRole("button", { name: "删除" })

  if (expectFail) {
    // 受保护角色（如 superuser）可能没有删除按钮
    const hasButton = await deleteButton.isVisible().catch(() => false)
    if (!hasButton) {
      // 没有删除按钮 = 正确的保护行为
      return
    }
    // 有按钮但删除应失败
    await deleteButton.click()
    await expect(page.getByText(name)).toBeVisible()
  } else {
    await deleteButton.click()
    // 删除成功，从列表消失
    await expect(page.getByText(name)).not.toBeVisible()
  }
}

/** 验证角色列表可见 */
export async function verifyRoleList(page: Page): Promise<void> {
  await page.goto("/admin/roles")
  await page.getByRole("heading", { name: "角色管理" }).waitFor()

  // 验证至少有内置角色
  await expect(page.getByText("superuser")).toBeVisible()

  // 验证创建按钮可见
  await expect(page.getByRole("button", { name: "创建角色" })).toBeVisible()
}
