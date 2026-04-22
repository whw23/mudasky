"use client"

/**
 * Tiptap 富文本编辑器主组件。
 * 集成工具栏、源码编辑、预览面板、图片上传、视频嵌入等功能。
 */

import { useState, useCallback, useRef } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import { useTranslations } from "next-intl"
import { createEditorExtensions } from "./editor-extensions"
import { handleImagePaste, handleImageDrop, handleImageSelect } from "./image-upload"
import { insertVideo } from "./video-embed"
import { EditorToolbar, type EditorMode } from "./EditorToolbar"
import { HtmlSourceEditor } from "./HtmlSourceEditor"
import { EditorPreview } from "./EditorPreview"
import "./editor.css"

interface TiptapEditorProps {
  /** 初始 HTML 内容 */
  content?: string
  /** 内容变更回调 */
  onChange?: (html: string) => void
  /** 占位文本 */
  placeholder?: string
}

/** Tiptap 富文本编辑器 */
export function TiptapEditor({
  content,
  onChange,
  placeholder,
}: TiptapEditorProps) {
  const t = useTranslations("Editor")
  const [mode, setMode] = useState<EditorMode>("edit")
  const [sourceHtml, setSourceHtml] = useState("")
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions({
      placeholder: placeholder ?? t("placeholder"),
    }),
    content: content ?? "",
    onCreate: ({ editor: e }) => {
      editorRef.current = e
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
    editorProps: {
      handlePaste: (_view, event): boolean => {
        const ed = editorRef.current
        if (ed) {
          return handleImagePaste(ed, event as unknown as ClipboardEvent)
        }
        return false
      },
      handleDrop: (_view, event): boolean => {
        const ed = editorRef.current
        if (ed) {
          return handleImageDrop(ed, event as unknown as DragEvent)
        }
        return false
      },
    },
  })

  /** 处理模式切换 */
  const handleModeChange = useCallback(
    (newMode: EditorMode) => {
      if (!editor) return

      /* 从编辑模式切换到源码模式：同步 HTML */
      if (mode === "edit" && newMode === "source") {
        setSourceHtml(editor.getHTML())
      }

      /* 从源码模式切换回编辑模式：应用源码 */
      if (mode === "source" && newMode !== "source") {
        editor.commands.setContent(sourceHtml)
        onChange?.(sourceHtml)
      }

      setMode(newMode)
    },
    [editor, mode, sourceHtml, onChange],
  )

  /** 处理图片选择 */
  const handleImageSelectClick = useCallback(() => {
    if (editor) {
      handleImageSelect(editor)
    }
  }, [editor])

  /** 处理视频插入 */
  const handleVideoInsert = useCallback(() => {
    if (editor) {
      insertVideo(editor, t("videoPrompt"))
    }
  }, [editor, t])

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-lg border">
      <EditorToolbar
        editor={editor}
        mode={mode}
        onModeChange={handleModeChange}
        onImageSelect={handleImageSelectClick}
        onVideoInsert={handleVideoInsert}
      />
      <div className="flex min-h-[300px]">
        {mode === "source" ? (
          <HtmlSourceEditor value={sourceHtml} onChange={setSourceHtml} />
        ) : (
          <EditorContent
            editor={editor}
            className="flex-1 p-4 [&_.tiptap]:outline-none"
          />
        )}
        {(mode === "preview" || mode === "source") && (
          <div className="w-1/2 overflow-y-auto border-l p-4">
            <EditorPreview
              html={
                mode === "source"
                  ? sourceHtml
                  : editor.getHTML()
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
