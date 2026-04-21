/**
 * UI 角色分配流程。
 * W1 superuser 在用户管理页面为其他 worker 分配角色。
 * 使用 shadcn Select（base-ui），通过 click trigger → click option 操作。
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

  // 从 phone 中提取本地号码用于搜索
  const localNumber = phone.replace(/^\+\d{1,4}-/, "")

  // 搜索用户
  await page.getByPlaceholder("搜索用户名或手机号").fill(localNumber)

  // 等待搜索结果
  const row = page.getByRole("row", { name: new RegExp(localNumber) })
  await row.first().waitFor()

  // 点击展开用户详情面板
  await row.first().click()

  // 等待"分配角色"区域加载
  await page.getByRole("heading", { name: "分配角色" }).waitFor()

  const roleSection = page.getByRole("heading", { name: "分配角色" }).locator("..")
  const trigger = roleSection.getByRole("combobox")

  // 检查当前选中值是否已是目标角色
  const currentText = await trigger.textContent()
  if (currentText?.includes(roleName)) {
    return
  }

  // 点击 trigger 打开下拉 → 点击目标 option（重试最多 3 次）
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click()

    const option = page.getByRole("option", { name: roleName })
    try {
      await option.waitFor({ state: "visible", timeout: 5_000 })
      await option.click()

      // 验证选中
      await page.waitForTimeout(300)
      const newText = await trigger.textContent()
      if (newText?.includes(roleName)) break
    } catch {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
    }
  }

  // 最终验证
  const finalText = await trigger.textContent()
  if (!finalText?.includes(roleName)) {
    throw new Error(`角色选择失败: 期望包含 "${roleName}", 实际 "${finalText}"`)
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
