import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("个人资料端点覆盖", () => {
  test("个人资料页面加载并显示用户信息", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
    await adminPage.waitForTimeout(3000)
    // 用户名或手机号应该可见
    await expect(main.locator("text=/mudasky|profile/i").first()).toBeVisible({ timeout: 10_000 })
  })

  test("修改用户名表单可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await adminPage.waitForTimeout(3000)
    const main = adminPage.locator("main")
    // 找到用户名相关的输入或编辑区域
    const nameSection = main.getByText(/用户名|username/i).first()
    await expect(nameSection).toBeVisible({ timeout: 10_000 })
  })
})
