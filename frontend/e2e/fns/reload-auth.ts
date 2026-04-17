/**
 * 重新加载认证状态。
 * 从 .auth/{worker}.json 文件读取更新后的 cookies，注入到当前浏览器上下文。
 * 用于角色分配后刷新 JWT 的场景。
 */

import type { Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

export default async function reloadAuth(
  page: Page,
  args?: Record<string, unknown>,
): Promise<void> {
  const worker = args?.worker as string

  if (!worker) {
    throw new Error("reloadAuth fn 需要 worker 参数")
  }

  const authFile = path.join(__dirname, "..", ".auth", `${worker}.json`)

  if (!fs.existsSync(authFile)) {
    throw new Error(`认证文件不存在: ${authFile}`)
  }

  const state = JSON.parse(fs.readFileSync(authFile, "utf-8"))

  // 清除旧 cookies 并注入新 cookies
  await page.context().clearCookies()
  if (state.cookies?.length) {
    await page.context().addCookies(state.cookies)
  }

  // 注入 localStorage（如果有）
  if (state.origins?.length) {
    for (const origin of state.origins) {
      if (origin.localStorage?.length) {
        await page.goto(origin.origin)
        for (const item of origin.localStorage) {
          await page.evaluate(
            ([key, value]) => localStorage.setItem(key, value),
            [item.name, item.value],
          )
        }
      }
    }
  }
}
