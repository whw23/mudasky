"use client"

/**
 * 分页组件
 * 上一页/下一页按钮 + 页码显示
 */

import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const t = useTranslations("Pagination")

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        <span className="hidden md:inline">{t("prev")}</span>
      </Button>

      <span className="px-2 md:px-3 text-xs md:text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="hidden md:inline">{t("next")}</span>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
