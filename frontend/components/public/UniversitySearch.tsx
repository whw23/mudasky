"use client"

/**
 * 院校搜索筛选组件。
 * 提供搜索输入框、国家下拉和重置按钮。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface UniversitySearchProps {
  countries: string[]
  onFilterChange: (filters: {
    search: string
    country: string
  }) => void
}

/** 院校搜索筛选栏 */
export function UniversitySearch({
  countries,
  onFilterChange,
}: UniversitySearchProps) {
  const t = useTranslations("Universities")

  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 防抖触发筛选变更 */
  const emitChange = useCallback(
    (s: string, c: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onFilterChange({ search: s, country: c })
      }, 300)
    },
    [onFilterChange],
  )

  /** 搜索框变更 */
  const handleSearchChange = (value: string) => {
    setSearch(value)
    emitChange(value, country)
  }

  /** 国家下拉变更 */
  const handleCountryChange = (value: string) => {
    setCountry(value)
    /* 国家切换立即触发，不走防抖 */
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({ search, country: value })
  }

  /** 重置所有筛选 */
  const handleReset = () => {
    setSearch("")
    setCountry("")
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({ search: "", country: "" })
  }

  /** 组件卸载时清除定时器 */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const hasFilters = search !== "" || country !== ""

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* 搜索框 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 pl-9"
        />
      </div>

      {/* 国家下拉 */}
      <select
        value={country}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{t("allCountries")}</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* 重置按钮 */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-10 gap-1"
        >
          <X className="size-4" />
          {t("reset")}
        </Button>
      )}
    </div>
  )
}
