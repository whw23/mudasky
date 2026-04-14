import { test, expect, gotoAdmin } from "./fixtures/base"

test.describe("路径乱序交叉测试", () => {
  test("admin 页面之间快速切换", async ({ adminPage }) => {
    const pages = [
      { path: "/admin/users", text: /用户管理/ },
      { path: "/admin/roles", text: /角色管理/ },
      { path: "/admin/students", text: /学生管理/ },
      { path: "/admin/contacts", text: /联系人管理/ },
      { path: "/admin/users", text: /用户管理/ },
    ]
    for (const { path, text } of pages) {
      await gotoAdmin(adminPage, path)
      await expect(adminPage.locator("main").getByRole("heading").first()).toBeVisible()
    }
  })

  test("admin 和 portal 之间切换", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/users")
    await expect(adminPage.locator("main")).toBeVisible()
    await adminPage.waitForTimeout(1000)

    await gotoAdmin(adminPage, "/portal/profile")
    await expect(adminPage.locator("main")).toBeVisible()
    await adminPage.waitForTimeout(1000)

    await gotoAdmin(adminPage, "/admin/roles")
    await expect(adminPage.locator("main")).toBeVisible()
  })

  test("所有 admin 页面依次访问", async ({ adminPage }) => {
    const pages = [
      "/admin/dashboard", "/admin/users", "/admin/roles",
      "/admin/articles", "/admin/categories", "/admin/universities",
      "/admin/cases", "/admin/students", "/admin/contacts",
      "/admin/general-settings", "/admin/web-settings",
    ]
    for (const path of pages) {
      await gotoAdmin(adminPage, path)
      await expect(adminPage.locator("main")).toBeVisible()
      await adminPage.waitForTimeout(500)
    }
  })

  test("所有 portal 页面依次访问", async ({ adminPage }) => {
    const pages = ["/portal/overview", "/portal/profile", "/portal/documents"]
    for (const path of pages) {
      await gotoAdmin(adminPage, path)
      await expect(adminPage.locator("main")).toBeVisible()
      await adminPage.waitForTimeout(500)
    }
  })

  test("CRUD 中间切换页面后返回", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/categories")
    await adminPage.waitForTimeout(2000)
    await gotoAdmin(adminPage, "/admin/universities")
    await adminPage.waitForTimeout(1000)
    await gotoAdmin(adminPage, "/admin/categories")
    await expect(adminPage.locator("main")).toBeVisible()
  })
})
