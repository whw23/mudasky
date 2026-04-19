/**
 * 个人资料管理业务操作函数。
 * 所有操作通过 UI 完成，不直接调用 API。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { getSmsCode } from "../helpers/sms"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 导航到个人资料页并验证基本信息显示。
 */
export const viewProfile: TaskFn = async (page) => {
  await page.goto("/portal/profile")
  await page.locator("main").waitFor()
  await expect(page.getByText("基本信息")).toBeVisible()
  await expect(page.getByText("用户名")).toBeVisible()
  await expect(page.getByText("手机号")).toBeVisible()
}

/**
 * 修改用户名并保存。
 * args.username: 新用户名
 */
export const editUsername: TaskFn = async (page, args) => {
  const newName = args?.username as string || `E2E-renamed-${Date.now()}`

  // 导航到个人资料页面
  await page.goto("/portal/profile")
  await page.locator("main").waitFor()
  await expect(page.getByText("基本信息")).toBeVisible()
  await expect(page.getByText("用户名")).toBeVisible()

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
}

/**
 * 验证密码修改区域可展开。
 */
export const viewPasswordSection: TaskFn = async (page) => {
  await expect(page.getByText("修改密码")).toBeVisible()

  // 找到密码行的修改按钮并点击
  const editBtns = page.getByRole("button", { name: "修改" })
  for (let i = 0; i < (await editBtns.count()); i++) {
    await editBtns.nth(i).click()
    if (await page.getByPlaceholder("请输入新密码").isVisible().catch(() => false)) break
    const cancelBtn = page.getByRole("button", { name: "取消" }).first()
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click()
    }
  }

  await expect(page.getByPlaceholder("请输入新密码")).toBeVisible()
  await expect(page.getByPlaceholder("请再次输入新密码")).toBeVisible()
}

/**
 * 通过短信验证码修改密码。
 * args.phone: 手机号
 * args.password: 新密码
 */
export const changePassword: TaskFn = async (page, args) => {
  const phone = args?.phone as string
  const password = args?.password as string || "Test@12345"

  // 导航到个人资料页面
  await page.goto("/portal/profile")
  await page.locator("main").waitFor()
  await expect(page.getByText("修改密码")).toBeVisible()

  // 展开密码编辑
  const editBtns = page.getByRole("button", { name: "修改" })
  for (let i = 0; i < (await editBtns.count()); i++) {
    await editBtns.nth(i).click()
    if (await page.getByPlaceholder("请输入新密码").isVisible().catch(() => false)) break
    const cancelBtn = page.getByRole("button", { name: "取消" }).first()
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
  }

  // 获取短信验证码
  const smsCode = await getSmsCode(page, phone)

  // 填写表单
  await page.getByPlaceholder("请输入验证码").fill(smsCode)
  await page.getByPlaceholder("请输入新密码").fill(password)
  await page.getByPlaceholder("请再次输入新密码").fill(password)

  await page.getByRole("button", { name: "保存" }).click()
  await expect(page.getByText("密码修改成功")).toBeVisible()
}

/**
 * 验证手机号修改表单可展开。
 */
export const viewPhoneSection: TaskFn = async (page) => {
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
}

/**
 * 验证两步验证区域可见。
 */
export const view2faSection: TaskFn = async (page) => {
  await expect(page.getByText("两步验证", { exact: true })).toBeVisible()
}

/**
 * 修改手机号并回滚（触发 /api/portal/profile/phone）。
 * args.currentPhone: 当前手机号
 * args.newPhone: 新手机号
 */
export const changePhoneAndRollback: TaskFn = async (page, args) => {
  const currentPhone = args?.currentPhone as string
  const newPhone = args?.newPhone as string

  // 导航到个人资料页面
  await page.goto("/portal/profile")
  await page.locator("main").waitFor()

  // 展开手机号编辑
  const editBtns = page.getByRole("button", { name: "修改" })
  for (let i = 0; i < (await editBtns.count()); i++) {
    await editBtns.nth(i).click()
    if (await page.getByPlaceholder("请输入新手机号").isVisible().catch(() => false)) break
    const cancelBtn = page.getByRole("button", { name: "取消" }).first()
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
  }

  // 获取新手机号的验证码
  const smsCode = await getSmsCode(page, newPhone)

  // 填写表单
  await page.getByPlaceholder("请输入新手机号").fill(newPhone)
  await page.getByPlaceholder("请输入验证码").fill(smsCode)

  // 监听 API 响应
  const changeResponse = page.waitForResponse(
    (r) => r.url().includes("/api/portal/profile/phone") && r.request().method() === "POST",
    { timeout: 15_000 }
  )
  await page.getByRole("button", { name: "保存" }).click()
  await changeResponse

  await expect(page.getByText("手机号修改成功")).toBeVisible()

  // 立即回滚：重新修改回原手机号
  await page.reload()
  await page.locator("main").waitFor()

  // 再次展开手机号编辑
  for (let i = 0; i < (await editBtns.count()); i++) {
    await editBtns.nth(i).click()
    if (await page.getByPlaceholder("请输入新手机号").isVisible().catch(() => false)) break
    const cancelBtn = page.getByRole("button", { name: "取消" }).first()
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
  }

  // 获取原手机号的验证码
  const rollbackCode = await getSmsCode(page, currentPhone)

  // 填写表单
  await page.getByPlaceholder("请输入新手机号").fill(currentPhone)
  await page.getByPlaceholder("请输入验证码").fill(rollbackCode)

  // 监听回滚 API 响应
  const rollbackResponse = page.waitForResponse(
    (r) => r.url().includes("/api/portal/profile/phone") && r.request().method() === "POST",
    { timeout: 15_000 }
  )
  await page.getByRole("button", { name: "保存" }).click()
  await rollbackResponse

  await expect(page.getByText("手机号修改成功")).toBeVisible()
}

/** 触发 /api/portal/profile/meta 端点（前端不直接调用，通过 fetch 覆盖）。 */
export const viewProfileMeta: TaskFn = async (page) => {
  await page.goto("/portal/profile")
  await page.locator("main").waitFor()
  await expect(page.getByText("基本信息")).toBeVisible()

  const metaResponse = page.waitForResponse(
    (r) => r.url().includes("/api/portal/profile/meta") && !r.url().includes("/meta/list"),
    { timeout: 15_000 },
  )
  await page.evaluate(() => fetch("/api/portal/profile/meta"))
  await metaResponse
}
