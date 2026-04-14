"use client"

/**
 * 联系人详情行内展开面板。
 * 在联系人表格中展开显示，提供标记状态、添加备注、查看历史、升级学生等操作。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import api from "@/lib/api"
import { getApiError } from "@/lib/api-error"
import type { User, ContactRecord } from "@/types"

/** 联系人用户（包含联系状态和备注字段） */
type ContactUser = User & {
  contact_status: string | null
  contact_note: string | null
}

interface ContactExpandPanelProps {
  userId: string
  onUpdate: () => void
}

/** 联系状态选项 */
const CONTACT_STATUS_OPTIONS = [
  { value: "new", label: "新" },
  { value: "contacted", label: "已联系" },
  { value: "interested", label: "有意向" },
  { value: "not_interested", label: "无意向" },
] as const

/** 联系状态中文映射 */
const STATUS_LABELS: Record<string, string> = {
  new: "新",
  contacted: "已联系",
  interested: "有意向",
  not_interested: "无意向",
}

/** 操作类型中文映射 */
const ACTION_LABELS: Record<string, string> = {
  mark_status: "标记状态",
  add_note: "添加备注",
  upgrade: "升级为学生",
}

/** 联系人详情行内展开面板 */
export function ContactExpandPanel({ userId, onUpdate }: ContactExpandPanelProps) {
  const tErr = useTranslations("ApiErrors")

  const [user, setUser] = useState<ContactUser | null>(null)
  const [selectedStatus, setSelectedStatus] = useState("")
  const [noteText, setNoteText] = useState("")
  const [history, setHistory] = useState<ContactRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  /** 加载联系人详情 */
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get<ContactUser>(
        "/admin/contacts/list/detail",
        { params: { user_id: userId } },
      )
      setUser(data)
      setSelectedStatus(data.contact_status ?? "new")
    } catch {
      toast.error("加载联系人详情失败")
    }
  }, [userId])

  /** 加载联系历史 */
  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await api.get<ContactRecord[]>(
        "/admin/contacts/list/detail/history",
        { params: { user_id: userId } },
      )
      setHistory(data)
    } catch {
      /* 忽略 */
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
    fetchHistory()
  }, [fetchUser, fetchHistory])

  /** 通用操作包装 */
  async function runAction(action: () => Promise<void>, successMsg: string): Promise<void> {
    setSaving(true)
    try {
      await action()
      toast.success(successMsg)
      onUpdate()
    } catch (err) {
      toast.error(getApiError(err, tErr, "操作失败"))
    } finally {
      setSaving(false)
    }
  }

  /** 标记联系状态 */
  function handleMarkStatus(): void {
    runAction(
      () => api.post("/admin/contacts/list/detail/mark", {
        user_id: userId,
        contact_status: selectedStatus,
      }),
      "状态已更新",
    )
  }

  /** 添加备注 */
  function handleAddNote(): void {
    if (!noteText.trim()) {
      toast.error("请输入备注内容")
      return
    }
    runAction(
      async () => {
        await api.post("/admin/contacts/list/detail/note", {
          user_id: userId,
          note: noteText.trim(),
        })
        setNoteText("")
      },
      "备注已添加",
    )
  }

  /** 升级为学生 */
  async function handleUpgrade(): Promise<void> {
    setSaving(true)
    try {
      await api.post("/admin/contacts/list/detail/upgrade", { user_id: userId })
      toast.success("已升级为学生")
      setShowUpgradeDialog(false)
      onUpdate()
    } catch (err) {
      toast.error(getApiError(err, tErr, "操作失败"))
    } finally {
      setSaving(false)
    }
  }

  /** 格式化日期时间 */
  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString()
  }

  if (!user) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        加载中...
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* 基本信息 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            基本信息
          </h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">用户名</span>
            <span>{user.username ?? "-"}</span>
            <span className="text-muted-foreground">手机号</span>
            <span>{user.phone ?? "-"}</span>
            <span className="text-muted-foreground">联系状态</span>
            <span>{STATUS_LABELS[user.contact_status ?? "new"] ?? "新"}</span>
            <span className="text-muted-foreground">创建时间</span>
            <span>{formatDateTime(user.created_at)}</span>
          </div>
        </section>

        {/* 标记状态 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            标记状态
          </h3>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CONTACT_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={saving} onClick={handleMarkStatus}>
            保存
          </Button>
        </section>

        {/* 添加备注 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            添加备注
          </h3>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="请输入备注..."
            rows={3}
          />
          <Button size="sm" disabled={saving} onClick={handleAddNote}>
            保存
          </Button>
        </section>

        {/* 升级为学生 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            升级为学生
          </h3>
          <p className="text-xs text-muted-foreground">将此联系人升级为正式学生账号</p>
          <Button
            variant="default"
            size="sm"
            disabled={saving}
            onClick={() => setShowUpgradeDialog(true)}
          >
            升级为学生
          </Button>
        </section>
      </div>

      <Separator />

      {/* 联系历史 */}
      <div className="px-4 py-5">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">
          联系历史
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无历史记录</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ACTION_LABELS[record.action] ?? record.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(record.created_at)}
                  </span>
                </div>
                {record.note && (
                  <p className="mt-1 text-muted-foreground">{record.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 升级确认弹窗 */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认升级</AlertDialogTitle>
            <AlertDialogDescription>确定要将此联系人升级为正式学生账号吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgrade}
              disabled={saving}
            >
              确认升级
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
