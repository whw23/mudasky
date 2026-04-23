"use client"

/**
 * HTML 源码编辑器组件。
 * 提供等宽字体文本区域用于直接编辑 HTML 源码。
 */

interface HtmlSourceEditorProps {
  /** 当前 HTML 源码 */
  value: string
  /** 源码变更回调 */
  onChange: (html: string) => void
}

/** HTML 源码编辑器 */
export function HtmlSourceEditor({ value, onChange }: HtmlSourceEditorProps) {
  return (
    <textarea
      className="size-full min-h-[300px] flex-1 resize-none bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  )
}
