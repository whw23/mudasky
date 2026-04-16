/**
 * W2 个人资料测试。
 * 覆盖用户名修改、密码修改、手机号修改、角色显示、负向测试。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"
import { waitFor } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"

let W2_PHONE = ""

test.beforeAll(async () => {
  const info = await waitFor<{ phone: string }>("w2_registered", 5_000)
  W2_PHONE = info.phone
})

test.describe("W2 个人资料", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/portal/profile")
  })

  test("页面加载显示基本信息", async ({ page }) => {
    await expect(page.getByText("基本信息")).toBeVisible()
    await expect(page.getByText("用户名")).toBeVisible()
    await expect(page.getByText("手机号")).toBeVisible()
    trackComponent("ProfileInfo", "基本信息卡片")
  })

  test("显示角色为 student", async ({ page }) => {
    await expect(page.getByText("所属角色")).toBeVisible()
    await expect(page.getByText("student")).toBeVisible()
    trackComponent("ProfileInfo", "角色显示")
  })

  test("修改用户名成功", async ({ page }) => {
    const newName = `E2E-renamed-${Date.now()}`

    // 点击第一个"修改"按钮（用户名行）
    await page.getByRole("button", { name: "修改" }).first().click()
    await expect(page.getByRole("button", { name: "取消" }).first()).toBeVisible()

    // 清空并输入新用户名
    const input = page.getByPlaceholder("请输入用户名")
    await input.fill(newName)

    // 提交（点击确认图标按钮）
    await page.locator("form").first().getByRole("button").filter({ has: page.locator("svg") }).first().click()

    // 等待成功提示
    await expect(page.getByText("用户名已保存")).toBeVisible()
    trackComponent("ProfileInfo", "修改用户名")
  })

  test("修改用户名 - 空值被拒绝", async ({ page }) => {
    await page.getByRole("button", { name: "修改" }).first().click()
    const input = page.getByPlaceholder("请输入用户名")
    await input.fill("")

    // HTML required 阻止提交，输入框应处于 invalid 状态
    await page.locator("form").first().getByRole("button").filter({ has: page.locator("svg") }).first().click()

    // 验证表单未提交（编辑表单仍然可见）
    await expect(input).toBeVisible()
    // 不应出现成功提示
    await expect(page.getByText("用户名已保存")).not.toBeVisible()
    trackComponent("ProfileInfo", "空用户名被拒绝")
  })

  test("密码修改区域可展开", async ({ page }) => {
    await expect(page.getByText("修改密码")).toBeVisible()

    // 找到密码行的修改按钮并点击
    const passwordSection = page.getByText("修改密码").locator("..")
    const editBtns = page.getByRole("button", { name: "修改" })
    // 密码行对应第三个修改按钮（用户名、手机号、密码的顺序）
    // 通过判断是否有 "新密码" 输入框来确认展开
    for (let i = 0; i < (await editBtns.count()); i++) {
      await editBtns.nth(i).click()
      if (await page.getByPlaceholder("请输入新密码").isVisible().catch(() => false)) break
      // 取消当前展开
      const cancelBtn = page.getByRole("button", { name: "取消" }).first()
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click()
      }
    }

    await expect(page.getByPlaceholder("请输入新密码")).toBeVisible()
    await expect(page.getByPlaceholder("请再次输入新密码")).toBeVisible()
    trackComponent("ProfileInfo", "密码修改表单")
  })

  test("修改密码 - 通过短信验证码", async ({ page }) => {
    // 展开密码编辑
    const editBtns = page.getByRole("button", { name: "修改" })
    for (let i = 0; i < (await editBtns.count()); i++) {
      await editBtns.nth(i).click()
      if (await page.getByPlaceholder("请输入新密码").isVisible().catch(() => false)) break
      const cancelBtn = page.getByRole("button", { name: "取消" }).first()
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
    }

    // 获取短信验证码
    const smsCode = await getSmsCode(page, W2_PHONE)

    // 填写表单
    await page.getByPlaceholder("请输入验证码").fill(smsCode)
    await page.getByPlaceholder("请输入新密码").fill("Test@12345")
    await page.getByPlaceholder("请再次输入新密码").fill("Test@12345")

    await page.getByRole("button", { name: "保存" }).click()
    await expect(page.getByText("密码修改成功")).toBeVisible()
    trackComponent("ProfileInfo", "修改密码成功")
  })

  test("修改手机号表单可展开", async ({ page }) => {
    // 找到手机号行的修改按钮
    const editBtns = page.getByRole("button", { name: "修改" })
    for (let i = 0; i < (await editBtns.count()); i++) {
      await editBtns.nth(i).click()
      if (await page.getByPlaceholder("请输入新手机号").isVisible().catch(() => false)) break
      const cancelBtn = page.getByRole("button", { name: "取消" }).first()
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
    }

    await expect(page.getByPlaceholder("请输入新手机号")).toBeVisible()
    await expect(page.getByPlaceholder("请输入验证码")).toBeVisible()
    trackComponent("ProfileInfo", "手机号修改表单")
  })

  test("二步验证区域可见且显示未启用", async ({ page }) => {
    await expect(page.getByText("两步验证", { exact: true })).toBeVisible()
    await expect(page.getByText("未启用两步验证")).toBeVisible()
    trackComponent("ProfileInfo", "二步验证状态")
  })

  test("登录设备区域可见", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByText("登录设备")).toBeVisible()
    await expect(page.getByText("当前").first()).toBeVisible()
    trackComponent("ProfileInfo", "登录设备区域")
  })

  test("注销账号按钮可见", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByText("注销账号").first()).toBeVisible()
    trackComponent("ProfileInfo", "注销账号按钮")
  })
})
