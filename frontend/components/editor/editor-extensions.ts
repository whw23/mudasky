/**
 * Tiptap 编辑器扩展集中配置。
 * 统一管理所有编辑器扩展的初始化和选项。
 */

import type { Extension } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import Color from "@tiptap/extension-color"
import TextStyle from "@tiptap/extension-text-style"
import Highlight from "@tiptap/extension-highlight"
import TextAlign from "@tiptap/extension-text-align"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Superscript from "@tiptap/extension-superscript"
import Subscript from "@tiptap/extension-subscript"
import { VideoEmbed } from "./video-embed"

interface EditorExtensionsOptions {
  /** 占位文本 */
  placeholder?: string
}

/** 创建编辑器扩展列表 */
export function createEditorExtensions(
  options: EditorExtensionsOptions = {},
): Extension[] {
  const { placeholder } = options

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
    }),
    Image.configure({ inline: true }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { target: "_blank" },
    }),
    Placeholder.configure({
      placeholder: placeholder ?? "",
    }),
    Underline,
    Color,
    TextStyle,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({ nested: true }),
    Superscript,
    Subscript,
    VideoEmbed,
  ] as Extension[]
}
