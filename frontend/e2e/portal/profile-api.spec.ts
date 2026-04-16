import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("个人资料端点覆盖", () => {
  test("个人资料页面加载并显示用户信息", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
    // 用户名或手机号应该可见
    await expect(main.locator("text=/mudasky|profile/i").first()).toBeVisible()
  })

  test("修改用户名表单可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    const main = adminPage.locator("main")
    // 找到用户名相关的输入或编辑区域
    const nameSection = main.getByText(/用户名|username/i).first()
    await expect(nameSection).toBeVisible()
  })

  test("密码修改区域可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await expect(adminPage.getByText("修改密码")).toBeVisible()
  })

  test("两步验证区域可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await expect(adminPage.getByText("两步验证").first()).toBeVisible()
  })

  test("登录设备区域可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await expect(adminPage.getByText("登录设备")).toBeVisible()
    // 会话列表异步加载，等待"当前"标签出现
    await expect(adminPage.getByText("当前").first()).toBeVisible()
  })

  test("所属角色区域可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await expect(adminPage.getByText("所属角色")).toBeVisible()
  })
})
