/**
 * Admin CRUD 业务操作函数。
 * 通过网页设置的所见即所得预览进行分类、文章、案例、院校的增删改查。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 导航到网页设置并切换到指定预览页面 */
async function gotoWebSettingsPage(page: Page, navLabel: string): Promise<void> {
  await page.goto("/admin/web-settings")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 30_000 })
  // 等待 NavEditor 加载（nav API 返回后才渲染导航项）
  await page.locator("nav button").first().waitFor({ timeout: 30_000 })
  // 点击导航项切换预览
  const navBtn = page.locator("nav button").filter({ hasText: navLabel })
  await navBtn.first().waitFor({ timeout: 10_000 })
  await navBtn.first().click()
  // 等待预览内容加载
  await page.waitForTimeout(1000)
}

/* ── 分类 CRUD（通过 NavEditor 的增删操作） ── */

/** 创建分类（通过 NavEditor 的 "+" 按钮） */
export async function createCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const slug = String(args?.slug ?? "")

  await page.goto("/admin/web-settings")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 30_000 })

  // 点击 NavEditor 的 "+" 按钮
  await page.getByRole("button", { name: "添加导航项" }).click()

  // 等待新增导航项弹窗
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写名称和 slug
  await dialog.getByPlaceholder(/校园风采/).fill(name)
  await dialog.getByPlaceholder(/campus-life/).fill(slug)

  // 提交
  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/web-settings/nav/add-item") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await dialog.getByRole("button", { name: "添加" }).click()
  const res = await saveResponse
  if (!res.ok()) {
    const body = await res.text().catch(() => "")
    throw new Error(`创建分类 API 返回 ${res.status()}: ${body.substring(0, 200)}`)
  }

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 验证导航栏中出现了新项
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible()
}

/** 编辑分类（不适用于新 UI，跳过） */
export async function editCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  // 新的 NavEditor 不支持编辑分类属性，此操作为空
  // 分类的名称在创建时确定，后续通过 API 可修改但无 UI 入口
}

/** 删除分类（通过 NavEditor 的 "×" 按钮） */
export async function deleteCategory(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")

  await page.goto("/admin/web-settings")
  await page.getByRole("heading", { name: "网页设置" }).waitFor({ timeout: 30_000 })

  // 找到 NavEditor 中该项旁边的删除按钮（aria-label="删除 {name}"）
  const removeBtn = page.getByRole("button", { name: `删除 ${name}` })
  await expect(removeBtn).toBeVisible()
  await removeBtn.click()

  // 等待删除确认弹窗
  const alertDialog = page.getByRole("alertdialog")
  await expect(alertDialog).toBeVisible()

  // 确认删除
  const removeResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/web-settings/nav/remove-item") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await alertDialog.getByRole("button", { name: "删除导航项及文章" }).click()
  await removeResponse

  // 验证导航项已消失
  await expect(removeBtn).not.toBeVisible()
}

/* ── 文章 CRUD ── */

/** 创建文章 */
export async function createArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const title = String(args?.title ?? "")
  const slug = String(args?.slug ?? "")
  const content = String(args?.content ?? "")
  const navLabel = String(args?.navLabel ?? "新闻政策")

  await gotoWebSettingsPage(page, navLabel)

  // 等待文章管理区域加载
  await page.getByRole("button", { name: "写文章" }).waitFor({ timeout: 30_000 })

  // 点击写文章按钮
  await page.getByRole("button", { name: "写文章" }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写标题
  await dialog.getByPlaceholder(/标题/).fill(title)

  // 填写 slug
  if (slug) {
    const slugInput = dialog.locator("#article-slug")
    if (await slugInput.count() > 0) {
      await slugInput.fill(slug)
    }
  }

  // 填写内容
  const contentInput = dialog.locator("#article-content")
  if (await contentInput.count() > 0) {
    await contentInput.fill(content)
  }

  // 切换状态为"已发布"（默认是 draft，预览只显示 published）
  await dialog.getByRole("combobox").click()
  await page.getByRole("option", { name: "已发布" }).waitFor({ timeout: 5_000 })
  await page.getByRole("option", { name: "已发布" }).click()

  // 保存
  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/web-settings/articles") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await dialog.getByRole("button", { name: /保存|发布/ }).click()
  const res = await saveResponse
  if (!res.ok()) {
    const body = await res.text().catch(() => "")
    throw new Error(`创建文章 API 返回 ${res.status()}: ${body.substring(0, 200)}`)
  }

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })

  // 验证文章出现在列表中
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 })
}

/** 编辑文章 */
export async function editArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const oldTitle = String(args?.oldTitle ?? "")
  const newTitle = String(args?.newTitle ?? "")
  const navLabel = String(args?.navLabel ?? "新闻政策")

  await gotoWebSettingsPage(page, navLabel)
  await page.getByRole("button", { name: "写文章" }).waitFor({ timeout: 30_000 })

  // 找到文章卡片（文章卡片用 .rounded-lg.border，不是 .group）
  const card = page.locator(".rounded-lg.border").filter({ hasText: oldTitle }).first()
  await card.locator("button:has(svg.lucide-pencil)").first().click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 修改标题
  const titleInput = dialog.getByPlaceholder(/标题/)
  await titleInput.clear()
  await titleInput.fill(newTitle)

  // 保存
  const editResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/web-settings/articles") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await dialog.getByRole("button", { name: /保存|发布/ }).click()
  const editRes = await editResponse
  if (!editRes.ok()) {
    const body = await editRes.text().catch(() => "")
    throw new Error(`编辑文章 API 返回 ${editRes.status()}: ${body.substring(0, 200)}`)
  }

  // 等待弹窗关闭
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
}

/** 删除文章 */
export async function deleteArticle(page: Page, args?: Record<string, unknown>): Promise<void> {
  const title = String(args?.title ?? "")
  const navLabel = String(args?.navLabel ?? "新闻政策")

  await gotoWebSettingsPage(page, navLabel)
  await page.getByRole("button", { name: "写文章" }).waitFor({ timeout: 30_000 })

  // 找到文章卡片
  const card = page.locator(".rounded-lg.border").filter({ hasText: title }).first()
  await card.locator("button:has(svg.lucide-trash-2)").first().click()

  // 等待删除确认弹窗
  const alertDialog = page.getByRole("alertdialog")
  await expect(alertDialog).toBeVisible()

  // 确认删除
  await alertDialog.getByRole("button", { name: "确认删除" }).click()

  // 等待弹窗关闭
  await expect(alertDialog).not.toBeVisible({ timeout: 15_000 })

  // 验证文章已消失
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 10_000 })
}

/* ── 案例 CRUD ── */

/** 创建案例 */
export async function createCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")
  const university = String(args?.university ?? "")
  const program = String(args?.program ?? "")
  const year = Number(args?.year ?? 2026)

  await gotoWebSettingsPage(page, "成功案例")

  // 点击添加案例按钮
  await page.getByRole("button", { name: /添加案例/ }).waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: /添加案例/ }).click()

  // 等待弹窗打开
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // 填写表单
  await dialog.getByPlaceholder(/姓名/).fill(studentName)
  await dialog.getByPlaceholder(/大学|学校/).fill(university)
  await dialog.getByPlaceholder(/专业/).fill(program)

  if (year !== 2026) {
    const yearInput = dialog.getByRole("spinbutton").first()
    await yearInput.fill(String(year))
  }

  // 保存
  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/web-settings/cases") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await dialog.getByRole("button", { name: /保存/ }).click()
  const res = await saveResponse
  if (!res.ok()) {
    const body = await res.text().catch(() => "")
    throw new Error(`创建案例 API 返回 ${res.status()}: ${body.substring(0, 200)}`)
  }

  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(studentName).first()).toBeVisible({ timeout: 10_000 })
}

/** 编辑案例 */
export async function editCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")
  const newUniversity = String(args?.newUniversity ?? "")

  await gotoWebSettingsPage(page, "成功案例")
  await page.getByRole("button", { name: /添加案例/ }).waitFor({ timeout: 30_000 })

  // 找到案例卡片，hover 触发编辑按钮
  const card = page.locator(".group").filter({ hasText: studentName }).first()
  await card.hover()
  await card.locator("button:has(svg.lucide-pencil)").first().click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  const universityInput = dialog.getByPlaceholder(/大学|学校/)
  await universityInput.clear()
  await universityInput.fill(newUniversity)

  await dialog.getByRole("button", { name: /保存/ }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
}

/** 删除案例 */
export async function deleteCase(page: Page, args?: Record<string, unknown>): Promise<void> {
  const studentName = String(args?.studentName ?? "")

  await gotoWebSettingsPage(page, "成功案例")
  await page.getByRole("button", { name: /添加案例/ }).waitFor({ timeout: 30_000 })

  // 找到案例卡片，hover 触发删除按钮
  const card = page.locator(".group").filter({ hasText: studentName }).first()
  await card.hover()
  await card.locator("button:has(svg.lucide-trash-2)").first().click()

  const alertDialog = page.getByRole("alertdialog")
  await expect(alertDialog).toBeVisible()
  await alertDialog.getByRole("button", { name: "确认删除" }).click()
  await expect(alertDialog).not.toBeVisible()
}

/* ── 院校 CRUD ── */

/** 创建院校 */
export async function createUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const nameEn = String(args?.nameEn ?? "")
  const country = String(args?.country ?? "")
  const city = String(args?.city ?? "")

  await gotoWebSettingsPage(page, "院校选择")

  // 点击添加院校按钮
  await page.getByRole("button", { name: /添加院校/ }).waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: /添加院校/ }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByPlaceholder(/校名|名称/).first().fill(name)
  if (nameEn) {
    const enInput = dialog.getByPlaceholder(/英文/)
    if (await enInput.count() > 0) {
      await enInput.fill(nameEn)
    }
  }
  await dialog.getByPlaceholder(/国家/).fill(country)
  await dialog.getByPlaceholder(/城市/).fill(city)

  const saveResponse = page.waitForResponse(
    (r) => r.url().includes("/admin/web-settings/universities") && r.request().method() === "POST",
    { timeout: 15_000 },
  )
  await dialog.getByRole("button", { name: /保存/ }).click()
  const res = await saveResponse
  if (!res.ok()) {
    const body = await res.text().catch(() => "")
    throw new Error(`创建院校 API 返回 ${res.status()}: ${body.substring(0, 200)}`)
  }

  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 })
}

/** 编辑院校 */
export async function editUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")
  const newCity = String(args?.newCity ?? "")

  await gotoWebSettingsPage(page, "院校选择")
  await page.getByRole("button", { name: /添加院校/ }).waitFor({ timeout: 30_000 })

  const card = page.locator(".group").filter({ hasText: name }).first()
  await card.hover()
  await card.locator("button:has(svg.lucide-pencil)").first().click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  const cityInput = dialog.getByPlaceholder(/城市/)
  await cityInput.clear()
  await cityInput.fill(newCity)

  await dialog.getByRole("button", { name: /保存/ }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
}

/** 删除院校 */
export async function deleteUniversity(page: Page, args?: Record<string, unknown>): Promise<void> {
  const name = String(args?.name ?? "")

  await gotoWebSettingsPage(page, "院校选择")
  await page.getByRole("button", { name: /添加院校/ }).waitFor({ timeout: 30_000 })

  const card = page.locator(".group").filter({ hasText: name }).first()
  await card.hover()
  await card.locator("button:has(svg.lucide-trash-2)").first().click()

  const alertDialog = page.getByRole("alertdialog")
  await expect(alertDialog).toBeVisible()
  await alertDialog.getByRole("button", { name: "确认删除" }).click()
  await expect(alertDialog).not.toBeVisible()
}
