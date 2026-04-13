"use client"

/**
 * 院校搜索筛选组件。
 * 提供搜索输入框 + 国家/省份/城市三级联动筛选 + 重置按钮。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface Filters {
  search: string
  country: string
  province: string
  city: string
}

interface UniversitySearchProps {
  countries: string[]
  onFilterChange: (filters: Filters) => void
}

/** 院校搜索筛选栏 */
export function UniversitySearch({
  countries,
  onFilterChange,
}: UniversitySearchProps) {
  const t = useTranslations("Universities")

  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [provinces, setProvinces] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 国家变化时加载省份列表 */
  useEffect(() => {
    if (!country) {
      setProvinces([])
      setCities([])
      return
    }
    api
      .get<string[]>("/public/university/provinces", { params: { country } })
      .then(({ data }) => setProvinces(data))
      .catch(() => setProvinces([]))
    // 同时加载城市（不依赖省份）
    api
      .get<string[]>("/public/university/cities", { params: { country } })
      .then(({ data }) => setCities(data))
      .catch(() => setCities([]))
  }, [country])

  /** 防抖触发筛选变更 */
  const emitChange = useCallback(
    (s: string, co: string, pr: string, ci: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onFilterChange({ search: s, country: co, province: pr, city: ci })
      }, 300)
    },
    [onFilterChange],
  )

  /** 搜索框变更 */
  function handleSearchChange(value: string): void {
    setSearch(value)
    emitChange(value, country, province, city)
  }

  /** 国家下拉变更 */
  function handleCountryChange(value: string): void {
    setCountry(value)
    setProvince("")
    setCity("")
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({ search, country: value, province: "", city: "" })
  }

  /** 省份下拉变更 */
  function handleProvinceChange(value: string): void {
    setProvince(value)
    setCity("")
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({ search, country, province: value, city: "" })
  }

  /** 城市下拉变更 */
  function handleCityChange(value: string): void {
    setCity(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({ search, country, province, city: value })
  }

  /** 重置所有筛选 */
  function handleReset(): void {
    setSearch("")
    setCountry("")
    setProvince("")
    setCity("")
    setProvinces([])
    setCities([])
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({ search: "", country: "", province: "", city: "" })
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const hasFilters = search !== "" || country !== "" || province !== "" || city !== ""

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* 搜索框 */}
      <div className="relative flex-1 min-w-[200px]">
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
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* 省份下拉（选了国家后才显示） */}
      {provinces.length > 0 && (
        <select
          value={province}
          onChange={(e) => handleProvinceChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">{t("allProvinces")}</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {/* 城市下拉（选了国家后才显示） */}
      {cities.length > 0 && (
        <select
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">{t("allCities")}</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

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
