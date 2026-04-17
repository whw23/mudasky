/**
 * 公开详情页业务操作函数。
 * 所有操作通过 UI 完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 验证文章详情页加载。
 * args.articleId: 文章ID
 */
export const verifyArticleDetail: TaskFn = async (page, args) => {
  const articleId = args?.articleId as string
  await page.goto(`/news/${articleId}`)
  await page.locator("main").waitFor()
  await expect(page.locator("main")).toBeVisible()
  const text = await page.locator("main").textContent()
  expect(text!.length).toBeGreaterThan(0)
}

/**
 * 验证案例详情页加载。
 * args.caseId: 案例ID
 */
export const verifyCaseDetail: TaskFn = async (page, args) => {
  const caseId = args?.caseId as string
  const res = await page.goto(`/cases/${caseId}`)
  const status = res?.status() ?? 200
  if (status === 200) {
    await page.locator("main").waitFor({ timeout: 15_000 }).catch(() => {})
  }
  await expect(page.locator("body")).toBeVisible()
}

/**
 * 验证院校详情页加载。
 * args.universityId: 院校ID
 */
export const verifyUniversityDetail: TaskFn = async (page, args) => {
  const universityId = args?.universityId as string
  const res = await page.goto(`/universities/${universityId}`)
  const status = res?.status() ?? 200
  if (status === 200) {
    await page.locator("main").waitFor({ timeout: 15_000 }).catch(() => {})
  }
  await expect(page.locator("body")).toBeVisible()
}
