/**
 * 官网底部组件。
 * 浅色毛玻璃风格，四栏布局（桌面），移动端堆叠。
 * 栏目：品牌简介+联系方式、快速链接、服务项目、微信二维码。
 * 底部版权栏 + ICP 备案信息。
 */

"use client"

import { Phone, Mail } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useConfig } from "@/contexts/ConfigContext"

/** 快速链接：导航键 + 路径 */
const QUICK_LINKS = [
  { key: "about", href: "/about" },
  { key: "studyAbroad", href: "/study-abroad" },
  { key: "universities", href: "/universities" },
  { key: "cases", href: "/cases" },
  { key: "contact", href: "/contact" },
] as const

/** 服务项目：导航键 + 路径 */
const SERVICE_LINKS = [
  { key: "visa", href: "/visa" },
  { key: "life", href: "/life" },
  { key: "requirements", href: "/requirements" },
  { key: "news", href: "/news" },
] as const

export function Footer() {
  const t = useTranslations("Footer")
  const tNav = useTranslations("Nav")
  const { contactInfo, siteInfo } = useConfig()

  return (
    <footer className="border-t border-border/40 bg-muted/50">
      {/* 主体四栏 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* 栏 1：品牌简介 + 联系方式 */}
        <div className="sm:col-span-2 lg:col-span-1">
          <h3 className="mb-3 text-lg font-bold tracking-wide text-foreground">
            {siteInfo.brand_name || t("brandName")}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" />
              <span>{contactInfo.phone || t("phone")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" />
              <span>{contactInfo.email || t("email")}</span>
            </li>
          </ul>
        </div>

        {/* 栏 2：快速链接 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
            {t("quickLinks")}
          </h3>
          <ul className="space-y-2">
            {QUICK_LINKS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 栏 3：服务项目 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
            {t("services")}
          </h3>
          <ul className="space-y-2">
            {SERVICE_LINKS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 栏 4：微信公众号二维码 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
            {t("followUs")}
          </h3>
          {siteInfo.wechat_qr_url ? (
            <img
              src={siteInfo.wechat_qr_url}
              alt={t("wechatQr")}
              className="h-28 w-28 rounded-lg border border-border bg-background object-contain"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-border bg-background text-xs text-muted-foreground">
              {t("qrPlaceholder")}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {t("wechatQr")}
          </p>
        </div>
      </div>

      {/* 底部版权栏 */}
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        {t("copyright")} | {siteInfo.icp_filing || t("icp")}
      </div>
    </footer>
  )
}
