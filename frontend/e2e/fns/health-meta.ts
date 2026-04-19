/**
 * 鍋ュ悍妫�鏌ュ拰鍏冩暟鎹� API 鍑芥暟銆俓n * 瑙﹀彂 /api/health, /api/meta/routes, /api/version 绛夌��鐐广�俓n */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 瑙﹀彂鍋ュ悍妫�鏌ョ��鐐癸紙/api/health锛夈�俓n */
export const checkHealth: TaskFn = async (page) => {
  const healthResponse = page.waitForResponse(
    (r) => r.url().includes("/api/health"),
    { timeout: 15_000 }
  )

  await page.goto("/")
  await page.evaluate(async () => {
    await fetch("/api/health")
  })

  await healthResponse
}

/**
 * 瑙﹀彂鍏冩暟鎹�璺�鐢辩��鐐癸紙/api/meta/routes锛夈�俓n */
export const fetchMetaRoutes: TaskFn = async (page) => {
  const metaResponse = page.waitForResponse(
    (r) => r.url().includes("/api/meta/routes"),
    { timeout: 15_000 }
  )

  await page.goto("/")
  await page.evaluate(async () => {
    await fetch("/api/meta/routes")
  })

  await metaResponse
}

/**
 * 瑙﹀彂鐗堟湰绔�鐐癸紙/api/version锛夈�俓n */
export const fetchVersion: TaskFn = async (page) => {
  const versionResponse = page.waitForResponse(
    (r) => r.url().includes("/api/version"),
    { timeout: 15_000 }
  )

  await page.goto("/")
  await page.evaluate(async () => {
    await fetch("/api/version")
  })

  await versionResponse
}
