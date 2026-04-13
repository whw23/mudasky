"use client"

/**
 * 院校列表组件。
 * 从后端获取院校数据，支持搜索筛选和分页。
 */

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  MapPin,
  GraduationCap,
  Building2,
  Loader2,
  SearchX,
} from "lucide-react"
import { Pagination } from "@/components/common/Pagination"
import { UniversitySearch } from "@/components/public/UniversitySearch"
import api from "@/lib/api"
import type { University, PaginatedResponse } from "@/types"

const PAGE_SIZE = 12

/** 院校列表（含搜索筛选） */
export function UniversityList() {
  const t = useTranslations("Universities")

  const [universities, setUniversities] = useState<University[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<string[]>([])

  const [filters, setFilters] = useState({
    search: "",
    country: "",
    province: "",
    city: "",
  })

  /** 获取国家列表 */
  useEffect(() => {
    api
      .get<string[]>("/public/university/countries")
      .then(({ data }) => setCountries(data))
      .catch(() => setCountries([]))
  }, [])

  /** 获取院校列表 */
  const fetchUniversities = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: PAGE_SIZE,
      }
      if (filters.search) params.search = filters.search
      if (filters.country) params.country = filters.country
      if (filters.city) params.city = filters.city

      const { data } = await api.get<PaginatedResponse<University>>(
        "/public/university/list",
        { params },
      )
      setUniversities(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setUniversities([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchUniversities()
  }, [fetchUniversities])

  /** 筛选变更时重置到第一页 */
  const handleFilterChange = (newFilters: {
    search: string
    country: string
    province: string
    city: string
  }) => {
    setFilters(newFilters)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* 搜索筛选栏 */}
      <UniversitySearch
        countries={countries}
        onFilterChange={handleFilterChange}
      />

      {/* 总数 */}
      {!loading && total > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("totalCount", { count: total })}
        </p>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t("loading")}</span>
        </div>
      ) : universities.length === 0 ? (
        /* 空状态 */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchX className="size-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {t("noResults")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {t("noResultsHint")}
          </p>
        </div>
      ) : (
        /* 院校卡片网格 */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {universities.map((uni) => (
            <div
              key={uni.id}
              className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              {/* Logo */}
              <div className="flex size-16 items-center justify-center rounded-lg bg-gray-100">
                {uni.logo_url ? (
                  <img
                    src={uni.logo_url}
                    alt={uni.name}
                    className="size-12 object-contain"
                  />
                ) : (
                  <Building2 className="size-8 text-gray-400 transition-colors group-hover:text-primary" />
                )}
              </div>
              <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
                {uni.name}
              </h4>
              {uni.name_en && (
                <p className="text-xs text-muted-foreground">{uni.name_en}</p>
              )}
              <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {uni.city}, {uni.country}
              </div>
              {uni.programs.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <GraduationCap className="size-4" />
                  {uni.programs.join(", ")}
                </div>
              )}
              {uni.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {uni.description}
                </p>
              )}
              {uni.website && (
                <a
                  href={uni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  {uni.website}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
