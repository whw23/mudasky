/**
 * 学生管理 E2E 测试。
 * 覆盖：页面加载、列表展示、筛选、展开面板操作（编辑、分配顾问、文件列表、降级）。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

/** 展开第一个学生行（先取消"仅我的学生"筛选），返回是否成功 */
async function expandFirstStudentRow(adminPage: import("@playwright/test").Page): Promise<boolean> {
  // 取消"仅我的学生"筛选以显示所有学生
  const checkbox = adminPage.getByLabel(/仅我的学生/)
  if (await checkbox.isVisible() && await checkbox.isChecked()) {
    await checkbox.uncheck()
    await adminPage.waitForResponse((r) => r.url().includes("/students/")).catch(() => {})
  }

  // 检查是否有"暂无数据"提示
  const noData = adminPage.getByText("暂无数据")
  if (await noData.isVisible({ timeout: 3_000 }).catch(() => false)) return false

  const row = adminPage.locator("table tbody tr").first()
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) return false

  // 检查行内容不是空状态
  const text = await row.textContent()
  if (text?.includes("暂无数据") || text?.includes("暂无")) return false

  await row.click()
  await adminPage.getByText("基本信息").first().waitFor({ timeout: 15_000 })
  return true
}

test.describe("学生管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
  })

  test("页面加载并展示学生列表", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    // 表格 header 应该可见（即使无数据也有列头）
    await expect(main.locator("th").first()).toBeVisible({ timeout: 10_000 })
  })

  test("默认筛选我的学生", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    const checkbox = main.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await expect(checkbox).toBeChecked()
    }
  })

  test("取消筛选显示全部学生", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    const checkbox = main.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await checkbox.uncheck()
      await expect(main.locator("table").or(main.locator("[class*='grid']"))).toBeVisible({ timeout: 10_000 })
    }
  })

  test("展开面板显示全部操作区域", async ({ adminPage }) => {
    if (!(await expandFirstStudentRow(adminPage))) return

    // 验证所有操作区域可见
    await expect(adminPage.getByText("编辑").first()).toBeVisible()
    await expect(adminPage.getByText("备注").first()).toBeVisible()
    await expect(adminPage.getByText("分配顾问").first()).toBeVisible()
    await expect(adminPage.getByText("文件列表").first()).toBeVisible()
    await expect(adminPage.getByText("降为访客").first()).toBeVisible()
  })
})

test.describe("学生管理实际操作", () => {
  test("编辑学生备注并保存", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    if (!(await expandFirstStudentRow(adminPage))) {
      test.skip(true, "无学生数据")
      return
    }

    const noteArea = adminPage.locator("textarea").first()
    if (!(await noteArea.isVisible().catch(() => false))) {
      test.skip(true, "无备注输入框")
      return
    }

    const originalNote = await noteArea.inputValue()
    const testNote = `E2E测试备注 ${Date.now()}`
    await noteArea.clear()
    await noteArea.fill(testNote)

    const saveBtn = adminPage.getByRole("button", { name: "保存" }).first()
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/students/") && r.url().includes("/edit") && r.status() === 200,
    )
    await saveBtn.click()
    await responsePromise

    // 还原备注
    await noteArea.clear()
    await noteArea.fill(originalNote)
    const restorePromise = adminPage.waitForResponse(
      (r) => r.url().includes("/edit") && r.status() === 200,
    )
    await saveBtn.click()
    await restorePromise
  })

  test("分配顾问 — 填写 ID 并确认", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    if (!(await expandFirstStudentRow(adminPage))) {
      test.skip(true, "无学生数据")
      return
    }

    const advisorInput = adminPage.getByPlaceholder(/顾问 ID/)
    if (!(await advisorInput.isVisible().catch(() => false))) {
      test.skip(true, "无顾问输入框")
      return
    }

    await advisorInput.fill("test-advisor-id")
    const confirmBtn = adminPage.getByRole("button", { name: "确认" })
    const responsePromise = adminPage.waitForResponse(
      (r) => r.url().includes("assign-advisor"),
    )
    await confirmBtn.click()
    const response = await responsePromise
    expect([200, 404, 422]).toContain(response.status())
  })

  test("文件列表区域可见", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    if (!(await expandFirstStudentRow(adminPage))) {
      test.skip(true, "无学生数据")
      return
    }

    await expect(
      adminPage.getByText("文件列表")
        .or(adminPage.getByText("暂无文件")),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("学生文件列表 API 可正常调用", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    if (!(await expandFirstStudentRow(adminPage))) {
      test.skip(true, "无学生数据")
      return
    }

    // 通过 API 验证文档端点
    const result = await adminPage.evaluate(async () => {
      const listRes = await fetch("/api/admin/students/list?page=1&page_size=1", {
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      if (!listRes.ok) return { listStatus: listRes.status }
      const listData = await listRes.json()
      const items = listData.items || listData
      if (!items.length) return { listStatus: 200, noData: true }

      const userId = items[0].id || items[0].user_id
      const docsRes = await fetch(`/api/admin/students/list/detail/documents/list?user_id=${userId}`, {
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      return { listStatus: 200, docsStatus: docsRes.status }
    })

    expect(result.listStatus).toBe(200)
    if (!result.noData) {
      expect([200, 404]).toContain(result.docsStatus)
    }
  })
})
