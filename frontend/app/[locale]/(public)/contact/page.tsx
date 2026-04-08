import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
} from "lucide-react"

/** 联系我们页面 */
export default async function ContactPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Contact")

  const infoItems = [
    {
      icon: MapPin,
      label: t("addressLabel"),
      value: t("address"),
    },
    {
      icon: Phone,
      label: t("phoneLabel"),
      value: t("phone"),
    },
    {
      icon: Mail,
      label: t("emailLabel"),
      value: t("email"),
    },
    {
      icon: MessageCircle,
      label: t("wechatLabel"),
      value: t("wechat"),
    },
    {
      icon: Clock,
      label: t("hoursLabel"),
      value: t("hours"),
    },
  ]

  return (
    <>
      <Banner title={p("contact")} subtitle={p("contactSubtitle")} />

      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* 左侧：联系信息 */}
          <div>
            <h2 className="text-2xl font-bold">{t("infoTitle")}</h2>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary lg:mx-0" />
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("infoDesc")}
            </p>
            <div className="mt-8 space-y-5">
              {infoItems.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 地图占位 */}
            <div className="mt-8 flex h-48 items-center justify-center rounded-lg border-2 border-dashed bg-gray-50">
              <div className="text-center text-muted-foreground">
                <MapPin className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">{t("mapPlaceholder")}</p>
              </div>
            </div>
          </div>

          {/* 右侧：联系表单 */}
          <div>
            <h2 className="text-2xl font-bold">{t("formTitle")}</h2>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary lg:mx-0" />
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("formDesc")}
            </p>
            <form className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-medium">{t("nameLabel")}</label>
                <input
                  type="text"
                  placeholder={t("namePlaceholder")}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("emailFormLabel")}</label>
                <input
                  type="email"
                  placeholder={t("emailFormPlaceholder")}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("phoneFormLabel")}</label>
                <input
                  type="tel"
                  placeholder={t("phoneFormPlaceholder")}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("messageLabel")}</label>
                <textarea
                  rows={5}
                  placeholder={t("messagePlaceholder")}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                {t("submitButton")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
