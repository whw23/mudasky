"use client"

/**
 * 首页院校搜索框。
 * 包含搜索输入、国家筛选、学科大类筛选，点击搜索后跳转到院校列表页。
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"

const ALL = "__all__"

/** 首页院校搜索框 */
export function HeroSearch() {
  const t = useTranslations("Universities")
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [countries, setCountries] = useState<string[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    api.get<string[]>("/public/universities/countries")
      .then(({ data }) => setCountries(data))
      .catch(() => {})
    api.get("/public/disciplines/list")
      .then(({ data }) => setCategories(data))
      .catch(() => {})
  }, [])

  function handleSearch() {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (country) params.set("country", country)
    if (categoryId) params.set("discipline_category_id", categoryId)
    router.push(`/universities${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="mt-6 md:mt-8 w-full max-w-3xl mx-auto px-4">
      <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 md:p-4 space-y-2 md:space-y-0 md:flex md:gap-3">
        {/* 搜索框 */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("searchPlaceholder")}
          className="bg-white/90 text-foreground h-10 md:flex-1"
        />
        {/* 筛选下拉（移动端并排） */}
        <div className="flex gap-2 md:contents">
          <Select value={country || undefined} onValueChange={(v) => setCountry(v === ALL ? "" : v)}>
            <SelectTrigger className="flex-1 md:w-32 bg-white/90 text-foreground h-10">
              <SelectValue placeholder={t("allCountries")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allCountries")}</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryId || undefined} onValueChange={(v) => setCategoryId(v === ALL ? "" : v)}>
            <SelectTrigger className="flex-1 md:w-32 bg-white/90 text-foreground h-10">
              <SelectValue placeholder={t("allDisciplineCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allDisciplineCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 搜索按钮 */}
        <Button onClick={handleSearch} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white h-10">
          <Search className="size-4 mr-2" />
          {t("searchButton")}
        </Button>
      </div>
    </div>
  )
}
