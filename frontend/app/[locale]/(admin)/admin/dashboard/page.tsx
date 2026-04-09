"use client"

/**
 * 管理后台仪表盘页面。
 * 展示系统概览统计、最近用户、最近文章和快捷操作。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Users,
  BookOpen,
  CheckCircle,
  FolderOpen,
  UserCog,
  FileEdit,
  Settings,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import type { User, Article } from "@/types"
import { StatCard } from "@/components/dashboard/StatCard"
import { RecentList, type RecentItem } from "@/components/dashboard/RecentList"
import { Button } from "@/components/ui/button"

/** 管理后台统计数据 */
interface AdminStats {
  totalUsers: number
  totalArticles: number
  publishedArticles: number
  totalCategories: number
}

/** 管理后台仪表盘页面 */
export default function AdminDashboardPage() {
  const t = useTranslations("AdminDashboard")

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalArticles: 0,
    publishedArticles: 0,
    totalCategories: 0,
  })
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [recentArticles, setRecentArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  /** 获取管理后台数据 */
  async function fetchAdminData(): Promise<void> {
    setLoading(true)
    try {
      const [usersRes, articlesRes, categoriesRes] = await Promise.allSettled([
        api.get("/admin/users", { params: { limit: 5 } }),
        api.get("/admin/content/articles", { params: { limit: 5 } }),
        api.get("/admin/content/categories"),
      ])

      if (usersRes.status === "fulfilled") {
        const data = usersRes.value.data
        const items = data.items ?? data
        setRecentUsers(Array.isArray(items) ? items : [])
        setStats((prev) => ({
          ...prev,
          totalUsers: data.total ?? (Array.isArray(items) ? items.length : 0),
        }))
      }

      if (articlesRes.status === "fulfilled") {
        const data = articlesRes.value.data
        const items: Article[] = data.items ?? data
        setRecentArticles(Array.isArray(items) ? items : [])
        const articleList = Array.isArray(items) ? items : []
        setStats((prev) => ({
          ...prev,
          totalArticles:
            data.total ?? (Array.isArray(items) ? items.length : 0),
          publishedArticles: articleList.filter(
            (a) => a.status === "published",
          ).length,
        }))
      }

      if (categoriesRes.status === "fulfilled") {
        const data = categoriesRes.value.data
        const items = data.items ?? data
        setStats((prev) => ({
          ...prev,
          totalCategories: Array.isArray(items) ? items.length : 0,
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  /** 将用户转换为列表项 */
  const userItems: RecentItem[] = recentUsers.map((u) => ({
    id: u.id,
    title: u.username || u.phone || u.id,
    subtitle: new Date(u.created_at).toLocaleDateString(),
    extra: (
      <span
        className={`rounded px-2 py-0.5 text-xs ${
          u.is_active
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {u.is_active ? t("active") : t("inactive")}
      </span>
    ),
    href: "/admin/users",
  }))

  /** 将文章转换为列表项 */
  const articleItems: RecentItem[] = recentArticles.map((article) => ({
    id: article.id,
    title: article.title,
    subtitle: new Date(article.created_at).toLocaleDateString(),
    extra: (
      <span
        className={`rounded px-2 py-0.5 text-xs ${
          article.status === "published"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {article.status === "published" ? t("published") : t("draft")}
      </span>
    ),
    href: "/admin/articles",
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t("totalUsers")}
          value={stats.totalUsers}
          loading={loading}
        />
        <StatCard
          icon={BookOpen}
          label={t("totalArticles")}
          value={stats.totalArticles}
          loading={loading}
        />
        <StatCard
          icon={CheckCircle}
          label={t("publishedArticles")}
          value={stats.publishedArticles}
          loading={loading}
        />
        <StatCard
          icon={FolderOpen}
          label={t("totalCategories")}
          value={stats.totalCategories}
          loading={loading}
        />
      </div>

      {/* 最近记录 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentList
          title={t("recentUsers")}
          items={userItems}
          viewAllHref="/admin/users"
          viewAllText={t("viewAll")}
          emptyText={t("noData")}
          loading={loading}
        />
        <RecentList
          title={t("recentArticles")}
          items={articleItems}
          viewAllHref="/admin/articles"
          viewAllText={t("viewAll")}
          emptyText={t("noData")}
          loading={loading}
        />
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("quickActions")}</h2>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/admin/users" />}>
            <UserCog className="mr-2 size-4" />
            {t("manageUsers")}
          </Button>
          <Button variant="outline" render={<Link href="/admin/articles" />}>
            <FileEdit className="mr-2 size-4" />
            {t("manageArticles")}
          </Button>
          <Button variant="outline" render={<Link href="/admin/settings" />}>
            <Settings className="mr-2 size-4" />
            {t("systemSettings")}
          </Button>
        </div>
      </div>
    </div>
  )
}
