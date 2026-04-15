/**
 * Playwright 全局清理。
 * 测试结束后删除所有 E2E 测试创建的数据。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")

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
  const cleanups: { endpoint: string; nameField: string }[] = [
    { endpoint: "roles", nameField: "name" },
    { endpoint: "categories", nameField: "name" },
    { endpoint: "cases", nameField: "title" },
    { endpoint: "universities", nameField: "name" },
  ]

  for (const { endpoint, nameField } of cleanups) {
    try {
      const res = await page.request.get(
        `http://localhost/api/admin/${endpoint}/list`,
        { headers },
      )
      if (res.ok()) {
        const items = await res.json()
        for (const item of items) {
          if (item[nameField]?.startsWith("E2E")) {
            await page.request.post(
              `http://localhost/api/admin/${endpoint}/delete`,
              { headers, data: { id: item.id } },
            ).catch(() => {})
          }
        }
      }
    } catch {
      /* 清理失败不阻塞 */
    }
  }

  await browser.close()
}

export default globalTeardown
