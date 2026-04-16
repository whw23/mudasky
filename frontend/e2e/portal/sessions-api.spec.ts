import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("会话管理端点覆盖", () => {
  test("会话列表显示当前设备", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    const main = adminPage.locator("main")
    // 会话管理区域应该可见
    const sessionSection = main.getByText(/会话|session|设备/i).first()
    await expect(sessionSection).toBeVisible()
  })

  test("当前设备不显示踢出按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/profile")
    // 等待"当前"标签出现（会话列表异步加载）
    const currentBadge = adminPage.getByText("当前").first()
    await expect(currentBadge).toBeVisible()
    // 当前设备的卡片不应有踢出按钮：找到"当前"badge 所在的设备卡片
    const deviceCard = currentBadge.locator("xpath=ancestor::div[contains(@class, 'rounded-md')]")
    const revokeBtn = deviceCard.getByRole("button", { name: "踢出" })
    await expect(revokeBtn).not.toBeVisible()
  })
})
