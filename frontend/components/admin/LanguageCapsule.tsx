"use client"

/**
 * 语言切换胶囊。
 * 显示支持的语言按钮，点击切换当前编辑语言。
 */

import { CONFIG_LOCALES, type ConfigLocale } from "@/lib/i18n-config"

/** 语言短标签 */
const SHORT_LABELS: Record<string, string> = {
  zh: "中文",
  en: "EN",
  ja: "JA",
  de: "DE",
}

interface LanguageCapsuleProps {
  value: ConfigLocale
  onChange: (locale: ConfigLocale) => void
}

/** 语言切换胶囊 */
export function LanguageCapsule({ value, onChange }: LanguageCapsuleProps) {
  return (
    <div className="inline-flex gap-px rounded-md bg-muted p-0.5">
      {CONFIG_LOCALES.map(({ code }) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`rounded px-2.5 py-1 text-xs transition-colors ${
            value === code
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {SHORT_LABELS[code]}
        </button>
      ))}
    </div>
  )
}
