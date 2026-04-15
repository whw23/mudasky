/**
 * 用户概览页 E2E 测试。
 * 覆盖统计卡片、快捷操作链接。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户概览", () => {
  test("概览页面加载显示统计卡片", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    await expect(adminPage.getByText("文档数量")).toBeVisible()
    await expect(adminPage.getByText("存储空间")).toBeVisible()
  })

  test("快捷操作链接可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    await expect(adminPage.getByText("上传文档")).toBeVisible()
    await expect(adminPage.getByText("编辑资料")).toBeVisible()
  })

  test("编辑资料链接跳转", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/portal/overview")
    await adminPage.getByText("编辑资料").click()
    await adminPage.waitForURL(/\/portal\/profile/)
    expect(adminPage.url()).toContain("/portal/profile")
  })
})
