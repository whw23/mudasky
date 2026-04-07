import { getTranslations } from "next-intl/server"

/** 我的文章页面 */
export default async function UserArticlesPage() {
  const t = await getTranslations("User")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("myArticles")}</h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
