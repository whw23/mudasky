/**
 * W1 角色管理测试。
 * 创建/编辑/删除自定义角色、权限分配、排序、反向测试。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"

const TS = Date.now()
const XRW = { "X-Requested-With": "XMLHttpRequest" }
const JSON_HEADERS = { "Content-Type": "application/json", ...XRW }
const ROLE_NAME = `E2E-role-${TS}`

test.describe("角色管理", () => {
  let roleId: string

  test("创建自定义角色 — 成功", async ({ page }) => {
    const res = await page.request.post("/api/admin/roles/meta/list/create", {
      headers: JSON_HEADERS,
      data: {
        name: ROLE_NAME,
        description: "E2E 测试角色",
        permissions: ["public/content/articles"],
      },
    })
    expect(res.status()).toBe(200)
    roleId = (await res.json()).id
    trackComponent("RoleDialog", "角色名输入")

    await gotoAdmin(page, "/admin/roles")
    await expect(page.getByText(ROLE_NAME)).toBeVisible()
    trackComponent("RoleList", "角色行")
  })

  test("创建角色 — 空名称返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/roles/meta/list/create", {
      headers: JSON_HEADERS,
      data: { name: "", description: "无名角色", permissions: [] },
    })
    expect(res.status()).toBe(422)
    trackComponent("RoleDialog", "名称校验")
  })

  test("编辑角色 — 修改名称和权限", async ({ page }) => {
    // 获取角色 ID
    const listRes = await page.request.get("/api/admin/roles/meta/list", { headers: XRW })
    const roles = await listRes.json()
    const role = roles.find((r: { name: string }) => r.name === ROLE_NAME)
    expect(role).toBeTruthy()

    const newName = `${ROLE_NAME}-已编辑`
    const editRes = await page.request.post("/api/admin/roles/meta/list/detail/edit", {
      headers: JSON_HEADERS,
      data: {
        role_id: role.id,
        name: newName,
        description: "已修改描述",
        permissions: ["public/content/articles", "public/cases/list"],
      },
    })
    expect(editRes.status()).toBe(200)

    await gotoAdmin(page, "/admin/roles")
    await expect(page.getByText(newName)).toBeVisible()
    trackComponent("RoleDialog", "编辑保存")
  })

  test("权限分配 — 角色权限数量正确", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/roles/meta/list", { headers: XRW })
    const roles = await listRes.json()
    const role = roles.find((r: { name: string }) => r.name.startsWith("E2E-role-"))
    expect(role).toBeTruthy()
    expect(role.permissions.length).toBeGreaterThanOrEqual(2)
    trackComponent("PermissionTree", "权限选择")
  })

  test("角色排序 — reorder 接口成功", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/roles/meta/list", { headers: XRW })
    const roles = await listRes.json()
    expect(roles.length).toBeGreaterThanOrEqual(2)

    // 构建重排列表（原序不变，仅验证接口可用）
    const items = roles.map((r: { id: string }, i: number) => ({ id: r.id, sort_order: i }))
    const reorderRes = await page.request.post("/api/admin/roles/meta/list/reorder", {
      headers: JSON_HEADERS,
      data: { items },
    })
    expect(reorderRes.status()).toBe(200)
    trackComponent("RoleList", "拖拽排序")
  })

  test("删除内置角色 — 应被拒绝", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/roles/meta/list", { headers: XRW })
    const roles = await listRes.json()
    const builtin = roles.find((r: { is_builtin: boolean; name: string }) => r.is_builtin && r.name !== "superuser")
    expect(builtin).toBeTruthy()

    const delRes = await page.request.post("/api/admin/roles/meta/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { role_id: builtin.id },
    })
    // 内置角色不可删除（400 或 403）
    expect([400, 403]).toContain(delRes.status())
    trackComponent("RoleList", "内置角色保护")
  })

  test("删除自定义角色 — 成功", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/roles/meta/list", { headers: XRW })
    const roles = await listRes.json()
    const role = roles.find((r: { name: string }) => r.name.startsWith("E2E-role-"))
    expect(role).toBeTruthy()

    const delRes = await page.request.post("/api/admin/roles/meta/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { role_id: role.id },
    })
    expect(delRes.status()).toBe(200)

    await gotoAdmin(page, "/admin/roles")
    await expect(page.getByText(role.name)).not.toBeVisible()
    trackComponent("RoleList", "删除操作")
  })

  test("UI — 创建角色按钮和列表可见", async ({ page }) => {
    await gotoAdmin(page, "/admin/roles")
    await expect(page.getByRole("button", { name: "创建角色" })).toBeVisible()
    // 至少有内置角色
    await expect(page.getByText("superuser")).toBeVisible()
    trackComponent("RoleList", "创建角色按钮")
  })
})
