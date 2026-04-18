/**
 * 用户管理业务操作函数。
 * 通过 UI 进行用户搜索、状态切换、配额编辑、密码重置、强制登出、删除。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 导航到用户管理并搜索用户，展开详情面板 */
async function gotoUserAndExpand(page: Page, keyword: string): Promise<void> {
  await page.goto("/admin/users")
  await page.getByRole("heading", { name: "用户管理" }).waitFor({ timeout: 30_000 })

  // 从 phone 中提取本地号码用于搜索
  const searchTerm = keyword.replace(/^\+\d{1,4}-/, "")

  // 搜索用户
  await page.getByPlaceholder("搜索用户名或手机号").fill(searchTerm)

  // 等待搜索结果
  const row = page.getByRole("row", { name: new RegExp(searchTerm) })
  await row.first().waitFor()

  // 点击展开面板
  await row.first().click()

  // 等待面板加载
  await page.getByRole("heading", { name: "基本信息" }).waitFor()
}

/** 搜索用户 */
export async function searchUser(page: Page, args?: Record<string, unknown>): Promise<void> {
  const keyword = String(args?.keyword ?? "")
  const expectFound = Boolean(args?.expectFound ?? true)

  await page.goto("/admin/users")
  await page.getByRole("heading", { name: "用户管理" }).waitFor()

  await page.getByPlaceholder("搜索用户名或手机号").fill(keyword)

  if (expectFound) {
    await expect(page.getByRole("row").nth(1)).toBeVisible()
  } else {
    await expect(page.getByText("暂无用户")).toBeVisible()
  }
}

/** 切换用户状态（禁用/启用） */
export async function toggleUserStatus(page: Page, args?: Record<string, unknown>): Promise<void> {
  const phone = String(args?.phone ?? args?.username ?? "")
  const disable = Boolean(args?.disable ?? false)

  await gotoUserAndExpand(page, phone)

  // 点击禁用/启用按钮（DOM 中为"禁用账号"或"启用账号"）
  const buttonName = disable ? "禁用账号" : "启用账号"
  await page.getByRole("button", { name: buttonName }).click()

  // 等待成功提示
  await page.getByText(/成功/).waitFor({ state: "visible" })
}

/** 编辑用户配额 */
export async function editUserQuota(page: Page, args?: Record<string, unknown>): Promise<void> {
  const phone = String(args?.phone ?? args?.username ?? "")
  const quota = Number(args?.quota ?? 100)

  await gotoUserAndExpand(page, phone)

  // 找到存储配额区域的 spinbutton
  const quotaSection = page.getByRole("heading", { name: "存储配额" }).locator("..")
  const quotaInput = quotaSection.getByRole("spinbutton")
  await quotaInput.fill(String(quota))

  // 保存
  await quotaSection.getByRole("button", { name: "保存" }).click()

  // 验证成功提示
  await page.getByText(/成功/).waitFor({ state: "visible" })
}

/** 重置用户密码 */
export async function resetPassword(page: Page, args?: Record<string, unknown>): Promise<void> {
  const phone = String(args?.phone ?? args?.username ?? "")
  const newPassword = String(args?.newPassword ?? "TempPass123!")

  await gotoUserAndExpand(page, phone)

  // 找到重置密码区域
  const section = page.getByRole("heading", { name: "重置密码" }).locator("..")

  // 填写新密码和确认密码（两个都是 placeholder "请输入密码"）
  const passwordInputs = section.getByPlaceholder("请输入密码")
  await passwordInputs.first().fill(newPassword)
  await passwordInputs.last().fill(newPassword)

  // 点击重置密码按钮
  await section.getByRole("button", { name: "重置密码" }).click()

  // 验证成功提示
  await page.getByText(/成功/).waitFor({ state: "visible" })
}

/** 强制登出用户 */
export async function forceLogout(page: Page, args?: Record<string, unknown>): Promise<void> {
  const phone = String(args?.phone ?? args?.username ?? "")

  await gotoUserAndExpand(page, phone)

  // 点击强制登出按钮（heading "强制登出" 区域的按钮）
  const section = page.getByRole("heading", { name: "强制登出" }).locator("..")
  await section.getByRole("button", { name: "强制登出" }).click()

  // 验证成功提示
  await page.getByText(/成功/).waitFor({ state: "visible" })
}

/** 删除用户 */
export async function deleteUser(page: Page, args?: Record<string, unknown>): Promise<void> {
  const phone = String(args?.phone ?? args?.username ?? "")

  await gotoUserAndExpand(page, phone)

  // 点击删除用户按钮
  const section = page.getByRole("heading", { name: "删除用户" }).locator("..")
  await section.getByRole("button", { name: "删除用户" }).click()

  // 等待确认弹窗
  const alertDialog = page.getByRole("alertdialog")
  await expect(alertDialog).toBeVisible()

  // 确认删除
  await alertDialog.getByRole("button", { name: /确认|删除/ }).click()

  // 等待弹窗关闭
  await expect(alertDialog).not.toBeVisible()
}
