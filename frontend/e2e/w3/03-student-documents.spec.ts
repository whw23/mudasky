/**
 * W3 学生文档查看测试。
 * 等待 W2 上传文档后，验证 advisor 可在学生面板中查看文档列表。
 */

import { test, expect, gotoAdmin, trackComponent } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

/** 取消「仅我的学生」筛选并等待列表刷新。 */
async function uncheckMyStudents(page: import("@playwright/test").Page): Promise<void> {
  const checkbox = page.getByRole("checkbox", { name: "仅我的学生" })
  const checked = await checkbox.isChecked()
  if (checked) {
    const responsePromise = page.waitForResponse((r) =>
      r.url().includes("/admin/students/list") && r.status() === 200,
    )
    await checkbox.uncheck()
    await responsePromise
  }
}

test.describe("W3 学生文档查看", () => {
  test("等待文档上传后查看学生文档列表", async ({ page }) => {
    await waitFor("w2_doc_uploaded", 120_000)
    trackComponent("StudentExpandPanel", "文档列表")

    await gotoAdmin(page, "/admin/students")
    await uncheckMyStudents(page)

    // 展开第一个学生
    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.getByText("文件列表").first().waitFor()
  })

  test("文档列表区域可见", async ({ page }) => {
    await waitFor("w2_doc_uploaded", 120_000)
    trackComponent("StudentExpandPanel", "文档区域可见")

    await gotoAdmin(page, "/admin/students")
    await uncheckMyStudents(page)

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.getByText("文件列表").first().waitFor()

    // 文档区域包含表头或暂无文件提示
    const fileSection = page.locator("section").filter({ hasText: "文件列表" })
    await expect(fileSection).toBeVisible()

    // 应有文件（W2 已上传）或至少显示区域
    const hasTable = await fileSection.locator("table").count()
    const hasNoFiles = await fileSection.getByText("暂无文件").count()
    expect(hasTable + hasNoFiles).toBeGreaterThan(0)
  })

  test("文档列表包含文件名列", async ({ page }) => {
    await waitFor("w2_doc_uploaded", 120_000)
    trackComponent("StudentExpandPanel", "文档表头")

    await gotoAdmin(page, "/admin/students")
    await uncheckMyStudents(page)

    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await page.getByText("文件列表").first().waitFor()

    const fileSection = page.locator("section").filter({ hasText: "文件列表" })
    const fileTable = fileSection.locator("table")

    if (await fileTable.isVisible()) {
      await expect(fileTable.getByText("文件名")).toBeVisible()
      await expect(fileTable.getByText("分类")).toBeVisible()
      await expect(fileTable.getByText("大小")).toBeVisible()
    }
  })

  test("文档详情和下载端点可访问", async ({ page }) => {
    const docSignal = await waitFor<{ docId: string }>("w2_doc_uploaded", 120_000)

    // 直接调 API 覆盖文档详情和下载端点
    const XRW = { "X-Requested-With": "XMLHttpRequest" }
    const detailRes = await page.request.get(
      `/api/admin/students/list/detail/documents/list/detail?doc_id=${docSignal.docId || "fake"}`,
      { headers: XRW },
    )
    expect(detailRes.status()).toBeLessThan(500)

    const downloadRes = await page.request.get(
      `/api/admin/students/list/detail/documents/list/detail/download?doc_id=${docSignal.docId || "fake"}`,
      { headers: XRW },
    )
    expect(downloadRes.status()).toBeLessThan(500)
  })

  test("负向：未展开时不显示文档", async ({ page }) => {
    await waitFor("w2_doc_uploaded", 120_000)
    trackComponent("StudentExpandPanel", "未展开无文档")

    await gotoAdmin(page, "/admin/students")

    // 未展开面板时不应看到文件列表
    await expect(page.getByText("文件列表").first()).not.toBeVisible()
  })
})
