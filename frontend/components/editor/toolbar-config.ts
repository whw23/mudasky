/**
 * 编辑器工具栏按钮配置。
 * 定义所有工具栏按钮的图标、操作和激活状态。
 */

import type { LucideIcon } from "lucide-react"
import {
  Undo2, Redo2, Heading1, Heading2, Heading3, Heading4,
  Bold, Italic, Underline, Strikethrough, Palette, Highlighter,
  List, ListOrdered, ListTodo, Quote, SquareCode, Minus,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript, Link2, ImagePlus, Video, Table2,
} from "lucide-react"

/** 宽松编辑器类型，兼容 pnpm 严格提升下扩展命令类型丢失 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any

/** 工具栏按钮定义 */
export interface ToolbarButton {
  key: string
  icon: LucideIcon
  action?: () => void
  active?: boolean
  type?: "color"
  colorKind?: "textColor" | "highlight"
}

/** 工具栏按钮分组 */
export interface ToolbarGroup {
  buttons: ToolbarButton[]
}

/** 构建第一行工具栏按钮分组（左侧部分） */
export function getRow1Groups(editor: Editor): ToolbarGroup[] {
  return [
    {
      buttons: [
        {
          key: "undo",
          icon: Undo2,
          action: () => editor.chain().focus().undo().run(),
        },
        {
          key: "redo",
          icon: Redo2,
          action: () => editor.chain().focus().redo().run(),
        },
      ],
    },
    {
      buttons: [
        {
          key: "heading1",
          icon: Heading1,
          action: () =>
            editor.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor.isActive("heading", { level: 1 }),
        },
        {
          key: "heading2",
          icon: Heading2,
          action: () =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive("heading", { level: 2 }),
        },
        {
          key: "heading3",
          icon: Heading3,
          action: () =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
          active: editor.isActive("heading", { level: 3 }),
        },
        {
          key: "heading4",
          icon: Heading4,
          action: () =>
            editor.chain().focus().toggleHeading({ level: 4 }).run(),
          active: editor.isActive("heading", { level: 4 }),
        },
      ],
    },
    {
      buttons: [
        {
          key: "bold",
          icon: Bold,
          action: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
        },
        {
          key: "italic",
          icon: Italic,
          action: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive("italic"),
        },
        {
          key: "underline",
          icon: Underline,
          action: () => editor.chain().focus().toggleUnderline().run(),
          active: editor.isActive("underline"),
        },
        {
          key: "strikethrough",
          icon: Strikethrough,
          action: () => editor.chain().focus().toggleStrike().run(),
          active: editor.isActive("strike"),
        },
      ],
    },
    {
      buttons: [
        {
          key: "textColor",
          icon: Palette,
          type: "color",
          colorKind: "textColor",
        },
        {
          key: "highlight",
          icon: Highlighter,
          type: "color",
          colorKind: "highlight",
        },
      ],
    },
  ]
}

/** 构建第二行工具栏按钮分组 */
export function getRow2Groups(
  editor: Editor,
  callbacks: {
    onImageSelect: () => void
    onVideoInsert: () => void
  },
): ToolbarGroup[] {
  return [
    {
      buttons: [
        {
          key: "bulletList",
          icon: List,
          action: () =>
            editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive("bulletList"),
        },
        {
          key: "orderedList",
          icon: ListOrdered,
          action: () =>
            editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive("orderedList"),
        },
        {
          key: "taskList",
          icon: ListTodo,
          action: () =>
            editor.chain().focus().toggleTaskList().run(),
          active: editor.isActive("taskList"),
        },
      ],
    },
    {
      buttons: [
        {
          key: "quote",
          icon: Quote,
          action: () =>
            editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive("blockquote"),
        },
        {
          key: "codeBlock",
          icon: SquareCode,
          action: () =>
            editor.chain().focus().toggleCodeBlock().run(),
          active: editor.isActive("codeBlock"),
        },
        {
          key: "horizontalRule",
          icon: Minus,
          action: () =>
            editor.chain().focus().setHorizontalRule().run(),
        },
      ],
    },
    {
      buttons: [
        {
          key: "alignLeft",
          icon: AlignLeft,
          action: () =>
            editor.chain().focus().setTextAlign("left").run(),
          active: editor.isActive({ textAlign: "left" }),
        },
        {
          key: "alignCenter",
          icon: AlignCenter,
          action: () =>
            editor.chain().focus().setTextAlign("center").run(),
          active: editor.isActive({ textAlign: "center" }),
        },
        {
          key: "alignRight",
          icon: AlignRight,
          action: () =>
            editor.chain().focus().setTextAlign("right").run(),
          active: editor.isActive({ textAlign: "right" }),
        },
        {
          key: "alignJustify",
          icon: AlignJustify,
          action: () =>
            editor.chain().focus().setTextAlign("justify").run(),
          active: editor.isActive({ textAlign: "justify" }),
        },
      ],
    },
    {
      buttons: [
        {
          key: "superscript",
          icon: Superscript,
          action: () =>
            editor.chain().focus().toggleSuperscript().run(),
          active: editor.isActive("superscript"),
        },
        {
          key: "subscript",
          icon: Subscript,
          action: () =>
            editor.chain().focus().toggleSubscript().run(),
          active: editor.isActive("subscript"),
        },
      ],
    },
    {
      buttons: [
        {
          key: "insertLink",
          icon: Link2,
          action: () => {
            const url = window.prompt("请输入链接地址")
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          },
          active: editor.isActive("link"),
        },
        {
          key: "insertImage",
          icon: ImagePlus,
          action: callbacks.onImageSelect,
        },
        {
          key: "insertVideo",
          icon: Video,
          action: callbacks.onVideoInsert,
        },
        {
          key: "insertTable",
          icon: Table2,
          action: () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
        },
      ],
    },
  ]
}
