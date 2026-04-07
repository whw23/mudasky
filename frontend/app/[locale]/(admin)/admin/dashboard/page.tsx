import { getTranslations } from "next-intl/server"

/** 管理后台仪表盘页面 */
export default async function AdminDashboardPage() {
  const t = await getTranslations("Admin")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("dashboard")}</h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
