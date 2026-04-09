/**
 * 案例管理 E2E 测试。
 * 测试页面加载和UI交互（不依赖后端认证）。
 */

import { test, expect } from "../fixtures/base"

test.describe("案例管理", () => {
  test("页面加载并展示添加按钮", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await expect(adminPage.getByRole("heading", { name: "案例管理" })).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "添加案例" })).toBeVisible()
  })

  test("打开添加案例对话框", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await adminPage.waitForLoadState("networkidle")

    await adminPage.getByRole("button", { name: "添加案例" }).click()
    await adminPage.waitForSelector('role=dialog', { state: 'visible', timeout: 10000 })

    /* 验证对话框标题和字段 */
    await expect(adminPage.getByRole("heading", { name: "添加案例" })).toBeVisible()
    await expect(adminPage.getByPlaceholder("请输入学生姓名")).toBeVisible()
    await expect(adminPage.getByPlaceholder("请输入录取大学")).toBeVisible()
    await expect(adminPage.getByPlaceholder("请输入录取专业")).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "保存" })).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "取消" })).toBeVisible()
  })

  test("取消按钮关闭对话框", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await adminPage.waitForLoadState("networkidle")

    await adminPage.getByRole("button", { name: "添加案例" }).click()
    await adminPage.waitForSelector('role=dialog', { state: 'visible', timeout: 10000 })

    await adminPage.getByRole("button", { name: "取消" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 5000 })
  })

  test("表单字段可以填写", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await adminPage.waitForLoadState("networkidle")

    await adminPage.getByRole("button", { name: "添加案例" }).click()
    await adminPage.waitForSelector('role=dialog', { state: 'visible', timeout: 10000 })

    /* 填写表单字段 */
    const nameInput = adminPage.getByPlaceholder("请输入学生姓名")
    await nameInput.fill("测试学生")
    await expect(nameInput).toHaveValue("测试学生")

    const universityInput = adminPage.getByPlaceholder("请输入录取大学")
    await universityInput.fill("测试大学")
    await expect(universityInput).toHaveValue("测试大学")

    const programInput = adminPage.getByPlaceholder("请输入录取专业")
    await programInput.fill("测试专业")
    await expect(programInput).toHaveValue("测试专业")
  })
})
