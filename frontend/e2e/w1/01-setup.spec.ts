/**
 * W1 初始化测试。
 * 等待 W2/W3/W4 注册完成，赋予角色，创建种子数据。
 */

import { test, expect } from "../fixtures/base"
import { chromium } from "@playwright/test"
import { emit, waitFor } from "../helpers/signal"
import * as path from "path"

const W2_AUTH = path.join(__dirname, "..", ".auth", "w2.json")
const W3_AUTH = path.join(__dirname, "..", ".auth", "w3.json")
const BASE = process.env.BASE_URL || "http://localhost"

/** 帮指定 worker 刷新 token（赋权后 JWT 需要更新）。 */
async function refreshWorkerToken(authFile: string) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ storageState: authFile })
  const page = await ctx.newPage()
  await page.goto(BASE)
  // 必须用 page.evaluate(fetch) 而非 page.request.post，
  // 后者不会让浏览器处理 Set-Cookie，导致 storageState 保存旧 cookie。
  await page.evaluate(async () => {
    await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
    })
  })
  await ctx.storageState({ path: authFile })
  await browser.close()
}

test.describe("W1 初始化", () => {
  test.setTimeout(120_000)

  test("等待注册并赋权", async ({ page }) => {
    // dependencies 保证注册已完成，信号文件已存在
    const w2 = await waitFor<{ userId: string }>("w2_registered", 5_000)
    const w3 = await waitFor<{ userId: string }>("w3_registered", 5_000)
    await waitFor("w4_registered", 5_000)

    // 获取角色列表
    const rolesRes = await page.request.get("/api/admin/roles/meta/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(rolesRes.status()).toBe(200)
    const roles = (await rolesRes.json()) as Array<{
      name: string
      id: string
    }>
    const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]))

    // W2 → student
    const assignW2 = await page.request.post(
      "/api/admin/users/list/detail/assign-role",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: { user_id: w2.userId, role_id: roleMap["student"] },
      },
    )
    expect(assignW2.status()).toBe(200)
    emit("w2_student")

    // W3 → advisor
    const assignW3 = await page.request.post(
      "/api/admin/users/list/detail/assign-role",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: { user_id: w3.userId, role_id: roleMap["advisor"] },
      },
    )
    expect(assignW3.status()).toBe(200)
    emit("w3_advisor")

    // 帮 W2/W3 刷新 token（获取新权限的 JWT）
    await refreshWorkerToken(W2_AUTH)
    await refreshWorkerToken(W3_AUTH)

    emit("roles_assigned")
  })

  test("创建种子数据", async ({ page }) => {
    // 创建分类
    const catRes = await page.request.post(
      "/api/admin/categories/list/create",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: { name: "E2E-分类", slug: `e2e-cat-${Date.now()}` },
      },
    )
    expect(catRes.status()).toBe(201)
    const cat = await catRes.json()
    emit("category_created", { categoryId: cat.id })

    // 创建文章
    const artRes = await page.request.post(
      "/api/admin/articles/list/create",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: {
          title: `E2E-文章-${Date.now()}`,
          slug: `e2e-art-${Date.now()}`,
          category_id: cat.id,
          content_type: "markdown",
          content: "E2E 内容",
          status: "published",
        },
      },
    )
    expect(artRes.status()).toBe(201)
    emit("article_created", { articleId: (await artRes.json()).id })

    // 创建案例
    const caseRes = await page.request.post("/api/admin/cases/list/create", {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: {
        student_name: `E2E-案例-${Date.now()}`,
        university: "E2E大学",
        program: "E2E专业",
        year: 2026,
        testimonial: "E2E",
      },
    })
    expect(caseRes.status()).toBe(201)
    emit("case_created", { caseId: (await caseRes.json()).id })

    // 创建院校
    const uniRes = await page.request.post(
      "/api/admin/universities/list/create",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: {
          name: `E2E-大学-${Date.now()}`,
          name_en: "E2E Uni",
          country: "德国",
          city: "柏林",
          programs: ["计算机"],
          description: "E2E",
        },
      },
    )
    expect(uniRes.status()).toBe(201)
    emit("university_created", { universityId: (await uniRes.json()).id })

    emit("seed_data_ready")
  })
})
