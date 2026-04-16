/**
 * W1 CRUD 测试：文章、案例、院校、分类。
 * 每种资源：创建 + 编辑 + 删除 + 缺失字段反向测试。
 */

import { test, expect, gotoAdmin, clickAndWaitDialog, trackComponent } from "../fixtures/base"

const TS = Date.now()
const XRW = { "X-Requested-With": "XMLHttpRequest" }
const JSON_HEADERS = { "Content-Type": "application/json", ...XRW }

/* ── 分类 CRUD ── */

test.describe("分类 CRUD", () => {
  const catName = `E2E-分类-${TS}`
  const catSlug = `e2e-cat-${TS}`
  let catId: string

  test("创建分类 — 成功", async ({ page }) => {
    const res = await page.request.post("/api/admin/categories/list/create", {
      headers: JSON_HEADERS,
      data: { name: catName, slug: catSlug, description: "E2E 测试分类", sort_order: 0 },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    catId = body.id
    expect(body.name).toBe(catName)
    trackComponent("CategoryDialog", "名称输入")

    // 列表中可见
    await gotoAdmin(page, "/admin/categories")
    await expect(page.getByText(catName)).toBeVisible()
    trackComponent("CategoryTable", "分类行")
  })

  test("创建分类 — 缺少名称返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/categories/list/create", {
      headers: JSON_HEADERS,
      data: { slug: `e2e-bad-${TS}` },
    })
    expect(res.status()).toBe(422)
    trackComponent("CategoryDialog", "名称校验")
  })

  test("编辑分类 — 改名并验证", async ({ page }) => {
    // 先获取 ID
    const listRes = await page.request.get("/api/admin/categories/list", { headers: XRW })
    const cats = await listRes.json()
    const cat = cats.find((c: { slug: string }) => c.slug === catSlug)
    expect(cat).toBeTruthy()

    const updatedName = `${catName}-已编辑`
    const editRes = await page.request.post("/api/admin/categories/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { category_id: cat.id, name: updatedName, slug: catSlug },
    })
    expect(editRes.status()).toBe(200)

    await gotoAdmin(page, "/admin/categories")
    await expect(page.getByText(updatedName)).toBeVisible()
    trackComponent("CategoryDialog", "编辑保存")
  })

  test("删除分类 — 成功并从列表消失", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/categories/list", { headers: XRW })
    const cats = await listRes.json()
    const cat = cats.find((c: { slug: string }) => c.slug === catSlug)
    expect(cat).toBeTruthy()

    const delRes = await page.request.post("/api/admin/categories/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { category_id: cat.id },
    })
    expect(delRes.status()).toBe(200)

    await gotoAdmin(page, "/admin/categories")
    await expect(page.getByText(catSlug)).not.toBeVisible()
    trackComponent("CategoryTable", "删除操作")
  })
})

/* ── 案例 CRUD ── */

test.describe("案例 CRUD", () => {
  const caseName = `E2E-案例-${TS}`
  let caseId: string

  test("创建案例 — 成功", async ({ page }) => {
    const res = await page.request.post("/api/admin/cases/list/create", {
      headers: JSON_HEADERS,
      data: {
        student_name: caseName,
        university: "E2E大学",
        program: "E2E专业",
        year: 2026,
        testimonial: "E2E 感言",
      },
    })
    expect(res.status()).toBe(201)
    caseId = (await res.json()).id
    trackComponent("CaseDialog", "学生姓名输入")

    await gotoAdmin(page, "/admin/cases")
    await expect(page.getByText(caseName)).toBeVisible()
    trackComponent("CaseTable", "案例行")
  })

  test("创建案例 — 缺少必填字段返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/cases/list/create", {
      headers: JSON_HEADERS,
      data: { student_name: "E2E-缺字段" },
    })
    expect(res.status()).toBe(422)
    trackComponent("CaseDialog", "必填校验")
  })

  test("编辑案例 — 修改大学名", async ({ page }) => {
    // 获取案例 ID
    const listRes = await page.request.get("/api/admin/cases/list?page_size=50", { headers: XRW })
    const body = await listRes.json()
    const c = body.items.find((x: { student_name: string }) => x.student_name === caseName)
    expect(c).toBeTruthy()

    const editRes = await page.request.post("/api/admin/cases/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { case_id: c.id, university: "E2E大学-已修改" },
    })
    expect(editRes.status()).toBe(200)

    await gotoAdmin(page, "/admin/cases")
    await expect(page.getByText("E2E大学-已修改")).toBeVisible()
    trackComponent("CaseDialog", "编辑保存")
  })

  test("删除案例 — 成功", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/cases/list?page_size=50", { headers: XRW })
    const body = await listRes.json()
    const c = body.items.find((x: { student_name: string }) => x.student_name === caseName)
    expect(c).toBeTruthy()

    const delRes = await page.request.post("/api/admin/cases/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { case_id: c.id },
    })
    expect(delRes.status()).toBe(200)
    trackComponent("CaseTable", "删除操作")
  })
})

/* ── 院校 CRUD ── */

test.describe("院校 CRUD", () => {
  const uniName = `E2E-大学-${TS}`

  test("创建院校 — 成功", async ({ page }) => {
    const res = await page.request.post("/api/admin/universities/list/create", {
      headers: JSON_HEADERS,
      data: {
        name: uniName,
        name_en: "E2E University",
        country: "德国",
        city: "柏林",
        programs: ["计算机"],
        description: "E2E 测试院校",
      },
    })
    expect(res.status()).toBe(201)
    trackComponent("UniversityDialog", "校名输入")

    await gotoAdmin(page, "/admin/universities")
    await expect(page.getByText(uniName)).toBeVisible()
    trackComponent("UniversityTable", "院校行")
  })

  test("创建院校 — 缺少必填返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/universities/list/create", {
      headers: JSON_HEADERS,
      data: { name: "E2E-缺字段" },
    })
    expect(res.status()).toBe(422)
    trackComponent("UniversityDialog", "必填校验")
  })

  test("编辑院校 — 修改城市", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/universities/list?page_size=50", { headers: XRW })
    const body = await listRes.json()
    const u = body.items.find((x: { name: string }) => x.name === uniName)
    expect(u).toBeTruthy()

    const editRes = await page.request.post("/api/admin/universities/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { university_id: u.id, city: "慕尼黑" },
    })
    expect(editRes.status()).toBe(200)
    trackComponent("UniversityDialog", "编辑保存")
  })

  test("删除院校 — 成功", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/universities/list?page_size=50", { headers: XRW })
    const body = await listRes.json()
    const u = body.items.find((x: { name: string }) => x.name === uniName)
    expect(u).toBeTruthy()

    const delRes = await page.request.post("/api/admin/universities/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { university_id: u.id },
    })
    expect(delRes.status()).toBe(200)
    trackComponent("UniversityTable", "删除操作")
  })
})

/* ── 文章 CRUD ── */

test.describe("文章 CRUD", () => {
  const artTitle = `E2E-文章-${TS}`
  const artSlug = `e2e-art-${TS}`

  test("创建文章 — 成功", async ({ page }) => {
    // 先获取一个分类
    const catRes = await page.request.get("/api/admin/categories/list", { headers: XRW })
    const cats = await catRes.json()
    expect(cats.length).toBeGreaterThan(0)
    const categoryId = cats[0].id

    const res = await page.request.post("/api/admin/articles/list/create", {
      headers: JSON_HEADERS,
      data: {
        title: artTitle,
        slug: artSlug,
        category_id: categoryId,
        content_type: "markdown",
        content: "E2E 测试内容",
        status: "draft",
      },
    })
    expect(res.status()).toBe(201)
    trackComponent("ArticleEditor", "标题输入")

    await gotoAdmin(page, "/admin/articles")
    await expect(page.getByText(artTitle)).toBeVisible()
    trackComponent("ArticleTable", "文章行")
  })

  test("创建文章 — 缺少标题返回 422", async ({ page }) => {
    const res = await page.request.post("/api/admin/articles/list/create", {
      headers: JSON_HEADERS,
      data: { slug: "e2e-bad", content_type: "markdown", content: "test" },
    })
    expect(res.status()).toBe(422)
    trackComponent("ArticleEditor", "标题校验")
  })

  test("编辑文章 — 修改标题", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/articles/list?page_size=50", { headers: XRW })
    const body = await listRes.json()
    const art = body.items.find((x: { slug: string }) => x.slug === artSlug)
    expect(art).toBeTruthy()

    const newTitle = `${artTitle}-已编辑`
    const editRes = await page.request.post("/api/admin/articles/list/detail/edit", {
      headers: JSON_HEADERS,
      data: { article_id: art.id, title: newTitle },
    })
    expect(editRes.status()).toBe(200)

    await gotoAdmin(page, "/admin/articles")
    await expect(page.getByText(newTitle)).toBeVisible()
    trackComponent("ArticleEditor", "编辑保存")
  })

  test("删除文章 — 成功", async ({ page }) => {
    const listRes = await page.request.get("/api/admin/articles/list?page_size=50", { headers: XRW })
    const body = await listRes.json()
    const art = body.items.find((x: { slug: string }) => x.slug === artSlug)
    expect(art).toBeTruthy()

    const delRes = await page.request.post("/api/admin/articles/list/detail/delete", {
      headers: JSON_HEADERS,
      data: { article_id: art.id },
    })
    expect(delRes.status()).toBe(200)
    trackComponent("ArticleTable", "删除操作")
  })
})
