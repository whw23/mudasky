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
  if (!editor) return null

  /** 工具栏按钮配置 */
  const buttons = [
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      label: "标题 2",
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
      label: "标题 3",
    },
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: "加粗",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: "斜体",
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      label: "无序列表",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      label: "有序列表",
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
      label: "引用",
    },
  ]

  /** 插入图片 */
  const insertImage = () => {
    const url = window.prompt("请输入图片地址")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  /** 插入链接 */
  const insertLink = () => {
    const url = window.prompt("请输入链接地址")
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
        title="插入图片"
      >
        <ImageIcon className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={insertLink}
        title="插入链接"
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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "请输入内容...",
      }),
    ],
    content: content ?? "",
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
  })

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
