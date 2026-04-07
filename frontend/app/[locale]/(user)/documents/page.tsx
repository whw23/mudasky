import { getTranslations } from "next-intl/server"

/** 文档管理页面 */
export default async function DocumentsPage() {
  const t = await getTranslations("User")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("documents")}</h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
