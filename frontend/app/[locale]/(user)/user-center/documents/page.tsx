"use client"

/**
 * 文档管理页面。
 * 展示存储用量、上传入口、分类筛选和文档列表。
 */

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentUpload } from "@/components/user/DocumentUpload"
import { DocumentList } from "@/components/user/DocumentList"

/** 所有可筛选的分类（含 "all"） */
const FILTER_CATEGORIES = [
  "all",
  "transcript",
  "certificate",
  "passport",
  "language_test",
  "application",
  "other",
] as const

/**
 * 格式化存储大小。
 * bytes -> MB / GB 显示。
 */
function formatStorage(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** 文档管理页面 */
export default function DocumentsPage() {
  const t = useTranslations("Documents")

  const [category, setCategory] = useState("all")
  const [refreshKey, setRefreshKey] = useState(0)
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageQuota, setStorageQuota] = useState(0)

  /** 上传成功后刷新列表 */
  const handleUploadSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  /** 存储用量更新回调 */
  const handleStorageUpdate = useCallback(
    (used: number, quota: number) => {
      setStorageUsed(used)
      setStorageQuota(quota)
    },
    [],
  )

  /** 计算存储使用百分比 */
  const usagePercent =
    storageQuota > 0
      ? Math.min(100, (storageUsed / storageQuota) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* 标题与上传按钮 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <DocumentUpload onSuccess={handleUploadSuccess} />
      </div>

      {/* 存储用量 */}
      {storageQuota > 0 && (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("storageUsed")}
            </span>
            <span className="font-medium">
              {formatStorage(storageUsed)} / {formatStorage(storageQuota)}
              {" "}({usagePercent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 90
                  ? "bg-red-500"
                  : usagePercent > 70
                    ? "bg-yellow-500"
                    : "bg-primary"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 分类筛选 */}
      <Tabs
        defaultValue="all"
        onValueChange={(val) => setCategory(val as string)}
      >
        <TabsList className="flex-wrap">
          {FILTER_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat === "all" ? t("allCategories") : t(cat)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 文档列表 */}
      <DocumentList
        category={category}
        refreshKey={refreshKey}
        onStorageUpdate={handleStorageUpdate}
      />
    </div>
  )
}
