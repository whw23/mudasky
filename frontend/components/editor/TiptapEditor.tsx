"use client"

/**
 * Tiptap 富文本编辑器
 * 包含工具栏和编辑区域
 */

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { useTranslations } from "next-intl"
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TiptapEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
}

/** 编辑器工具栏 */
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const t = useTranslations("Editor")

  if (!editor) return null

  /** 工具栏按钮配置 */
  const buttons = [
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      label: t("heading2"),
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
      label: t("heading3"),
    },
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: t("bold"),
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: t("italic"),
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      label: t("bulletList"),
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      label: t("orderedList"),
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
      label: t("quote"),
    },
  ]

  /** 插入图片 */
  const insertImage = () => {
    const url = window.prompt(t("imagePrompt"))
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  /** 插入链接 */
  const insertLink = () => {
    const url = window.prompt(t("linkPrompt"))
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      {buttons.map((btn) => {
        const Icon = btn.icon
        return (
          <Button
            key={btn.label}
            type="button"
            variant={btn.active ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={btn.action}
            title={btn.label}
          >
            <Icon className="size-4" />
          </Button>
        )
      })}

      {/* 分隔线 */}
      <div className="mx-1 w-px self-stretch bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={insertImage}
        title={t("insertImage")}
      >
        <ImageIcon className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={insertLink}
        title={t("insertLink")}
      >
        <LinkIcon className="size-4" />
      </Button>
    </div>
  )
}

export function TiptapEditor({
  content,
  onChange,
  placeholder,
}: TiptapEditorProps) {
  const t = useTranslations("Editor")

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: placeholder ?? t("placeholder"),
      }),
    ],
    content: content ?? "",
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-lg border">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4 [&_.tiptap]:min-h-[300px] [&_.tiptap]:outline-none"
      />
    </div>
  )
}
