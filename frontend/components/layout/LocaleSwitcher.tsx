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

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="size-3.5" />
      <select
        value={locale}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-xs outline-none cursor-pointer"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="text-foreground">
            {t(loc)}
          </option>
        ))}
      </select>
    </div>
  )
}
