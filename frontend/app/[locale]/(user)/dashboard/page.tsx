import { getTranslations } from "next-intl/server"

/** 仪表盘页面 */
export default async function DashboardPage() {
  const t = await getTranslations("User")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("dashboard")}</h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
