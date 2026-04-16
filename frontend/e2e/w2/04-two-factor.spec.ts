/**
 * W2 两步验证测试。
 * 覆盖启用流程（方式选择 → 确认/取消）、负向测试。
 * ProfileInfo 组件集成了 2FA：启用 → 选方式 → 确认。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"
import { getSmsCode } from "../helpers/sms"
import { waitFor } from "../helpers/signal"

let W2_PHONE = ""

test.beforeAll(async () => {
  const info = await waitFor<{ phone: string }>("w2_registered", 5_000)
  W2_PHONE = info.phone
})

test.describe("W2 两步验证", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/portal/profile")
  })

  test("两步验证区域可见", async ({ page }) => {
    await expect(page.getByText("两步验证", { exact: true })).toBeVisible()
    trackComponent("TwoFactorSettings", "区域可见")
  })

  test("启用 SMS 两步验证", async ({ page }) => {
    // 检查当前状态
    const alreadyEnabled = await page.getByText("已启用两步验证").isVisible().catch(() => false)
    if (alreadyEnabled) {
      test.skip()
      return
    }

    // 未启用状态应显示"启用"按钮
    await expect(page.getByText("未启用两步验证")).toBeVisible()

    // 点击启用进入方式选择
    await page.getByRole("button", { name: "启用" }).click()

    // 应显示方式选择按钮
    const smsBtn = page.getByRole("button", { name: "短信验证" })
    await expect(smsBtn).toBeVisible()
    await smsBtn.click()

    // 获取验证码
    const code = await getSmsCode(page, W2_PHONE)
    await page.getByPlaceholder("请输入验证码").fill(code)

    // 确认启用
    await page.getByRole("button", { name: "确认启用" }).click()
    await expect(page.getByText("两步验证已启用")).toBeVisible()

    trackComponent("TwoFactorSettings", "启用SMS两步验证")
  })

  test("验证 2FA 已启用状态", async ({ page }) => {
    // 刷新后检查状态（可能含"（短信验证）"后缀）
    const enabledText = page.getByText("已启用两步验证")
    await expect(enabledText).toBeVisible()
    trackComponent("TwoFactorSettings", "已启用状态显示")
  })

  test("禁用两步验证", async ({ page }) => {
    const enabled = await page.getByText("已启用两步验证").isVisible().catch(() => false)
    if (!enabled) {
      test.skip()
      return
    }

    // 点击禁用按钮
    await page.getByRole("button", { name: "禁用" }).click()

    // 等待对话框出现
    await expect(page.getByRole("dialog")).toBeVisible()

    // 获取验证码并填入
    const code = await getSmsCode(page, W2_PHONE)
    await page.getByRole("dialog").getByPlaceholder("请输入验证码").fill(code)

    // 确认禁用
    await page.getByRole("dialog").getByRole("button", { name: "确认禁用" }).click()
    await expect(page.getByText("两步验证已禁用")).toBeVisible()

    trackComponent("TwoFactorSettings", "禁用两步验证")
  })

  test("验证 2FA 已禁用状态", async ({ page }) => {
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    await expect(page.getByRole("button", { name: "启用" })).toBeVisible()
    trackComponent("TwoFactorSettings", "已禁用状态显示")
  })

  test("负向 - 取消启用流程", async ({ page }) => {
    const enabled = await page.getByText("已启用两步验证").isVisible().catch(() => false)
    if (enabled) {
      test.skip()
      return
    }

    await expect(page.getByText("未启用两步验证")).toBeVisible()
    await page.getByRole("button", { name: "启用" }).click()

    // 方式选择界面出现
    await expect(page.getByRole("button", { name: "短信验证" })).toBeVisible()

    // 取消
    await page.getByRole("button", { name: "取消" }).click()

    // 应回到未启用状态
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    trackComponent("TwoFactorSettings", "取消启用流程")
  })
})
