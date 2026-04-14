"use client"

/**
 * 学生管理列表组件。
 * 包含顾问筛选、表格、分页和行内展开面板。
 */

import { Fragment, useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/common/Pagination"
import { StudentExpandPanel } from "./StudentExpandPanel"
import { usePathname } from "@/i18n/navigation"
import api from "@/lib/api"
import type { Student, PaginatedResponse } from "@/types"

/** 学生管理列表 */
export function StudentTable() {
  const t = useTranslations("AdminStudents")
  const pathname = usePathname()

  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [filterAdvisor, setFilterAdvisor] = useState("")
  const [myStudents, setMyStudents] = useState(true)
  const [loading, setLoading] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  /** 筛选变化时重置页码 */
  useEffect(() => {
    setPage(1)
  }, [filterAdvisor, myStudents])

  /** 获取学生列表 */
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number | boolean> = {
        page,
        page_size: 20,
        my_students: myStudents,
      }
      if (filterAdvisor) params.advisor_id = filterAdvisor
      const { data } = await api.get<PaginatedResponse<Student>>(
        `${pathname}/list`,
        { params },
      )
      setStudents(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [page, filterAdvisor, myStudents, pathname])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  /** 格式化日期 */
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString()
  }

  /** 点击行切换展开 */
  function toggleExpand(userId: string): void {
    setExpandedUserId((prev) => (prev === userId ? null : userId))
  }

  /** 操作后刷新列表 */
  function handleUpdate(): void {
    setExpandedUserId(null)
    fetchStudents()
  }

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={myStudents}
            onChange={(e) => setMyStudents(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          {t("myStudentsOnly")}
        </label>
        <Input
          placeholder={t("advisorIdPlaceholder")}
          value={filterAdvisor}
          onChange={(e) => setFilterAdvisor(e.target.value)}
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
              <th className="px-4 py-3 text-left font-medium">{t("col_contactStatus")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_advisorId")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("loading")}
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <Fragment key={student.id}>
                  <tr
                    className={`cursor-pointer border-b transition-colors hover:bg-muted/30 ${
                      expandedUserId === student.id ? "bg-muted/20" : ""
                    }`}
                    onClick={() => toggleExpand(student.id)}
                  >
                    <td className="px-4 py-3">{student.username ?? "-"}</td>
                    <td className="px-4 py-3">{student.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          student.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {t(student.is_active ? "status_active" : "status_inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.contact_status ? (
                        <span className="text-xs text-muted-foreground">
                          {student.contact_status}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {student.advisor_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(student.created_at)}
                    </td>
                  </tr>
                  {expandedUserId === student.id && (
                    <tr key={`${student.id}-expand`}>
                      <td colSpan={6} className="border-b bg-muted/10 p-0">
                        <StudentExpandPanel
                          userId={student.id}
                          onUpdate={handleUpdate}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
