import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 新闻详情页 */
export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/news"
      bannerTitle={p("articleDetail")}
      bannerSubtitle={p("newsSubtitle")}
    />
  )
}
