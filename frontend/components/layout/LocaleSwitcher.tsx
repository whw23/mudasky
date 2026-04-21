"use client"

/**
 * 语言切换器
 * 下拉选择切换语言
 */

import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { useTransition } from "react"
import { Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleChange(nextLocale: string): void {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="size-3.5" />
      <Select value={locale} onValueChange={(v) => { if (v) handleChange(v) }}>
        <SelectTrigger className="h-auto border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0" disabled={isPending}>
          <SelectValue>
            {(value: string | null) => value ? t(value) : ""}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {routing.locales.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {t(loc)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
