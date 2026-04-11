"use client"

/**
 * 用户仪表盘页面。
 * 展示用户统计、最近文档和快捷操作。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  FileText,
  HardDrive,
  Shield,
  Upload,
  UserCog,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import type { Document } from "@/types"
import { StatCard } from "@/components/dashboard/StatCard"
import { RecentList, type RecentItem } from "@/components/dashboard/RecentList"
import { Button } from "@/components/ui/button"

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

/** 用户仪表盘统计数据 */
interface DashboardStats {
  documentsCount: number
  storageUsed: number
}

/** 用户仪表盘页面 */
export default function DashboardPage() {
  const t = useTranslations("Dashboard")
  const { user, loading: authLoading } = useAuth()

  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    storageUsed: 0,
  })
  const [recentDocs, setRecentDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchDashboardData()
  }, [user])

  /** 获取仪表盘数据 */
  async function fetchDashboardData(): Promise<void> {
    setLoading(true)
    try {
      const docsRes = await api.get("/portal/document/list", { params: { limit: 5 } })
      const docs = docsRes.data
      const items = docs.items ?? docs
      setRecentDocs(Array.isArray(items) ? items : [])
      setStats({
        documentsCount: docs.total ?? (Array.isArray(items) ? items.length : 0),
        storageUsed: Array.isArray(items)
          ? items.reduce(
              (sum: number, d: Document) => sum + (d.file_size || 0),
              0,
            )
          : 0,
      })
    } catch {
      /* 忽略 */
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("loginRequired")}</p>
      </div>
    )
  }

  /** 将文档转换为列表项 */
  const docItems: RecentItem[] = recentDocs.map((doc) => ({
    id: doc.id,
    title: doc.filename,
    subtitle: formatBytes(doc.file_size),
    extra: (
      <span className="rounded bg-muted px-2 py-0.5 text-xs">
        {doc.category}
      </span>
    ),
    href: "/user-center/documents",
  }))

  /** 角色标签 */
  const roleLabel = user.role_name || t("normalUser")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: user.username || user.phone || "" })}
      </h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={FileText}
          label={t("documents")}
          value={stats.documentsCount}
          loading={loading}
        />
        <StatCard
          icon={HardDrive}
          label={t("storage")}
          value={`${formatBytes(stats.storageUsed)} / ${formatBytes(user.storage_quota)}`}
          loading={loading}
        />
        <StatCard
          icon={Shield}
          label={t("accountType")}
          value={roleLabel}
          loading={loading}
        />
      </div>

      {/* 最近文档 */}
      <RecentList
        title={t("recentDocuments")}
        items={docItems}
        viewAllHref="/user-center/documents"
        viewAllText={t("viewAll")}
        emptyText={t("noData")}
        loading={loading}
      />

      {/* 快捷操作 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("quickActions")}</h2>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/user-center/documents" />}>
            <Upload className="mr-2 size-4" />
            {t("uploadDocument")}
          </Button>
          <Button variant="outline" render={<Link href="/user-center/profile" />}>
            <UserCog className="mr-2 size-4" />
            {t("editProfile")}
          </Button>
        </div>
      </div>
    </div>
  )
}
