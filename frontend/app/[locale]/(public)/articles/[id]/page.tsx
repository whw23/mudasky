import { getTranslations } from "next-intl/server"

/** 文章详情页面 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations("Pages")
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-bold">{t("articleDetail")}</h1>
      <p className="text-muted-foreground">{t("articleId", { id })}</p>
    </section>
  )
}
