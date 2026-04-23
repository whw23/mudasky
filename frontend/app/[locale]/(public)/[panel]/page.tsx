import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { notFound } from "next/navigation"

/** 预设和面板 slug，避免与静态路由冲突 */
const RESERVED_SLUGS = new Set([
  "universities", "study-abroad", "requirements",
  "cases", "visa", "life", "news", "about",
  "admin", "portal",
])

interface Props {
  params: Promise<{ panel: string }>
}

/** 自定义页面动态路由 */
export default async function DynamicPage({ params }: Props) {
  const { panel: slug } = await params
  if (RESERVED_SLUGS.has(slug)) return notFound()

  const blocks = await fetchPageBlocks(slug)

  return (
    <>
      <PageBanner pageKey={slug} title={slug} />
      <PageBlocksRenderer pageSlug={slug} initialBlocks={blocks} />
    </>
  )
}
