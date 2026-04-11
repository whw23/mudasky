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

  try {
    /* 获取并删除测试角色 */
    const roleRes = await page.request.get("http://localhost/api/roles", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    if (roleRes.ok()) {
      const roles = await roleRes.json()
      for (const r of roles) {
        if (r.name?.startsWith("E2E")) {
          await page.request.delete(`http://localhost/api/roles/${r.id}`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
          })
        }
      }
    }
  } catch {
    /* 清理失败不阻塞 */
  }

  await browser.close()
}

export default globalTeardown
