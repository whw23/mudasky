import { getTranslations } from "next-intl/server"

/** 个人资料页面 */
export default async function ProfilePage() {
  const t = await getTranslations("User")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("profile")}</h1>
      <p className="text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
