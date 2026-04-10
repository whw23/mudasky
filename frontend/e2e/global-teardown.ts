/**
 * Playwright 全局清理。
 * 测试结束后删除所有 E2E 测试创建的数据。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")

async function globalTeardown(config: FullConfig) {
  if (!fs.existsSync(AUTH_FILE)) return

  const browser = await chromium.launch()
  const context = await browser.newContext({
    locale: "zh-CN",
    storageState: AUTH_FILE,
  })
  const page = await context.newPage()

  try {
    /* 获取并删除测试分类 */
    const catRes = await page.request.get("http://localhost/api/admin/content/categories", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    if (catRes.ok()) {
      const categories = await catRes.json()
      for (const cat of categories) {
        if (cat.name?.startsWith("E2E") || cat.slug?.startsWith("e2e")) {
          await page.request.delete(`http://localhost/api/admin/content/categories/${cat.id}`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
          })
        }
      }
    }

    /* 获取并删除测试案例 */
    const caseRes = await page.request.get("http://localhost/api/admin/cases?page_size=100", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    if (caseRes.ok()) {
      const { items } = await caseRes.json()
      for (const c of items) {
        if (c.student_name?.startsWith("E2E")) {
          await page.request.delete(`http://localhost/api/admin/cases/${c.id}`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
          })
        }
      }
    }

    /* 获取并删除测试院校 */
    const univRes = await page.request.get("http://localhost/api/admin/universities?page_size=100", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    if (univRes.ok()) {
      const { items } = await univRes.json()
      for (const u of items) {
        if (u.name?.startsWith("E2E")) {
          await page.request.delete(`http://localhost/api/admin/universities/${u.id}`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
          })
        }
      }
    }

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
