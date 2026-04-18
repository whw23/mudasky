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
  await page.getByRole("heading", { name: "用户管理" }).waitFor()

  // 从 phone 中提取本地号码用于搜索（格式 +86-13900001234 → 13900001234）
  const localNumber = phone.replace(/^\+\d{1,4}-/, "")

  // 在搜索框输入手机号
  await page.getByPlaceholder("搜索用户名或手机号").fill(localNumber)

  // 等待搜索结果更新（等待表格行包含该号码）
  const row = page.getByRole("row", { name: new RegExp(localNumber) })
  await row.first().waitFor()

  // 点击表格行展开用户详情面板
  await row.first().click()

  // 等待展开面板加载（等待"分配角色"标题出现）
  await page.getByRole("heading", { name: "分配角色" }).waitFor()

  // 选择角色（combobox）
  const roleSection = page.getByRole("heading", { name: "分配角色" }).locator("..")
  const combobox = roleSection.getByRole("combobox")

  // 等待角色列表 API 返回（combobox options 包含目标角色）
  await page.waitForFunction(
    (label: string) => {
      const selects = document.querySelectorAll("select")
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.text === label) return true
        }
      }
      return false
    },
    roleName,
    { timeout: 10_000 },
  )

  // 确认当前选中的不是目标角色
  const currentText = await combobox.locator("option:checked").textContent()
  if (currentText?.trim() === roleName) {
    return // 已是目标角色，跳过
  }

  // 选择角色并验证（重试最多 3 次，防止 React 重渲染重置选择）
  const targetRoleId = await combobox.evaluate(
    (el: HTMLSelectElement, label: string) =>
      Array.from(el.options).find(o => o.text === label)?.value ?? "",
    roleName,
  )
  if (!targetRoleId) throw new Error(`未找到角色选项: "${roleName}"`)

  for (let attempt = 0; attempt < 3; attempt++) {
    await combobox.selectOption({ label: roleName })
    // 验证选择生效
    const currentValue = await combobox.inputValue()
    if (currentValue === targetRoleId) break
    // 没生效，等一下再试
    await page.waitForTimeout(200)
  }

  // 最终确认
  const finalValue = await combobox.inputValue()
  if (finalValue !== targetRoleId) {
    throw new Error(`角色选择失败: 期望 ${targetRoleId}, 实际 ${finalValue}`)
  }

  // 监听角色分配 API 响应
  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/users/list/detail/assign-role") && r.request().method() === "POST",
    { timeout: 15_000 },
  )

  // 点击保存
  await roleSection.getByRole("button", { name: "保存" }).click()

  // 等待 API 返回并验证
  const res = await saveResponse
  const resBody = await res.text().catch(() => "")

  if (!res.ok()) {
    throw new Error(`角色分配 API 返回 ${res.status()}: ${resBody.substring(0, 200)}`)
  }

  const resData = JSON.parse(resBody)
  if (resData.role_name && resData.role_name !== roleName) {
    const reqBody = res.request().postData() || ""
    throw new Error(`角色分配未生效: 期望 "${roleName}", 响应 "${resData.role_name}", 请求=${reqBody}`)
  }
}
