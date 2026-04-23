"use client"

/**
 * 编辑器工具栏组件。
 * 两行布局，包含格式化、对齐、插入等全部编辑功能按钮。
 */

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { Code2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getRow1Groups,
  getRow2Groups,
  type ToolbarGroup,
} from "./toolbar-config"

/** 编辑模式类型 */
export type EditorMode = "edit" | "source" | "preview"

interface EditorToolbarProps {
  /** 编辑器实例（宽松类型，兼容 pnpm 严格提升） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any
  /** 当前编辑模式 */
  mode: EditorMode
  /** 模式切换回调 */
  onModeChange: (mode: EditorMode) => void
  /** 图片选择回调 */
  onImageSelect: () => void
  /** 视频插入回调 */
  onVideoInsert: () => void
}

/** 渲染一组工具栏按钮 */
function ToolbarButtonGroup({
  group,
  disabled,
  t,
  onColorChange,
}: {
  group: ToolbarGroup
  disabled: boolean
  t: (key: string) => string
  onColorChange: (kind: "textColor" | "highlight", color: string) => void
}) {
  const textColorRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {group.buttons.map((btn) => {
        const Icon = btn.icon

        if (btn.type === "color") {
          const ref =
            btn.colorKind === "textColor" ? textColorRef : highlightRef
          return (
            <span key={btn.key} className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => ref.current?.click()}
                title={t(btn.key)}
              >
                <Icon className="size-4" />
              </Button>
              <input
                ref={ref}
                type="color"
                className="invisible absolute left-0 top-0 size-0"
                onChange={(e) =>
                  onColorChange(btn.colorKind!, e.target.value)
                }
              />
            </span>
          )
        }

        return (
          <Button
            key={btn.key}
            type="button"
            variant={btn.active ? "secondary" : "ghost"}
            size="icon-sm"
            disabled={disabled}
            onClick={btn.action}
            title={t(btn.key)}
          >
            <Icon className="size-4" />
          </Button>
        )
      })}
    </>
  )
}

/** 分隔线 */
function Separator() {
  return <div className="mx-1 w-px self-stretch bg-border" />
}

/** 编辑器工具栏 */
export function EditorToolbar({
  editor,
  mode,
  onModeChange,
  onImageSelect,
  onVideoInsert,
}: EditorToolbarProps) {
  const t = useTranslations("Editor")

  const buttonsDisabled = mode !== "edit" || !editor

  /** 处理颜色选择 */
  const handleColorChange = (
    kind: "textColor" | "highlight",
    color: string,
  ) => {
    if (!editor) return
    if (kind === "textColor") {
      editor.chain().focus().setColor(color).run()
    } else {
      editor.chain().focus().toggleHighlight({ color }).run()
    }
  }

  const row1Groups = editor
    ? getRow1Groups(editor)
    : []
  const row2Groups = editor
    ? getRow2Groups(editor, { onImageSelect, onVideoInsert })
    : []

  return (
    <div className="border-b">
      {/* 第一行 */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex flex-wrap items-center gap-0.5">
          {row1Groups.map((group, gi) => (
            <span key={gi} className="flex items-center">
              {gi > 0 && <Separator />}
              <ToolbarButtonGroup
                group={group}
                disabled={buttonsDisabled}
                t={t}
                onColorChange={handleColorChange}
              />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={mode === "source" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() =>
              onModeChange(mode === "source" ? "edit" : "source")
            }
            title={t("sourceCode")}
          >
            <Code2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() =>
              onModeChange(mode === "preview" ? "edit" : "preview")
            }
            title={t("preview")}
          >
            <Eye className="size-4" />
          </Button>
        </div>
      </div>

      {/* 第二行 */}
      <div className="flex flex-wrap items-center gap-0.5 border-t px-2 py-1">
        {row2Groups.map((group, gi) => (
          <span key={gi} className="flex items-center">
            {gi > 0 && <Separator />}
            <ToolbarButtonGroup
              group={group}
              disabled={buttonsDisabled}
              t={t}
              onColorChange={handleColorChange}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
