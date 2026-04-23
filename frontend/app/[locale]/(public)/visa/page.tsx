import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 签证办理页面 */
export default async function VisaPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("visa")

  return (
    <>
      <PageBanner pageKey="visa" title={p("visa")} subtitle={p("visaSubtitle")} />
      <PageBlocksRenderer pageSlug="visa" initialBlocks={blocks} />
    </>
  )
}
