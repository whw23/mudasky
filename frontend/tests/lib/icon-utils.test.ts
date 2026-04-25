/**
 * icon-utils 图标工具测试。
 * 验证 resolveIcon 的 PascalCase、kebab-case、fallback 解析。
 */

import { describe, it, expect } from "vitest"
import { resolveIcon } from "@/lib/icon-utils"
import { icons } from "lucide-react"

describe("resolveIcon", () => {
  it("PascalCase 名称直接匹配", () => {
    const icon = resolveIcon("House")
    expect(icon).toBe(icons.House)
  })

  it("kebab-case 名称转换后匹配", () => {
    const icon = resolveIcon("arrow-left")
    expect(icon).toBe(icons.ArrowLeft)
  })

  it("小写单词直接匹配（如有）", () => {
    /* 测试通过大小写转换也能匹配 */
    const icon = resolveIcon("house")
    /* "house" 不在 icons 中（PascalCase "House" 才在），但转换后变 "House" */
    expect(icon).toBe(icons.House)
  })

  it("undefined 名称返回 null", () => {
    const icon = resolveIcon(undefined)
    expect(icon).toBeNull()
  })

  it("空字符串返回 null", () => {
    /* 空字符串 falsy，走 !name 分支 */
    const icon = resolveIcon("")
    expect(icon).toBeNull()
  })

  it("未知名称无 fallback 返回 null", () => {
    const icon = resolveIcon("nonexistent-icon-xyz")
    expect(icon).toBeNull()
  })

  it("未知名称有 fallback 返回 fallback", () => {
    const icon = resolveIcon("nonexistent-icon-xyz", icons.House)
    expect(icon).toBe(icons.House)
  })

  it("undefined 名称有 fallback 返回 fallback", () => {
    const icon = resolveIcon(undefined, icons.Mail)
    expect(icon).toBe(icons.Mail)
  })

  it("多段 kebab-case 正确转换", () => {
    const icon = resolveIcon("badge-dollar-sign")
    expect(icon).toBe(icons.BadgeDollarSign)
  })

  it("已存在的 PascalCase 优先于转换", () => {
    /* 先尝试直接查找，再尝试转换 */
    const icon = resolveIcon("ArrowLeft")
    expect(icon).toBe(icons.ArrowLeft)
  })
})
