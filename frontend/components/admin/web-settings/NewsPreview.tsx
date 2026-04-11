"use client"

/**
 * 新闻政策预览组件（Client 端）。
 * 从 API 获取文章数据，复用真实新闻页面的列表样式。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
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

/** 分类颜色 */
const CAT_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-rose-100 text-rose-700",
}

/** 新闻预览 */
export function NewsPreview() {
  const t = useTranslations("News")
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([
      api.get("/public/content/categories"),
      api.get("/public/content/articles?page_size=6"),
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
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Latest Updates
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("title")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>

      {/* 分类标签 */}
      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white">
            {t("all")}
          </span>
          {categories.map((cat) => (
            <span key={cat.id} className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600">
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {articles.length > 0 ? (
        <div className="mt-8 space-y-4">
          {articles.map((a) => (
            <div key={a.id} className="rounded-lg border bg-white p-6">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${getCatColor(a.category_id)}`}>
                  {getCatName(a.category_id)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(a.published_at ?? a.created_at).slice(0, 10)}
                </span>
              </div>
              <h4 className="mt-2 font-bold">{a.title}</h4>
              {a.excerpt && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-muted-foreground">暂无文章</p>
      )}
    </section>
  )
}
