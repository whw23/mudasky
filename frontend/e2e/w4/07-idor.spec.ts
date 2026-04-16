/**
 * W4 IDOR 测试。
 * visitor 尝试访问其他用户的文档，应被拒绝。
 */

import { test, expect, trackSecurity } from "../fixtures/base"
import { waitFor } from "../helpers/signal"

const XHR = { "X-Requested-With": "XMLHttpRequest" }

test.describe("W4 IDOR 安全", () => {
  let targetDocId: string

  test.beforeAll(async () => {
    // 等待 W2 上传文档并发送信号
    const data = await waitFor<{ documentId: string }>("idor_doc", 120_000)
    targetDocId = data.documentId
  })

  test("访问他人文档详情被拒", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.get(
      `/api/portal/documents/list/detail?document_id=${targetDocId}`,
      { headers: XHR },
    )
    // visitor 无 portal 权限，应返回 401 或 403
    expect([401, 403, 404]).toContain(res.status())
    trackSecurity("IDOR", "用户访问他人文档被拒")
  })

  test("删除他人文档被拒", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.post(
      "/api/portal/documents/list/detail/delete",
      {
        headers: { ...XHR, "Content-Type": "application/json" },
        data: { document_id: targetDocId },
      },
    )
    // visitor 无 portal 权限
    expect([401, 403, 404]).toContain(res.status())
    trackSecurity("IDOR", "用户删除他人文档被拒")
  })

  test("visitor 访问自己的文档列表被拒", async ({ page }) => {
    await page.goto("/")
    const res = await page.request.get("/api/portal/documents/list", {
      headers: XHR,
    })
    // visitor 无 portal 权限
    expect([401, 403]).toContain(res.status())
  })

  test("访问不存在的文档被拒", async ({ page }) => {
    await page.goto("/")
    const fakeId = "00000000-0000-0000-0000-000000000000"
    const res = await page.request.get(
      `/api/portal/documents/list/detail?document_id=${fakeId}`,
      { headers: XHR },
    )
    expect([401, 403, 404]).toContain(res.status())
  })
})
