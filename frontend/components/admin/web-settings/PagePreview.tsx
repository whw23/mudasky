"use client"

/**
 * 页面预览容器组件。
 * 委托 PageBlocksPreview 统一渲染所有页面的预览和编辑。
 */

import { PageBlocksPreview } from "./PageBlocksPreview"

interface PagePreviewProps {
  activePage: string
  onEditConfig: (section: string) => void
  onBannerEdit: (pageKey: string) => void
}

/** 页面预览路由 */
export function PagePreview({ activePage, onEditConfig, onBannerEdit }: PagePreviewProps) {
  return (
    <PageBlocksPreview
      pageSlug={activePage}
      onBannerEdit={onBannerEdit}
      onEditConfig={onEditConfig}
    />
  )
}
