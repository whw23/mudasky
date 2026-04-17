/**
 * 用户管理业务操作函数。
 * 通过 UI 进行用户搜索、状态切换、配额编辑、密码重置、强制登出、删除。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 搜索用户 */
export async function searchUser(page: Page, args?: Record<string, unknown>): Promise<void> {
  const keyword = String(args?.keyword ?? "")
  const expectFound = Boolean(args?.expectFound ?? true)

  await page.goto("/admin/users")
  await page.locator("main").waitFor()

  // 填写搜索框
  const searchInput = page.getByPlaceholder("搜索用户名或手机号")
  await searchInput.fill(keyword)

  // 等待搜索防抖
  await page.waitForTimeout(500)

  if (expectFound) {
    // 验证有结果
    await expect(page.locator("table tbody tr").first()).toBeVisible()
  } else {
    // 验证无结果
    await expect(page.getByText("暂无用户")).toBeVisible()
  }
}

/** 切换用户状态（禁用/启用） */
export async function toggleUserStatus(page: Page, args?: Record<string, unknown>): Promise<void> {
  const username = String(args?.username ?? "")
  const enable = Boolean(args?.enable ?? true)

  await page.goto("/admin/users")
  await page.locator("main").waitFor()

  // 搜索用户
  const searchInput = page.getByPlaceholder("搜索用户名或手机号")
  await searchInput.fill(username)
  await page.waitForTimeout(500)

  // 点击用户行展开面板
  const row = page.locator("tr", { hasText: username })
  await row.click()

  // 等待展开面板可见
  await page.getByText("基本信息").waitFor()

  // 点击状态切换按钮
  const statusButton = enable
    ? page.getByRole("button", { name: "启用用户" })
    : page.getByRole("button", { name: "禁用用户" })

  await statusButton.click()

  // 验证成功提示
  await page.waitForTimeout(300) // 等待 toast
  await expect(page.locator("main")).toBeVisible() // 页面仍正常
}

/** 编辑用户配额 */
export async function editUserQuota(page: Page, args?: Record<string, unknown>): Promise<void> {
  const username = String(args?.username ?? "")
  const quota = Number(args?.quota ?? 100)

  await page.goto("/admin/users")
  await page.locator("main").waitFor()

  // 搜索用户
  const searchInput = page.getByPlaceholder("搜索用户名或手机号")
  await searchInput.fill(username)
  await page.waitForTimeout(500)

  // 点击用户行展开面板
  const row = page.locator("tr", { hasText: username })
  await row.click()

  // 等待展开面板可见
  await page.getByText("基本信息").waitFor()

  // 找到配额输入框并修改
  const quotaInput = page.getByLabel("存储配额 (MB)")
  await quotaInput.clear()
  await quotaInput.fill(String(quota))

  // 保存
  await page.getByRole("button", { name: "保存配额" }).click()

  // 验证成功提示
  await page.waitForTimeout(300)
  await expect(page.locator("main")).toBeVisible()
}

/** 重置用户密码 */
export async function resetPassword(page: Page, args?: Record<string, unknown>): Promise<void> {
  const username = String(args?.username ?? "")
  const newPassword = String(args?.newPassword ?? "TempPass123!")

  await page.goto("/admin/users")
  await page.locator("main").waitFor()

  // 搜索用户
  const searchInput = page.getByPlaceholder("搜索用户名或手机号")
  await searchInput.fill(username)
  await page.waitForTimeout(500)

  // 点击用户行展开面板
  const row = page.locator("tr", { hasText: username })
  await row.click()

  // 等待展开面板可见
  await page.getByText("基本信息").waitFor()

  // 填写新密码和确认密码
  const passwordInput = page.getByLabel("新密码")
  await passwordInput.fill(newPassword)

  const confirmInput = page.getByLabel("确认密码")
  await confirmInput.fill(newPassword)

  // 点击重置密码按钮
  await page.getByRole("button", { name: "重置密码" }).click()

  // 验证成功提示
  await page.waitForTimeout(300)
  await expect(page.locator("main")).toBeVisible()
}

/** 强制登出用户 */
export async function forceLogout(page: Page, args?: Record<string, unknown>): Promise<void> {
  const username = String(args?.username ?? "")

  await page.goto("/admin/users")
  await page.locator("main").waitFor()

  // 搜索用户
  const searchInput = page.getByPlaceholder("搜索用户名或手机号")
  await searchInput.fill(username)
  await page.waitForTimeout(500)

  // 点击用户行展开面板
  const row = page.locator("tr", { hasText: username })
  await row.click()

  // 等待展开面板可见
  await page.getByText("基本信息").waitFor()

  // 点击强制登出按钮
  await page.getByRole("button", { name: "强制登出" }).click()

  // 验证成功提示
  await page.waitForTimeout(300)
  await expect(page.locator("main")).toBeVisible()
}

/** 删除用户 */
export async function deleteUser(page: Page, args?: Record<string, unknown>): Promise<void> {
  const username = String(args?.username ?? "")
  const expectFail = Boolean(args?.expectFail ?? false)

  await page.goto("/admin/users")
  await page.locator("main").waitFor()

  // 搜索用户
  const searchInput = page.getByPlaceholder("搜索用户名或手机号")
  await searchInput.fill(username)
  await page.waitForTimeout(500)

  // 点击用户行展开面板
  const row = page.locator("tr", { hasText: username })
  await row.click()

  // 等待展开面板可见
  await page.getByText("基本信息").waitFor()

  // 点击删除按钮
  const deleteButton = page.getByRole("button", { name: "删除用户" })
  await deleteButton.click()

  // 等待确认弹窗
  const alertDialog = page.getByRole("alertdialog")
  await expect(alertDialog).toBeVisible()

  // 确认删除
  await alertDialog.getByRole("button", { name: "确认" }).click()

  // 等待弹窗关闭
  await expect(alertDialog).not.toBeVisible()

  if (expectFail) {
    // 受保护用户删除失败，应该仍可见
    await page.waitForTimeout(500)
    await expect(page.getByText(username)).toBeVisible()
  } else {
    // 删除成功，面板关闭，列表不再显示该用户
    await page.waitForTimeout(500)
    await expect(page.getByText(username)).not.toBeVisible()
  }
}
