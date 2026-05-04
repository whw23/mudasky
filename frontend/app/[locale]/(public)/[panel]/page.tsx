import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks, fetchCustomNavItem } from "@/lib/page-api"
import { getLocalizedValue } from "@/lib/i18n-config"
import { notFound } from "next/navigation"

/** 预设和面板 slug，避免与静态路由冲突 */
const RESERVED_SLUGS = new Set([
  "universities", "study-abroad", "requirements",
  "cases", "visa", "life", "news", "about",
  "admin", "portal",
])

interface Props {
  params: Promise<{ locale: string; panel: string }>
}

/** 自定义页面动态路由 */
export default async function DynamicPage({ params }: Props) {
  const { locale, panel: slug } = await params
  if (RESERVED_SLUGS.has(slug)) return notFound()

  const [blocks, navItem] = await Promise.all([
    fetchPageBlocks(slug),
    fetchCustomNavItem(slug),
  ])

  const title = navItem ? getLocalizedValue(navItem.name, locale) || slug : slug
  const subtitle = navItem && typeof navItem.name === "object" ? navItem.name.en || "" : ""

  return (
    <>
      <PageBanner pageKey={slug} title={title} subtitle={subtitle} />
      <PageBlocksRenderer pageSlug={slug} initialBlocks={blocks} />
    </>
  )
}
