/**
 * E2E 测试数据种子工具。
 * 通过 page.evaluate 调用 API 创建测试数据，每个测试自给自足。
 */

import type { Page } from "@playwright/test"

/** 通用 API 调用（在浏览器上下文中执行，自动带 cookie） */
async function apiCall(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => null)
      return { status: res.status, data }
    },
    { method, path, body },
  )
}

/** 获取角色列表并返回 { name: id } 映射 */
export async function getRoleMap(page: Page): Promise<Record<string, string>> {
  const res = await apiCall(page, "GET", "/api/admin/roles/meta/list")
  if (res.status !== 200 || !Array.isArray(res.data)) return {}
  return Object.fromEntries(res.data.map((r: { name: string; id: string }) => [r.name, r.id]))
}

/** 注册一个测试用户并分配角色，返回 userId */
export async function ensureTestUser(
  page: Page,
  phone: string,
  username: string,
  roleName: string,
): Promise<string | null> {
  // 先查是否已存在
  const existing = await apiCall(page, "GET", `/api/admin/users/list?keyword=${phone.slice(-4)}`)
  if (existing.status === 200) {
    const user = existing.data?.items?.find((u: { phone: string }) => u.phone === phone)
    if (user) {
      // 确保角色正确
      if (user.role_name !== roleName) {
        const roles = await getRoleMap(page)
        if (roles[roleName]) {
          await apiCall(page, "POST", "/api/admin/users/list/detail/assign-role", {
            user_id: user.id, role_id: roles[roleName],
          })
        }
      }
      return user.id
    }
  }

  // 注册新用户（不带 credentials 避免覆盖管理员 cookie）
  const smsRes = await page.evaluate(async (ph) => {
    const res = await fetch("/api/auth/sms-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ phone: ph }),
    })
    if (!res.ok) return null
    return (await res.json()).code as string
  }, phone)

  if (smsRes) {
    await page.evaluate(async ({ phone, code, username }) => {
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ phone, code, username }),
      })
    }, { phone, code: smsRes, username })
  }

  // 查找并分配角色
  const res = await apiCall(page, "GET", `/api/admin/users/list?keyword=${phone.slice(-4)}`)
  const user = res.data?.items?.find((u: { phone: string }) => u.phone === phone)
  if (!user) return null

  const roles = await getRoleMap(page)
  if (roles[roleName]) {
    await apiCall(page, "POST", "/api/admin/users/list/detail/assign-role", {
      user_id: user.id, role_id: roles[roleName],
    })
  }
  return user.id
}

/** 创建测试文章，返回 article id */
export async function createArticle(page: Page, categorySlug?: string): Promise<string | null> {
  // 获取分类
  const catRes = await apiCall(page, "GET", "/api/admin/web-settings/categories/list")
  if (catRes.status !== 200) return null
  const cats = Array.isArray(catRes.data) ? catRes.data : []
  const cat = categorySlug
    ? cats.find((c: { slug: string }) => c.slug === categorySlug)
    : cats[0]
  if (!cat) return null

  const res = await apiCall(page, "POST", "/api/admin/web-settings/articles/list/create", {
    title: `E2E_239_文章${Date.now()}`,
    slug: `e2e-239-${Date.now()}`,
    category_id: cat.id,
    content_type: "markdown",
    content: "E2E_239_测试内容",
    status: "published",
  })
  return res.status === 201 ? res.data?.id : null
}

/** 创建测试案例，返回 case id */
export async function createCase(page: Page): Promise<string | null> {
  const res = await apiCall(page, "POST", "/api/admin/web-settings/cases/list/create", {
    student_name: `E2E_239_学生${Date.now()}`,
    university: "E2E_239_大学",
    program: "E2E_239_专业",
    year: 2026,
    testimonial: "E2E_239_测试感言",
  })
  return res.status === 201 ? res.data?.id : null
}

/** 创建测试院校，返回 university id */
export async function createUniversity(page: Page): Promise<string | null> {
  const res = await apiCall(page, "POST", "/api/admin/web-settings/universities/list/create", {
    name: `E2E_239_大学${Date.now()}`,
    name_en: "E2E_239_Test University",
    country: "德国",
    city: "柏林",
    programs: ["计算机", "机械"],
    description: "E2E_239_测试院校",
  })
  return res.status === 201 ? res.data?.id : null
}

/** 获取已存在的案例 ID（不创建） */
export async function getExistingCaseId(page: Page): Promise<string | null> {
  const res = await apiCall(page, "GET", "/api/public/cases/list?page_size=1")
  return res.data?.items?.[0]?.id ?? null
}

/** 获取已存在的院校 ID（不创建） */
export async function getExistingUniversityId(page: Page): Promise<string | null> {
  const res = await apiCall(page, "GET", "/api/public/universities/list?page_size=1")
  return res.data?.items?.[0]?.id ?? null
}

/** 获取已存在的文章 ID（不创建），可按分类 slug 过滤 */
export async function getExistingArticleId(page: Page, categorySlug?: string): Promise<string | null> {
  if (!categorySlug) {
    const res = await apiCall(page, "GET", "/api/public/content/articles?page_size=1")
    return res.data?.items?.[0]?.id ?? null
  }
  // 先获取分类 ID
  const catRes = await apiCall(page, "GET", "/api/public/content/categories")
  if (catRes.status !== 200 || !Array.isArray(catRes.data)) return null
  const cat = catRes.data.find((c: { slug: string }) => c.slug === categorySlug)
  if (!cat) return null
  const res = await apiCall(page, "GET", `/api/public/content/articles?category_id=${cat.id}&page_size=1`)
  return res.data?.items?.[0]?.id ?? null
}
