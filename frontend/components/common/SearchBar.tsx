"use client"

/**
 * 胶囊搜索栏（首页 + 院校页共用）。
 * 输入框 + 搜索按钮，提交后跳转到 /universities?search=xxx。
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

/** 胶囊搜索栏（首页 + 院校页共用） */
export function SearchBar() {
  const t = useTranslations("Universities")
  const router = useRouter()
  const [search, setSearch] = useState("")

  function handleSearch() {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    router.push(`/universities${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="mt-6 md:mt-8 w-full max-w-xl mx-auto px-4">
      <div className="flex bg-white/90 rounded-full overflow-hidden shadow-lg">
        <div className="flex items-center pl-5">
          <Search className="size-5 text-muted-foreground" />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSearch}
          className="m-1 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {t("searchButton")}
        </button>
      </div>
    </div>
  )
}
