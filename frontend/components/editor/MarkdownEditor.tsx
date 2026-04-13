"use client"

/**
 * Markdown 编辑器。
 * 支持源码编辑 / 实时预览 / 分屏三种模式。
 */

import { useState } from "react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { Code, Eye, Columns } from "lucide-react"
import { Button } from "@/components/ui/button"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

type EditorMode = "edit" | "preview" | "live"

interface MarkdownEditorProps {
  content?: string
  onChange?: (md: string) => void
  placeholder?: string
}

/** Markdown 编辑器 */
export function MarkdownEditor({
  content = "",
  onChange,
  placeholder,
}: MarkdownEditorProps) {
  const t = useTranslations("Editor")
  const [mode, setMode] = useState<EditorMode>("live")

  /** 模式映射到 @uiw/react-md-editor 的 preview 值 */
  const previewMap: Record<EditorMode, "edit" | "preview" | "live"> = {
    edit: "edit",
    preview: "preview",
    live: "live",
  }

  return (
    <div className="overflow-hidden rounded-lg border" data-color-mode="light">
      {/* 模式切换工具栏 */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1">
        <Button
          type="button"
          variant={mode === "edit" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setMode("edit")}
        >
          <Code className="size-3.5" />
          {t("markdownSource")}
        </Button>
        <Button
          type="button"
          variant={mode === "live" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setMode("live")}
        >
          <Columns className="size-3.5" />
          {t("markdownSplit")}
        </Button>
        <Button
          type="button"
          variant={mode === "preview" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setMode("preview")}
        >
          <Eye className="size-3.5" />
          {t("markdownPreview")}
        </Button>
      </div>

      <MDEditor
        value={content}
        onChange={(val) => onChange?.(val || "")}
        preview={previewMap[mode]}
        hideToolbar
        visibleDragbar={false}
        height={400}
        textareaProps={{ placeholder: placeholder ?? t("placeholder") }}
      />
    </div>
  )
}
