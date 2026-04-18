/**
 * Admin CRUD 业务操作函数。
 * 通过 UI 进行分类、文章、案例、院校的增删改查。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/* ── 分类 CRUD ── */

/** 创建分类 */
export async function createCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const slug = String(args?.slug ?? "")
  const description = String(args?.description ?? "")
  const sortOrder = Number(args?.sortOrder ?? 0)

  await page.goto("/admin/categories")
  await page.getByRole("heading", { name: "分类管理" }).waitFor()

  // 点击创建分类按钮
  await page.getByRole("button", { name: "创建分类" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByPlaceholder("请输入分类名称").fill(name)
  await dialog.getByPlaceholder("请输入分类标识（英文）").fill(slug)
  await dialog.getByPlaceholder("请输入分类描述").fill(description)
  if (sortOrder !== 0) {
    await dialog.getByRole("spinbutton").fill(String(sortOrder))
  }

  // 保存（等待 API 响应）
  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/api/admin/categories") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await dialog.getByRole("button", { name: "保存" }).click()
  const res = await saveResponse
  if (!res.ok()) {
    const body = await res.text().catch(() => "")
    throw new Error(`创建分类 API 返回 ${res.status()}: ${body.substring(0, 200)}`)
  }

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 验证创建成功
  await expect(page.getByRole("cell", { name })).toBeVisible()
}

/** 编辑分类 */
export async function editCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldName = String(args?.oldName ?? "")
  const newName = String(args?.newName ?? "")

  await page.goto("/admin/categories")
  await page.getByRole("heading", { name: "分类管理" }).waitFor()

  // 找到分类行，点击编辑
  const row = page.getByRole("row", { name: new RegExp(oldName) })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改名称
  const nameInput = dialog.getByPlaceholder("请输入分类名称")
  await nameInput.clear()
  await nameInput.fill(newName)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功
  await expect(page.getByRole("cell", { name: newName })).toBeVisible()
}

/** 删除分类 */
export async function deleteCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")

  await page.goto("/admin/categories")
  await page.getByRole("heading", { name: "分类管理" }).waitFor()

  // 找到分类行，点击删除
  const row = page.getByRole("row", { name: new RegExp(name) })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功（从列表消失）
  await expect(page.getByRole("cell", { name })).not.toBeVisible()
}

/* ── 文章 CRUD ── */

/** 创建文章（整页表单，非弹窗） */
export async function createArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const title = String(args?.title ?? "")
  const slug = String(args?.slug ?? "")
  const content = String(args?.content ?? "")

  await page.goto("/admin/articles")
  await page.getByRole("heading", { name: "文章管理" }).waitFor()

  // 点击写文章按钮
  await page.getByRole("button", { name: "写文章" }).click()

  // 等待编辑页面加载
  await page.getByRole("heading", { name: "写文章" }).waitFor()

  // 填写标题
  await page.getByPlaceholder("请输入文章标题").fill(title)

  // 填写 URL 标识
  if (slug) {
    await page.getByPlaceholder("自动生成或手动输入").fill(slug)
  }

  // 分类默认选第一个，不需要改

  // 填写正文内容
  await page.getByPlaceholder("请输入内容...").fill(content)

  // 点击发布
  await page.getByRole("button", { name: "发布" }).click()

  // 等待跳转回列表页
  await page.getByRole("heading", { name: "文章管理" }).waitFor()

  // 验证创建成功
  await expect(page.getByRole("cell", { name: title })).toBeVisible()
}

/** 编辑文章 */
export async function editArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldTitle = String(args?.oldTitle ?? "")
  const newTitle = String(args?.newTitle ?? "")

  await page.goto("/admin/articles")
  await page.getByRole("heading", { name: "文章管理" }).waitFor()

  // 找到文章行，点击编辑
  const row = page.getByRole("row", { name: new RegExp(oldTitle) })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待编辑页面加载
  await page.getByPlaceholder("请输入文章标题").waitFor()

  // 修改标题
  const titleInput = page.getByPlaceholder("请输入文章标题")
  await titleInput.clear()
  await titleInput.fill(newTitle)

  // 点击发布（保存修改）
  await page.getByRole("button", { name: "发布" }).click()

  // 等待跳转回列表页
  await page.getByRole("heading", { name: "文章管理" }).waitFor()

  // 验证修改成功
  await expect(page.getByRole("cell", { name: newTitle })).toBeVisible()
}

/** 删除文章 */
export async function deleteArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const title = String(args?.title ?? "")

  await page.goto("/admin/articles")
  await page.getByRole("heading", { name: "文章管理" }).waitFor()

  // 找到文章行，点击删除
  const row = page.getByRole("row", { name: new RegExp(title) })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功
  await expect(page.getByRole("cell", { name: title })).not.toBeVisible()
}

/* ── 案例 CRUD ── */

/** 创建案例 */
export async function createCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")
  const university = String(args?.university ?? "")
  const program = String(args?.program ?? "")
  const year = Number(args?.year ?? 2026)

  await page.goto("/admin/cases")
  await page.getByRole("heading", { name: "案例管理" }).waitFor()

  // 点击添加案例按钮
  await page.getByRole("button", { name: "添加案例" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByPlaceholder("请输入学生姓名").fill(studentName)
  await dialog.getByPlaceholder("请输入录取大学").fill(university)
  await dialog.getByPlaceholder("请输入录取专业").fill(program)

  // 入学年份（spinbutton，默认 2026）
  if (year !== 2026) {
    const yearInput = dialog.getByRole("spinbutton").first()
    await yearInput.fill(String(year))
  }

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByRole("cell", { name: studentName })).toBeVisible()
}

/** 编辑案例 */
export async function editCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")
  const newUniversity = String(args?.newUniversity ?? "")

  await page.goto("/admin/cases")
  await page.getByRole("heading", { name: "案例管理" }).waitFor()

  // 找到案例行，点击编辑
  const row = page.getByRole("row", { name: new RegExp(studentName) })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改录取大学
  const universityInput = dialog.getByPlaceholder("请输入录取大学")
  await universityInput.clear()
  await universityInput.fill(newUniversity)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功
  await expect(page.getByRole("cell", { name: newUniversity }).first()).toBeVisible()
}

/** 删除案例 */
export async function deleteCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")

  await page.goto("/admin/cases")
  await page.getByRole("heading", { name: "案例管理" }).waitFor()

  // 找到案例行，点击删除
  const row = page.getByRole("row", { name: new RegExp(studentName) })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功
  await expect(page.getByRole("cell", { name: studentName })).not.toBeVisible()
}

/* ── 院校 CRUD ── */

/** 创建院校 */
export async function createUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const nameEn = String(args?.nameEn ?? "")
  const country = String(args?.country ?? "")
  const city = String(args?.city ?? "")

  await page.goto("/admin/universities")
  await page.getByRole("heading", { name: "院校管理" }).waitFor()

  // 点击添加院校按钮
  await page.getByRole("button", { name: "添加院校" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByPlaceholder("请输入校名").fill(name)
  if (nameEn) {
    await dialog.getByPlaceholder("请输入英文名（可选）").fill(nameEn)
  }
  await dialog.getByPlaceholder("请输入国家").fill(country)
  await dialog.getByPlaceholder("请输入城市").fill(city)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByRole("cell", { name })).toBeVisible()
}

/** 编辑院校 */
export async function editUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const newCity = String(args?.newCity ?? "")

  await page.goto("/admin/universities")
  await page.getByRole("heading", { name: "院校管理" }).waitFor()

  // 找到院校行，点击编辑
  const row = page.getByRole("row", { name: new RegExp(name) })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改城市
  const cityInput = dialog.getByPlaceholder("请输入城市")
  await cityInput.clear()
  await cityInput.fill(newCity)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功（名称仍可见）
  await expect(page.getByRole("cell", { name })).toBeVisible()
}

/** 删除院校 */
export async function deleteUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")

  await page.goto("/admin/universities")
  await page.getByRole("heading", { name: "院校管理" }).waitFor()

  // 找到院校行，点击删除
  const row = page.getByRole("row", { name: new RegExp(name) })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功
  await expect(page.getByRole("cell", { name })).not.toBeVisible()
}
