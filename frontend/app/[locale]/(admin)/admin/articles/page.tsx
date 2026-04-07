import { getTranslations } from "next-intl/server"

/** 文章管理页面 */
export default async function AdminArticlesPage() {
  const t = await getTranslations("Admin")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("articleManagement")}</h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
