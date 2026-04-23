"use client"

/**
 * 多语言字段输入组件。
 * 渲染所有支持语言的 input 或 textarea，中文必填。
 */

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CONFIG_LOCALES, type LocalizedField, type ConfigLocale } from "@/lib/i18n-config"

interface LocalizedInputProps {
  value: LocalizedField
  onChange: (value: Record<string, string>) => void
  label: string
  multiline?: boolean
  rows?: number
  locale?: ConfigLocale
}

/** 多语言字段输入组件 */
export function LocalizedInput({
  value,
  onChange,
  label,
  multiline = false,
  rows = 3,
  locale,
}: LocalizedInputProps) {
  /* 将字符串格式标准化为多语言对象 */
  const normalized: Record<string, string> =
    typeof value === "string"
      ? { zh: value, en: "", ja: "", de: "" }
      : { zh: "", en: "", ja: "", de: "", ...value }

  /** 更新指定语言的值 */
  function handleChange(localeCode: string, newValue: string) {
    onChange({ ...normalized, [localeCode]: newValue })
  }

  const InputComponent = multiline ? Textarea : Input

  /* 单语言模式：只显示指定语言的输入框 */
  if (locale) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <InputComponent
          value={normalized[locale] || ""}
          onChange={(e) => handleChange(locale, e.target.value)}
          required={locale === "zh"}
          placeholder={locale === "zh" ? `${label}（必填）` : `${label}（可选）`}
          {...(multiline ? { rows } : {})}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-1.5">
        {CONFIG_LOCALES.map(({ code, label: langLabel }) => (
          <div key={code} className="flex items-start gap-2">
            <span className="mt-2 w-16 shrink-0 text-xs text-muted-foreground">
              {langLabel}
            </span>
            <InputComponent
              value={normalized[code] || ""}
              onChange={(e) => handleChange(code, e.target.value)}
              required={code === "zh"}
              placeholder={code === "zh" ? `${label}（必填）` : `${label}（可选）`}
              {...(multiline ? { rows } : {})}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
