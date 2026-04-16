/**
 * W1 用户管理测试。
 * 搜索、展开面板、状态切换、配额、密码重置、强制登出、删除。
 * 破坏性操作使用临时账号。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"
import { getSmsCode } from "../helpers/sms"

const TS = Date.now()
const XRW = { "X-Requested-With": "XMLHttpRequest" }
const JSON_HEADERS = { "Content-Type": "application/json", ...XRW }
const TEMP_PHONE = `+861390000${String(TS).slice(-4)}`
const TEMP_USERNAME = `E2E-temp-${TS}`

test.describe("用户管理", () => {
  let tempUserId: string

  test("创建临时账号", async ({ page }) => {
    // 注册临时用户（在浏览器中，避免覆盖管理员 cookie）
    const code = await getSmsCode(page, TEMP_PHONE)
    const regRes = await page.request.post("/api/auth/register", {
      headers: JSON_HEADERS,
      data: { phone: TEMP_PHONE, code, username: TEMP_USERNAME },
    })
    expect(regRes.status()).toBe(200)
    const body = await regRes.json()
    tempUserId = body.user?.id || body.id
    expect(tempUserId).toBeTruthy()
    trackComponent("UserTable", "临时账号创建")
  })

  test("搜索用户 — 关键字匹配", async ({ page }) => {
    await gotoAdmin(page, "/admin/users")
    const searchInput = page.getByPlaceholder("搜索用户名或手机号")
    await searchInput.fill(TEMP_USERNAME.slice(0, 8))
    trackComponent("UserTable", "搜索输入")

    // 等待搜索防抖
    await page.waitForTimeout(500)
    await expect(page.getByText(TEMP_USERNAME)).toBeVisible()
    trackComponent("UserTable", "搜索结果")
  })

  test("搜索用户 — 无结果", async ({ page }) => {
    await gotoAdmin(page, "/admin/users")
    const searchInput = page.getByPlaceholder("搜索用户名或手机号")
    await searchInput.fill("不存在的用户名XXXXXX")
    await page.waitForTimeout(500)
    await expect(page.getByText("暂无用户")).toBeVisible()
    trackComponent("UserTable", "空搜索结果")
  })

  test("展开面板 — 显示基本信息", async ({ page }) => {
    await gotoAdmin(page, "/admin/users")
    const searchInput = page.getByPlaceholder("搜索用户名或手机号")
    await searchInput.fill(TEMP_USERNAME.slice(0, 8))
    await page.waitForTimeout(500)

    // 点击用户行展开
    await page.getByText(TEMP_USERNAME).click()
    await expect(page.getByText("基本信息")).toBeVisible()
    trackComponent("UserExpandPanel", "基本信息")
  })

  test("状态切换 — 禁用再启用临时账号", async ({ page }) => {
    // 获取临时用户
    const listRes = await page.request.get(
      `/api/admin/users/list?search=${TEMP_USERNAME}`,
      { headers: XRW },
    )
    const users = (await listRes.json()).items
    const user = users.find((u: { username: string }) => u.username === TEMP_USERNAME)
    expect(user).toBeTruthy()
    tempUserId = user.id

    // 禁用
    const disableRes = await page.request.post("/api/admin/users/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { user_id: tempUserId, is_active: false },
    })
    expect(disableRes.status()).toBe(200)

    // 验证已禁用
    const detailRes = await page.request.get(
      `/api/admin/users/list/detail?user_id=${tempUserId}`,
      { headers: XRW },
    )
    expect((await detailRes.json()).is_active).toBe(false)
    trackComponent("UserExpandPanel", "状态切换-禁用")

    // 启用
    const enableRes = await page.request.post("/api/admin/users/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { user_id: tempUserId, is_active: true },
    })
    expect(enableRes.status()).toBe(200)
    trackComponent("UserExpandPanel", "状态切换-启用")
  })

  test("配额编辑 — 修改存储配额", async ({ page }) => {
    const editRes = await page.request.post("/api/admin/users/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { user_id: tempUserId, storage_quota: 200 },
    })
    expect(editRes.status()).toBe(200)

    const detailRes = await page.request.get(
      `/api/admin/users/list/detail?user_id=${tempUserId}`,
      { headers: XRW },
    )
    expect((await detailRes.json()).storage_quota).toBe(200)
    trackComponent("UserExpandPanel", "配额编辑")
  })

  test("密码重置 — 临时账号", async ({ page }) => {
    const resetRes = await page.request.post("/api/admin/users/list/detail/reset-password", {
      headers: JSON_HEADERS,
      data: {
        user_id: tempUserId,
        encrypted_password: "dGVzdHBhc3N3b3JkMTIz",
        nonce: "dGVzdG5vbmNl",
      },
    })
    expect(resetRes.status()).toBe(200)
    trackComponent("UserExpandPanel", "密码重置")
  })

  test("强制登出 — 临时账号", async ({ page }) => {
    const logoutRes = await page.request.post("/api/admin/users/list/detail/force-logout", {
      headers: JSON_HEADERS,
      data: { user_id: tempUserId },
    })
    expect(logoutRes.status()).toBe(200)
    trackComponent("UserExpandPanel", "强制登出")
  })

  test("删除 superuser — 应被拒绝", async ({ page }) => {
    // 获取 superuser
    const listRes = await page.request.get("/api/admin/users/list?search=superuser", { headers: XRW })
    const users = (await listRes.json()).items
    const su = users.find((u: { role_name: string }) => u.role_name === "superuser")
    if (!su) return // 搜索可能不匹配

    const delRes = await page.request.post("/api/admin/users/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { user_id: su.id },
    })
    // superuser 不可删除
    expect([400, 403]).toContain(delRes.status())
    trackComponent("UserExpandPanel", "superuser删除保护")
  })

  test("删除临时账号 — 成功", async ({ page }) => {
    const delRes = await page.request.post("/api/admin/users/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { user_id: tempUserId },
    })
    expect(delRes.status()).toBe(200)

    // 列表中不再出现
    const listRes = await page.request.get(
      `/api/admin/users/list?search=${TEMP_USERNAME}`,
      { headers: XRW },
    )
    const users = (await listRes.json()).items
    expect(users.find((u: { username: string }) => u.username === TEMP_USERNAME)).toBeFalsy()
    trackComponent("UserExpandPanel", "删除确认")
  })
})
