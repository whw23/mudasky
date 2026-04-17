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
  await page.locator("main").waitFor()

  // 点击创建分类按钮
  await page.getByRole("button", { name: "创建分类" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByLabel("名称").fill(name)
  await dialog.getByLabel("标识").fill(slug)
  await dialog.getByLabel("描述").fill(description)
  await dialog.getByLabel("排序").fill(String(sortOrder))

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByText(name)).toBeVisible()
}

/** 编辑分类 */
export async function editCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldName = String(args?.oldName ?? "")
  const newName = String(args?.newName ?? "")

  await page.goto("/admin/categories")
  await page.locator("main").waitFor()

  // 找到分类行，点击编辑
  const row = page.locator("tr", { hasText: oldName })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改名称
  const nameInput = dialog.getByLabel("名称")
  await nameInput.clear()
  await nameInput.fill(newName)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功
  await expect(page.getByText(newName)).toBeVisible()
}

/** 删除分类 */
export async function deleteCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")

  await page.goto("/admin/categories")
  await page.locator("main").waitFor()

  // 找到分类行，点击删除
  const row = page.locator("tr", { hasText: name })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功（从列表消失）
  await expect(page.getByText(name)).not.toBeVisible()
}

/* ── 文章 CRUD ── */

/** 创建文章 */
export async function createArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const title = String(args?.title ?? "")
  const slug = String(args?.slug ?? "")
  const content = String(args?.content ?? "")

  await page.goto("/admin/articles")
  await page.locator("main").waitFor()

  // 点击创建文章按钮
  await page.getByRole("button", { name: "创建文章" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByLabel("标题").fill(title)
  await dialog.getByLabel("标识").fill(slug)

  // 选择第一个分类（假设已有分类）
  const categorySelect = dialog.locator("select").first()
  await categorySelect.selectOption({ index: 1 }) // index 0 是占位符

  // 填写内容
  await dialog.getByLabel("内容").fill(content)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByText(title)).toBeVisible()
}

/** 编辑文章 */
export async function editArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldTitle = String(args?.oldTitle ?? "")
  const newTitle = String(args?.newTitle ?? "")

  await page.goto("/admin/articles")
  await page.locator("main").waitFor()

  // 找到文章行，点击编辑
  const row = page.locator("tr", { hasText: oldTitle })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改标题
  const titleInput = dialog.getByLabel("标题")
  await titleInput.clear()
  await titleInput.fill(newTitle)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功
  await expect(page.getByText(newTitle)).toBeVisible()
}

/** 删除文章 */
export async function deleteArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const title = String(args?.title ?? "")

  await page.goto("/admin/articles")
  await page.locator("main").waitFor()

  // 找到文章行，点击删除
  const row = page.locator("tr", { hasText: title })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功
  await expect(page.getByText(title)).not.toBeVisible()
}

/* ── 案例 CRUD ── */

/** 创建案例 */
export async function createCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")
  const university = String(args?.university ?? "")
  const program = String(args?.program ?? "")
  const year = Number(args?.year ?? 2026)

  await page.goto("/admin/cases")
  await page.locator("main").waitFor()

  // 点击添加案例按钮
  await page.getByRole("button", { name: "添加案例" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByLabel("学生姓名").fill(studentName)
  await dialog.getByLabel("大学").fill(university)
  await dialog.getByLabel("专业").fill(program)
  await dialog.getByLabel("年份").fill(String(year))

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByText(studentName)).toBeVisible()
}

/** 编辑案例 */
export async function editCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")
  const newUniversity = String(args?.newUniversity ?? "")

  await page.goto("/admin/cases")
  await page.locator("main").waitFor()

  // 找到案例行，点击编辑
  const row = page.locator("tr", { hasText: studentName })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改大学名
  const universityInput = dialog.getByLabel("大学")
  await universityInput.clear()
  await universityInput.fill(newUniversity)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功
  await expect(page.getByText(newUniversity)).toBeVisible()
}

/** 删除案例 */
export async function deleteCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")

  await page.goto("/admin/cases")
  await page.locator("main").waitFor()

  // 找到案例行，点击删除
  const row = page.locator("tr", { hasText: studentName })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功
  await expect(page.getByText(studentName)).not.toBeVisible()
}

/* ── 院校 CRUD ── */

/** 创建院校 */
export async function createUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const nameEn = String(args?.nameEn ?? "")
  const country = String(args?.country ?? "")
  const city = String(args?.city ?? "")

  await page.goto("/admin/universities")
  await page.locator("main").waitFor()

  // 点击添加院校按钮
  await page.getByRole("button", { name: "添加院校" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByLabel("中文名").fill(name)
  await dialog.getByLabel("英文名").fill(nameEn)
  await dialog.getByLabel("国家").fill(country)
  await dialog.getByLabel("城市").fill(city)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证创建成功
  await expect(page.getByText(name)).toBeVisible()
}

/** 编辑院校 */
export async function editUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const newCity = String(args?.newCity ?? "")

  await page.goto("/admin/universities")
  await page.locator("main").waitFor()

  // 找到院校行，点击编辑
  const row = page.locator("tr", { hasText: name })
  await row.getByRole("button", { name: "编辑" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改城市
  const cityInput = dialog.getByLabel("城市")
  await cityInput.clear()
  await cityInput.fill(newCity)

  // 保存
  await dialog.getByRole("button", { name: "保存" }).click()

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible()

  // 验证修改成功（可能需要展开详情查看）
  await expect(page.getByText(name)).toBeVisible()
}

/** 删除院校 */
export async function deleteUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")

  await page.goto("/admin/universities")
  await page.locator("main").waitFor()

  // 找到院校行，点击删除
  const row = page.locator("tr", { hasText: name })

  // 监听 confirm 弹窗
  page.once("dialog", dialog => dialog.accept())

  await row.getByRole("button", { name: "删除" }).click()

  // 验证删除成功
  await expect(page.getByText(name)).not.toBeVisible()
}
