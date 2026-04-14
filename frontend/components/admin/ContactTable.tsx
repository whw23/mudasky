"use client"

/**
 * 联系人管理列表组件。
 * 包含表格、分页和行内展开面板。
 */

import { Fragment, useEffect, useState, useCallback } from "react"
import { Pagination } from "@/components/common/Pagination"
import { ContactExpandPanel } from "./ContactExpandPanel"
import api from "@/lib/api"
import { usePathname } from "@/i18n/navigation"
import type { User, PaginatedResponse } from "@/types"

/** 联系人用户（包含联系状态和备注字段） */
type ContactUser = User & {
  contact_status: string | null
  contact_note: string | null
}

/** 联系状态中文映射 */
const STATUS_LABELS: Record<string, string> = {
  new: "新",
  contacted: "已联系",
  interested: "有意向",
  not_interested: "无意向",
}

/** 联系人管理列表 */
export function ContactTable() {
  const pathname = usePathname()

  const [contacts, setContacts] = useState<ContactUser[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  /** 获取联系人列表 */
  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<PaginatedResponse<ContactUser>>(
        `${pathname}/list`,
        { params: { page, page_size: 20 } },
      )
      setContacts(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [page, pathname])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

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
    fetchContacts()
  }

  /** 获取联系状态标签样式 */
  function getStatusStyle(status: string | null): string {
    switch (status) {
      case "contacted":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      case "interested":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      case "not_interested":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-4">
      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">用户名</th>
              <th className="px-4 py-3 text-left font-medium">手机号</th>
              <th className="px-4 py-3 text-left font-medium">联系状态</th>
              <th className="px-4 py-3 text-left font-medium">备注</th>
              <th className="px-4 py-3 text-left font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  暂无数据
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <Fragment key={contact.id}>
                  <tr
                    className={`cursor-pointer border-b transition-colors hover:bg-muted/30 ${
                      expandedUserId === contact.id ? "bg-muted/20" : ""
                    }`}
                    onClick={() => toggleExpand(contact.id)}
                  >
                    <td className="px-4 py-3">{contact.username ?? "-"}</td>
                    <td className="px-4 py-3">{contact.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${getStatusStyle(contact.contact_status ?? null)}`}
                      >
                        {STATUS_LABELS[contact.contact_status ?? "new"] ?? "新"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {contact.contact_note ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(contact.created_at)}
                    </td>
                  </tr>
                  {expandedUserId === contact.id && (
                    <tr key={`${contact.id}-expand`}>
                      <td colSpan={5} className="border-b bg-muted/10 p-0">
                        <ContactExpandPanel
                          userId={contact.id}
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
            {`共 ${total} 条`}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
