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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

/** 联系状态选项值 */
const CONTACT_STATUS_VALUES = ["new", "contacted", "interested", "not_interested"] as const

/** 联系状态 → 翻译键后缀映射 */
const STATUS_KEY_MAP: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "NotInterested",
}

/** 操作类型 → 翻译键映射 */
const ACTION_KEY_MAP: Record<string, string> = {
  mark_status: "actionMarkStatus",
  add_note: "actionAddNote",
  upgrade: "actionUpgrade",
}

/** 联系人详情行内展开面板 */
export function ContactExpandPanel({ userId, onUpdate }: ContactExpandPanelProps) {
  const t = useTranslations("AdminContacts")
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
      toast.error(t("fetchError"))
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
      toast.error(getApiError(err, tErr, t("operationError")))
    } finally {
      setSaving(false)
    }
  }

  /** 标记联系状态 */
  function handleMarkStatus(): void {
    runAction(
      () => api.post("/admin/contacts/list/detail/mark", {
        user_id: userId,
        status: selectedStatus,
      }),
      t("statusUpdated"),
    )
  }

  /** 添加备注 */
  function handleAddNote(): void {
    if (!noteText.trim()) {
      toast.error(t("noteRequired"))
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
      t("noteAdded"),
    )
  }

  /** 升级为学生 */
  async function handleUpgrade(): Promise<void> {
    setSaving(true)
    try {
      await api.post("/admin/contacts/list/detail/upgrade", { user_id: userId })
      toast.success(t("upgradeSuccess"))
      setShowUpgradeDialog(false)
      onUpdate()
    } catch (err) {
      toast.error(getApiError(err, tErr, t("operationError")))
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
        {t("loading")}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* 基本信息 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {t("basicInfo")}
          </h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("col_username")}</span>
            <span>{user.username ?? "-"}</span>
            <span className="text-muted-foreground">{t("col_phone")}</span>
            <span>{user.phone ?? "-"}</span>
            <span className="text-muted-foreground">{t("col_contactStatus")}</span>
            <span>{t(`status${STATUS_KEY_MAP[user.contact_status ?? "new"] ?? "New"}`)}</span>
            <span className="text-muted-foreground">{t("col_createdAt")}</span>
            <span>{formatDateTime(user.created_at)}</span>
          </div>
        </section>

        {/* 标记状态 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {t("markStatus")}
          </h3>
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v ?? "new")}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) => {
                  const key = STATUS_KEY_MAP[value ?? "new"] ?? "New"
                  return t(`status${key}`)
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CONTACT_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`status${STATUS_KEY_MAP[value]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={saving} onClick={handleMarkStatus}>
            {t("save")}
          </Button>
        </section>

        {/* 添加备注 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {t("addNote")}
          </h3>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={3}
          />
          <Button size="sm" disabled={saving} onClick={handleAddNote}>
            {t("save")}
          </Button>
        </section>

        {/* 升级为学生 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {t("upgradeToStudent")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("upgradeToStudentDesc")}</p>
          <Button
            variant="default"
            size="sm"
            disabled={saving}
            onClick={() => setShowUpgradeDialog(true)}
          >
            {t("upgradeToStudent")}
          </Button>
        </section>
      </div>

      <Separator />

      {/* 联系历史 */}
      <div className="px-4 py-5">
        <h3 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">
          {t("contactHistory")}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ACTION_KEY_MAP[record.action] ? t(ACTION_KEY_MAP[record.action]) : record.action}</span>
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
            <AlertDialogTitle>{t("confirmUpgradeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmUpgradeDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgrade}
              disabled={saving}
            >
              {t("confirmUpgrade")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
