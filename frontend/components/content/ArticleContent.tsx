"use client"

/**
 * 文章内容渲染组件。
 * 根据 content_type 选择渲染方式：Markdown 或文件预览。
 */

import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ArticleContentProps {
  contentType: string
  content: string
  fileUrl: string | null
  title: string
}

/** 文件扩展名判断 */
function getFileType(url: string): "pdf" | "office" | "unknown" {
  const ext = url.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") return "pdf"
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "office"
  return "unknown"
}

/** 文章内容渲染 */
export function ArticleContent({ contentType, content, fileUrl, title }: ArticleContentProps) {
  if (contentType === "file" && fileUrl) {
    return <FilePreview fileUrl={fileUrl} title={title} />
  }

  return (
    <div className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-primary">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  )
}

/** 文件预览组件 */
function FilePreview({ fileUrl, title }: { fileUrl: string; title: string }) {
  const fileType = getFileType(fileUrl)

  return (
    <div className="space-y-4">
      {fileType === "pdf" ? (
        /* PDF 内嵌预览 */
        <div className="overflow-hidden rounded-lg border">
          <iframe
            src={fileUrl}
            className="h-[600px] w-full"
            title={title}
          />
        </div>
      ) : (
        /* Office 文件提示下载 */
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <FileText className="size-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            此文件需要下载后查看
          </p>
        </div>
      )}

      {/* 下载按钮 */}
      <div className="flex justify-center">
        <a href={fileUrl} download>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            下载文件
          </Button>
        </a>
      </div>
    </div>
  )
}
