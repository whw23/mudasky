/**
 * W2 两步验证测试。
 * 覆盖 SMS 方式启用/禁用 2FA，负向测试。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"
import { waitFor } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"

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

  test("启用 SMS 两步验证", async ({ page }) => {
    await expect(page.getByText("两步验证", { exact: true })).toBeVisible()

    // 应显示"未启用两步验证"
    await expect(page.getByText("未启用两步验证")).toBeVisible()

    // 点击启用
    await page.getByRole("button", { name: "启用" }).click()

    // 选择短信验证方式
    await expect(page.getByRole("button", { name: "短信验证" })).toBeVisible()
    await page.getByRole("button", { name: "短信验证" }).click()

    // 获取验证码
    const code = await getSmsCode(page, W2_PHONE)
    await page.getByPlaceholder("请输入验证码").fill(code)

    // 确认启用
    await page.getByRole("button", { name: "确认启用" }).click()
    await expect(page.getByText("两步验证已启用")).toBeVisible()

    trackComponent("TwoFactorSettings", "启用SMS两步验证")
  })

  test("验证 2FA 已启用状态", async ({ page }) => {
    await expect(page.getByText("已启用两步验证")).toBeVisible()
    await expect(page.getByText("短信验证")).toBeVisible()
    trackComponent("TwoFactorSettings", "已启用状态显示")
  })

  test("禁用两步验证", async ({ page }) => {
    await expect(page.getByText("已启用两步验证")).toBeVisible()

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

  test("负向 - 错误验证码启用失败", async ({ page }) => {
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    await page.getByRole("button", { name: "启用" }).click()
    await page.getByRole("button", { name: "短信验证" }).click()

    // 输入错误验证码
    await page.getByPlaceholder("请输入验证码").fill("000000")
    await page.getByRole("button", { name: "确认启用" }).click()

    // 应显示错误提示，不应显示成功
    await expect(page.getByText("两步验证已启用")).not.toBeVisible()
    trackComponent("TwoFactorSettings", "错误验证码被拒绝")
  })

  test("负向 - 取消启用流程", async ({ page }) => {
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    await page.getByRole("button", { name: "启用" }).click()

    // 取消
    await page.getByRole("button", { name: "取消" }).click()

    // 应回到未启用状态
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    trackComponent("TwoFactorSettings", "取消启用流程")
  })
})
