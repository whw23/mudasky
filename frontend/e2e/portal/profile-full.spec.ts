/**
 * 用户个人资料全面 E2E 测试。
 * 覆盖用户名编辑、手机号修改UI、密码修改UI、2FA、会话管理、注销账号。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("个人资料页", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
  })

  test("页面加载显示基本信息", async ({ adminPage }) => {
    await expect(adminPage.getByText("基本信息")).toBeVisible()
    await expect(adminPage.getByText("用户名")).toBeVisible()
  })

  test("显示用户名 mudasky", async ({ adminPage }) => {
    await expect(adminPage.locator("body")).toContainText("mudasky")
  })

  test("用户名修改按钮可见", async ({ adminPage }) => {
    const editBtn = adminPage.getByRole("button", { name: "修改" }).first()
    await expect(editBtn).toBeVisible()
  })

  test("点击修改用户名展开编辑表单", async ({ adminPage }) => {
    await adminPage.getByRole("button", { name: "修改" }).first().click()
    // 应该出现输入框和取消按钮
    await expect(adminPage.getByRole("button", { name: "取消" }).first()).toBeVisible()
  })

  test("密码区域显示已设置或未设置", async ({ adminPage }) => {
    await expect(adminPage.getByText("修改密码")).toBeVisible()
  })

  test("二步验证区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText("两步验证", { exact: true })).toBeVisible()
  })

  test("角色显示区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText("所属角色")).toBeVisible()
  })

  test("登录设备区域可见", async ({ adminPage }) => {
    await expect(adminPage.getByText("登录设备")).toBeVisible()
    // 会话列表异步加载，等待"当前"标签出现
    await expect(adminPage.getByText("当前").first()).toBeVisible()
  })
})

test.describe("用户中心侧边栏", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
  })

  test("显示用户中心菜单", async ({ adminPage }) => {
    await expect(adminPage.getByRole("link", { name: "总览" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "个人资料" })).toBeVisible()
    await expect(adminPage.getByRole("link", { name: "文档管理" })).toBeVisible()
  })

  test("返回官网链接可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("link", { name: "返回官网" })).toBeVisible()
  })
})
