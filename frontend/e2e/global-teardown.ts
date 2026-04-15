/**
 * Playwright 全局清理。
 * 测试结束后删除所有 E2E 测试创建的数据。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")
const BASE = process.env.BASE_URL || "http://localhost"

async function globalTeardown(_config: FullConfig) {
  if (!fs.existsSync(AUTH_FILE)) return

  const browser = await chromium.launch()
  const context = await browser.newContext({
    locale: "zh-CN",
    storageState: AUTH_FILE,
  })
  const page = await context.newPage()

  const headers = { "X-Requested-With": "XMLHttpRequest" }

  /* 清理所有以 E2E 开头的测试数据 */
  const cleanups: { listPath: string; deletePath: string; nameField: string; idField: string }[] = [
    { listPath: "roles/meta/list", deletePath: "roles/meta/list/detail/delete", nameField: "name", idField: "role_id" },
    { listPath: "categories/list", deletePath: "categories/list/detail/delete", nameField: "name", idField: "category_id" },
    { listPath: "cases/list", deletePath: "cases/list/detail/delete", nameField: "student_name", idField: "case_id" },
    { listPath: "universities/list", deletePath: "universities/list/detail/delete", nameField: "name", idField: "university_id" },
    { listPath: "articles/list", deletePath: "articles/list/detail/delete", nameField: "title", idField: "article_id" },
  ]

  for (const { listPath, deletePath, nameField, idField } of cleanups) {
    try {
      const res = await page.request.get(
        `${BASE}/api/admin/${listPath}`,
        { headers },
      )
      if (res.ok()) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items ?? [])
        for (const item of items) {
          const name = typeof item[nameField] === "object"
            ? item[nameField]?.zh
            : item[nameField]
          if (name?.startsWith("E2E")) {
            await page.request.post(
              `${BASE}/api/admin/${deletePath}`,
              { headers, data: { [idField]: item.id } },
            ).catch(() => {})
          }
        }
      }
    } catch {
      /* 清理失败不阻塞 */
    }
  }

  /* 清理 E2E 测试用户 */
  try {
    const res = await page.request.get(
      `${BASE}/api/admin/users/list?keyword=E2E`,
      { headers },
    )
    if (res.ok()) {
      const data = await res.json()
      const items = data.items ?? data ?? []
      for (const user of items) {
        if (user.username?.startsWith("E2E")) {
          await page.request.post(
            `${BASE}/api/admin/users/list/detail/delete`,
            { headers, data: { user_id: user.id } },
          ).catch(() => {})
        }
      }
    }
  } catch {
    /* 清理失败不阻塞 */
  }

  await browser.close()
}

export default globalTeardown
