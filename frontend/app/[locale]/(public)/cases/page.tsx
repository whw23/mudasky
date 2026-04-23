import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 成功案例页面 */
export default async function CasesPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("cases")

  return (
    <>
      <PageBanner pageKey="cases" title={p("cases")} subtitle={p("casesSubtitle")} />
      <PageBlocksRenderer pageSlug="cases" initialBlocks={blocks} />
    </>
  )
}
