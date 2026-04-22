"use client"

/**
 * 首页最新资讯。
 * 从 API 拉取真实文章数据,替代硬编码占位文章。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"

interface Article {
  id: string
  title: string
  excerpt: string | null
  category_id: string
  published_at: string | null
  created_at: string
}

interface Category {
  id: string
  name: string
}

const CAT_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-rose-100 text-rose-700",
}

/** 首页最新资讯 */
export function NewsSection() {
  const t = useTranslations("Home")
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([
      api.get("/public/content/categories"),
      api.get("/public/content/articles?page_size=3"),
    ]).then(([catRes, artRes]) => {
      setCategories(catRes.data ?? [])
      setArticles(artRes.data.items ?? [])
    }).catch(() => {})
  }, [])

  const getCatName = (id: string) => categories.find((c) => c.id === id)?.name ?? ""
  const getCatColor = (id: string) => {
    const idx = categories.findIndex((c) => c.id === id)
    return CAT_COLORS[idx % 5] ?? "bg-gray-100 text-gray-700"
  }

  return (
    <section className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {t("newsTag")}
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("newsTitle")}</h3>
          </div>
          <Link
            href="/news"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            {t("viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {articles.length > 0 ? articles.map((a) => (
            <Link
              key={a.id}
              href={`/news/${a.id}`}
              className="group rounded-lg border bg-white p-6 transition-all duration-200 hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${getCatColor(a.category_id)}`}>
                  {getCatName(a.category_id)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(a.published_at ?? a.created_at).slice(0, 10)}
                </span>
              </div>
              <h4 className="mt-2 font-bold transition-colors group-hover:text-primary">
                {a.title}
              </h4>
              {a.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
              )}
            </Link>
          )) : [1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-white p-6">
              <div className="text-xs text-muted-foreground">{new Date().toISOString().slice(0, 10)}</div>
              <h4 className="mt-2 font-bold">{t("articlePlaceholderTitle", { index: i })}</h4>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t("articlePlaceholderSummary")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
