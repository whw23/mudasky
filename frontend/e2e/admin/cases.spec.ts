/**
 * 案例管理 E2E 测试。
 * 覆盖：CRUD 完整流程 + 反向验证。
 */

import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

const TS = Date.now()
const STUDENT = `E2E学生${TS}`
const STUDENT_EDITED = `E2E学生改${TS}`

test.describe("案例管理", () => {
  test("完整 CRUD 流程", async ({ adminPage }) => {
    /* 监听所有 API 请求，打印失败的 */
    adminPage.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 400) {
        console.log(`API ERROR: ${response.status()} ${response.url()}`)
      }
    })

    await gotoAdmin(adminPage, "/admin/cases")
    await expect(adminPage.getByRole("heading", { name: "案例管理" })).toBeVisible()

    /* === 创建案例 === */
    await clickAndWaitDialog(adminPage, "添加案例")
    await adminPage.getByPlaceholder("请输入学生姓名").fill(STUDENT)
    await adminPage.getByPlaceholder("请输入录取大学").fill("东京大学")
    await adminPage.getByPlaceholder("请输入录取专业").fill("计算机科学")
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()

    /* 等待 dialog 关闭或者 30 秒超时 */
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 30_000 })
    await expect(adminPage.getByText(STUDENT)).toBeVisible({ timeout: 30_000 })

    /* === 编辑案例 === */
    const row = adminPage.locator("tr", { hasText: STUDENT })
    await row.getByRole("button", { name: "编辑" }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 15_000 })
    const nameInput = adminPage.getByPlaceholder("请输入学生姓名")
    await nameInput.clear()
    await nameInput.fill(STUDENT_EDITED)
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 30_000 })
    await expect(adminPage.getByText(STUDENT_EDITED)).toBeVisible({ timeout: 30_000 })

    /* === 删除案例 === */
    adminPage.on("dialog", (dialog) => dialog.accept())
    const editedRow = adminPage.locator("tr", { hasText: STUDENT_EDITED })
    await editedRow.getByRole("button", { name: "删除" }).click()
    await expect(adminPage.getByText(STUDENT_EDITED)).toBeHidden({ timeout: 30_000 })
  })
})
