/**
 * 多语言配置工具测试。
 */

import { describe, it, expect } from "vitest"
import {
  CONFIG_LOCALES,
  getLocalizedValue,
  createLocalizedField,
} from "@/lib/i18n-config"

describe("CONFIG_LOCALES", () => {
  it("包含 zh、en、ja、de 四种语言", () => {
    const codes = CONFIG_LOCALES.map((l) => l.code)
    expect(codes).toEqual(["zh", "en", "ja", "de"])
  })
})

describe("getLocalizedValue", () => {
  it("field 为 undefined 时返回空字符串", () => {
    expect(getLocalizedValue(undefined, "zh")).toBe("")
  })

  it("field 为字符串时直接返回（向后兼容）", () => {
    expect(getLocalizedValue("原始文本", "en")).toBe("原始文本")
  })

  it("field 为对象时按 locale 取值", () => {
    const field = { zh: "中文", en: "English", ja: "日本語", de: "Deutsch" }
    expect(getLocalizedValue(field, "en")).toBe("English")
  })

  it("locale 不存在时 fallback 到 zh", () => {
    const field = { zh: "中文", en: "English" }
    expect(getLocalizedValue(field, "fr")).toBe("中文")
  })

  it("locale 和 zh 都不存在时返回空字符串", () => {
    const field = { en: "English" }
    expect(getLocalizedValue(field, "fr")).toBe("")
  })

  it("对应 locale 值为空字符串时 fallback 到 zh", () => {
    const field = { zh: "中文", en: "" }
    expect(getLocalizedValue(field, "en")).toBe("中文")
  })
})

describe("createLocalizedField", () => {
  it("传入中文值时 zh 字段填充，其余为空", () => {
    const field = createLocalizedField("测试")
    expect(field).toEqual({ zh: "测试", en: "", ja: "", de: "" })
  })

  it("不传参数时所有字段为空字符串", () => {
    const field = createLocalizedField()
    expect(field).toEqual({ zh: "", en: "", ja: "", de: "" })
  })
})
