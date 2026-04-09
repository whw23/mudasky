"use client"

/**
 * 用户管理列表组件。
 * 包含搜索、类型筛选、表格和分页。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/common/Pagination"
import api from "@/lib/api"
import type { User, PaginatedResponse } from "@/types"

interface UserTableProps {
  onSelectUser: (userId: string) => void
  refreshKey: number
}

/** 用户管理列表 */
export function UserTable({ onSelectUser, refreshKey }: UserTableProps) {
  const t = useTranslations("AdminUsers")

  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(false)

  /** 搜索防抖 */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  /** 搜索变化时重置页码 */
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  /** 获取用户列表 */
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 20 }
      if (debouncedSearch) params.search = debouncedSearch
      const { data } = await api.get<PaginatedResponse<User>>("/admin/users", { params })
      setUsers(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers, refreshKey])

  /** 格式化日期 */
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* 搜索 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("col_username")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_phone")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_role")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                  onClick={() => onSelectUser(user.id)}
                >
                  <td className="px-4 py-3">{user.username ?? "-"}</td>
                  <td className="px-4 py-3">{user.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        user.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {t(user.is_active ? "status_active" : "status_inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.role_name ? (
                      <span className="text-xs text-muted-foreground">
                        {user.role_name}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("totalCount", { count: total })}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
