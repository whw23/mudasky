/**
 * 配置多语言工具。
 * 处理配置字段的多语言取值，fallback 到中文。
 */

/** 支持的语言列表 */
export const CONFIG_LOCALES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "de", label: "Deutsch" },
] as const

export type ConfigLocale = (typeof CONFIG_LOCALES)[number]["code"]

/** 多语言字段类型 */
export type LocalizedField = string | Record<string, string>

/**
 * 从多语言字段中取当前语言的值。
 * fallback 链：当前语言 → 中文（中文必填）。
 * 兼容旧的纯字符串格式。
 */
export function getLocalizedValue(
  field: LocalizedField | undefined,
  locale: string
): string {
  if (!field) return ""
  if (typeof field === "string") return field
  return field[locale] || field["zh"] || ""
}

/**
 * 创建空的多语言字段对象。
 */
export function createLocalizedField(zhValue: string = ""): Record<string, string> {
  return { zh: zhValue, en: "", ja: "", de: "" }
}
