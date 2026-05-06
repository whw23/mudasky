"use client"

/**
 * 文章内容渲染组件。
 * 根据 content_type 选择渲染方式：SafeHtml 或 PDF 预览。
 */

import dynamic from "next/dynamic"
import { SafeHtml } from "@/components/common/SafeHtml"
import "./article-content.css"

const PdfViewer = dynamic(
  () => import("./PdfViewer").then((m) => m.PdfViewer),
  { ssr: false },
)

interface ArticleContentProps {
  contentType: string
  content: string
  fileId?: string | null
}

/** 文章内容渲染 */
export function ArticleContent({
  contentType,
  content,
  fileId,
}: ArticleContentProps) {
  if (contentType === "file" && fileId) {
    return (
      <PdfViewer url={`/api/public/images/detail?id=${fileId}`} />
    )
  }

  return (
    <SafeHtml
      html={content}
      className="article-content prose max-w-none prose-headings:font-bold prose-a:text-primary"
    />
  )
}
