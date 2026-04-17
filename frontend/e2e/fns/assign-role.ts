/**
 * UI 角色分配流程。
 * W1 superuser 在用户管理页面为其他 worker 分配角色。
 */

import type { Page } from "@playwright/test"

export default async function assignRole(
  page: Page,
  args?: Record<string, unknown>,
): Promise<void> {
  const phone = args?.phone as string
  const roleName = args?.roleName as string

  if (!phone || !roleName) {
    throw new Error("assignRole fn 需要 phone 和 roleName 参数")
  }

  // 导航到用户管理页面
  await page.goto("/admin/users")

  // 从 phone 中提取本地号码用于搜索（格式 +86-13900001234 → 13900001234）
  const localNumber = phone.replace(/^\+\d{1,4}-/, "")

  // 在搜索框输入手机号
  await page.getByPlaceholder(/搜索/).fill(localNumber)

  // 等待搜索结果更新（防抖 300ms）
  await page.waitForTimeout(500)

  // 点击表格行展开用户详情面板
  await page.getByRole("row", { name: new RegExp(localNumber) }).click()

  // 等待展开面板加载（检查角色下拉框是否出现）
  await page.locator("select").first().waitFor({ state: "visible" })

  // 选择角色（第一个 select 是角色选择器）
  await page.locator("select").first().selectOption({ label: roleName })

  // 点击保存角色按钮
  await page.getByRole("button", { name: /保存角色/ }).click()

  // 等待成功提示（toast）
  await page.getByText(/成功/).waitFor({ state: "visible" })
}
