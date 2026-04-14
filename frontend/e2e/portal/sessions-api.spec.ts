import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("会话管理端点覆盖", () => {
  test("会话列表显示当前设备", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    await adminPage.waitForTimeout(3000)
    const main = adminPage.locator("main")
    // 会话管理区域应该可见
    const sessionSection = main.getByText(/会话|session|设备/i).first()
    await expect(sessionSection).toBeVisible({ timeout: 10_000 })
  })
})
