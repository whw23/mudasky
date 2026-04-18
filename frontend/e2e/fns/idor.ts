/**
 * IDOR 安全测试业务操作函数。
 *
 * 注意：这些函数使用 page.request 直接调用 API，而非 UI 操作。
 * 这是合理的，因为 IDOR 测试需要直接验证 API 层的访问控制逻辑，
 * 无法通过 UI 操作模拟跨用户访问场景。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

const XHR = { "X-Requested-With": "XMLHttpRequest" }

/**
 * 测试访问其他用户文档被拒。
 * args.docId: 目标文档ID
 */
export const testAccessOtherDoc: TaskFn = async (page, args) => {
  const docId = args?.docId as string

  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const res = await page.request.get(
    `/api/portal/documents/list/detail?doc_id=${docId}`,
    { headers: XHR },
  )
  // 应返回 401/403/404
  expect([401, 403, 404]).toContain(res.status())
}

/**
 * 测试删除其他用户文档被拒。
 * args.docId: 目标文档ID
 */
export const testDeleteOtherDoc: TaskFn = async (page, args) => {
  const docId = args?.docId as string

  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const res = await page.request.post(
    "/api/portal/documents/list/detail/delete",
    {
      headers: { ...XHR, "Content-Type": "application/json" },
      data: { doc_id: docId },
    },
  )
  // 应返回 401/403/404
  expect([401, 403, 404]).toContain(res.status())
}
