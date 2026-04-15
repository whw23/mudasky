import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 签证办理文章详情页 */
export default async function VisaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/visa"
      bannerTitle={p("visa")}
      bannerSubtitle={p("visaSubtitle")}
    />
  )
}
