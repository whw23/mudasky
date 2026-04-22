"use client"

/**
 * 院校搜索筛选组件。
 * 提供搜索输入框 + 国家/省份/城市三级联动筛选 + 重置按钮。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"

/** "全部"的特殊值（SelectItem 不支持空字符串） */
const ALL = "__all__"

interface DisciplineCategory {
  id: string
  name: string
  disciplines: { id: string; name: string }[]
}

interface Filters {
  search: string
  country: string
  province: string
  city: string
  disciplineCategoryId: string
  disciplineId: string
}

interface UniversitySearchProps {
  countries: string[]
  onFilterChange: (filters: Filters) => void
  editable?: boolean
  onManageDisciplines?: () => void
}

/** 院校搜索筛选栏 */
export function UniversitySearch({
  countries,
  onFilterChange,
  editable = false,
  onManageDisciplines,
}: UniversitySearchProps) {
  const t = useTranslations("Universities")
  const searchParams = useSearchParams()

  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [disciplineCategoryId, setDisciplineCategoryId] = useState("")
  const [disciplineId, setDisciplineId] = useState("")
  const [provinces, setProvinces] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [disciplineCategories, setDisciplineCategories] = useState<DisciplineCategory[]>([])
  const [disciplines, setDisciplines] = useState<{ id: string; name: string }[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 从 URL 参数初始化筛选条件 */
  useEffect(() => {
    const urlSearch = searchParams.get("search")
    const urlCountry = searchParams.get("country")
    const urlCategoryId = searchParams.get("discipline_category_id")
    if (urlSearch) setSearch(urlSearch)
    if (urlCountry) setCountry(urlCountry)
    if (urlCategoryId) setDisciplineCategoryId(urlCategoryId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 初始化加载学科分类树 */
  useEffect(() => {
    api
      .get<DisciplineCategory[]>("/public/disciplines/list")
      .then(({ data }) => setDisciplineCategories(data))
      .catch(() => setDisciplineCategories([]))
  }, [])

  /** 国家变化时加载省份列表 */
  useEffect(() => {
    if (!country) {
      setProvinces([])
      setCities([])
      return
    }
    api
      .get<string[]>("/public/universities/provinces", { params: { country } })
      .then(({ data }) => setProvinces(data))
      .catch(() => setProvinces([]))
    // 同时加载城市（不依赖省份）
    api
      .get<string[]>("/public/universities/cities", { params: { country } })
      .then(({ data }) => setCities(data))
      .catch(() => setCities([]))
  }, [country])

  /** 学科大类变化时加载学科列表 */
  useEffect(() => {
    if (!disciplineCategoryId) {
      setDisciplines([])
      return
    }
    const category = disciplineCategories.find((c) => c.id === disciplineCategoryId)
    setDisciplines(category?.disciplines || [])
  }, [disciplineCategoryId, disciplineCategories])

  /** 防抖触发筛选变更 */
  const emitChange = useCallback(
    (s: string, co: string, pr: string, ci: string, dc: string, d: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onFilterChange({
          search: s,
          country: co,
          province: pr,
          city: ci,
          disciplineCategoryId: dc,
          disciplineId: d,
        })
      }, 300)
    },
    [onFilterChange],
  )

  /** 搜索框变更 */
  function handleSearchChange(value: string): void {
    setSearch(value)
    emitChange(value, country, province, city, disciplineCategoryId, disciplineId)
  }

  /** 国家下拉变更 */
  function handleCountryChange(value: string): void {
    setCountry(value)
    setProvince("")
    setCity("")
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({
      search,
      country: value,
      province: "",
      city: "",
      disciplineCategoryId,
      disciplineId,
    })
  }

  /** 省份下拉变更 */
  function handleProvinceChange(value: string): void {
    setProvince(value)
    setCity("")
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({
      search,
      country,
      province: value,
      city: "",
      disciplineCategoryId,
      disciplineId,
    })
  }

  /** 城市下拉变更 */
  function handleCityChange(value: string): void {
    setCity(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({
      search,
      country,
      province,
      city: value,
      disciplineCategoryId,
      disciplineId,
    })
  }

  /** 学科大类变更 */
  function handleDisciplineCategoryChange(value: string): void {
    setDisciplineCategoryId(value)
    setDisciplineId("")
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({
      search,
      country,
      province,
      city,
      disciplineCategoryId: value,
      disciplineId: "",
    })
  }

  /** 学科变更 */
  function handleDisciplineChange(value: string): void {
    setDisciplineId(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({
      search,
      country,
      province,
      city,
      disciplineCategoryId,
      disciplineId: value,
    })
  }

  /** 重置所有筛选 */
  function handleReset(): void {
    setSearch("")
    setCountry("")
    setProvince("")
    setCity("")
    setDisciplineCategoryId("")
    setDisciplineId("")
    setProvinces([])
    setCities([])
    setDisciplines([])
    if (timerRef.current) clearTimeout(timerRef.current)
    onFilterChange({
      search: "",
      country: "",
      province: "",
      city: "",
      disciplineCategoryId: "",
      disciplineId: "",
    })
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const hasFilters =
    search !== "" ||
    country !== "" ||
    province !== "" ||
    city !== "" ||
    disciplineCategoryId !== "" ||
    disciplineId !== ""

  return (
    <div className="flex flex-col gap-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 pl-9"
        />
      </div>

      {/* 国家下拉 */}
      <Select value={country || ALL} onValueChange={(v) => handleCountryChange(v === ALL ? "" : v ?? "")}>
        <SelectTrigger className="h-10">
          <SelectValue>
            {(value: string | null) => (!value || value === ALL) ? t("allCountries") : value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allCountries")}</SelectItem>
          {countries.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 省份下拉（选了国家后才显示） */}
      {provinces.length > 0 && (
        <Select value={province || ALL} onValueChange={(v) => handleProvinceChange(v === ALL ? "" : v ?? "")}>
          <SelectTrigger className="h-10">
            <SelectValue>
              {(value: string | null) => (!value || value === ALL) ? t("allProvinces") : value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allProvinces")}</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 城市下拉（选了国家后才显示） */}
      {cities.length > 0 && (
        <Select value={city || ALL} onValueChange={(v) => handleCityChange(v === ALL ? "" : v ?? "")}>
          <SelectTrigger className="h-10">
            <SelectValue>
              {(value: string | null) => (!value || value === ALL) ? t("allCities") : value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allCities")}</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 学科大类下拉 */}
      {disciplineCategories.length > 0 && (
        <Select
          value={disciplineCategoryId || ALL}
          onValueChange={(v) => handleDisciplineCategoryChange(v === ALL ? "" : v ?? "")}
        >
          <SelectTrigger className="h-10">
            <SelectValue>
              {(value: string | null) => {
                if (!value || value === ALL) return t("allDisciplineCategories")
                const cat = disciplineCategories.find((c) => c.id === value)
                return cat?.name || t("allDisciplineCategories")
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allDisciplineCategories")}</SelectItem>
            {disciplineCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 学科下拉（选了学科大类后才显示） */}
      {disciplines.length > 0 && (
        <Select
          value={disciplineId || ALL}
          onValueChange={(v) => handleDisciplineChange(v === ALL ? "" : v ?? "")}
        >
          <SelectTrigger className="h-10">
            <SelectValue>
              {(value: string | null) => {
                if (!value || value === ALL) return t("allDisciplines")
                const disc = disciplines.find((d) => d.id === value)
                return disc?.name || t("allDisciplines")
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allDisciplines")}</SelectItem>
            {disciplines.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
