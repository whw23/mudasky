"use client"

/**
 * 文章内容渲染组件。
 * 根据 content_type 选择渲染方式：SafeHtml 或 PDF 预览。
 */

import { SafeHtml } from "@/components/common/SafeHtml"

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
      <div className="space-y-4">
        <iframe
          src={`/api/public/images/detail?id=${fileId}`}
          className="w-full rounded-lg border-0"
          style={{ height: "80vh" }}
          title="PDF 预览"
        />
        <div className="text-center">
          <a
            href={`/api/public/images/detail?id=${fileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            下载 PDF
          </a>
        </div>
      </div>
    )
  }

  return (
    <SafeHtml
      html={content}
      className="prose max-w-none prose-headings:font-bold prose-a:text-primary"
    />
  )
}
