/**
 * 官网底部组件。
 * 浅色毛玻璃风格，四栏布局（桌面），移动端堆叠。
 * 栏目：品牌简介+联系方式、快速链接、服务项目、微信二维码。
 * 底部版权栏 + ICP 备案信息。
 */

"use client"

import { useRef, useCallback } from "react"
import { Phone, Mail, Upload, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

/** 快速链接：导航键 + 路径 */
const QUICK_LINKS = [
  { key: "universities", href: "/universities" },
  { key: "studyAbroad", href: "/study-abroad" },
  { key: "cases", href: "/cases" },
  { key: "about", href: "/about" },
] as const

/** 服务项目：导航键 + 路径 */
const SERVICE_LINKS = [
  { key: "visa", href: "/visa" },
  { key: "life", href: "/life" },
  { key: "requirements", href: "/requirements" },
  { key: "news", href: "/news" },
] as const

/** 二维码槽位 */
function QrSlot({ url, label, placeholder, editable, alwaysShow, onUpload, onClear }: {
  url: string; label: string; placeholder: string
  editable?: boolean; alwaysShow?: boolean
  onUpload?: (file: File) => Promise<void>
  onClear?: () => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onUpload?.(f)
    if (fileRef.current) fileRef.current.value = ""
  }, [onUpload])

  if (!url && !editable && !alwaysShow) return null

  return (
    <div className="group relative">
      {editable && (
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      )}
      {url ? (
        <div className="relative cursor-pointer" onClick={() => editable && fileRef.current?.click()}>
          <img src={url} alt={label} className="h-28 w-28 rounded-lg border border-border bg-background object-contain" />
          {editable && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onClear?.() }}
              className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg border bg-background text-xs text-muted-foreground ${
            editable ? "cursor-pointer border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5" : "border-border"
          }`}
          onClick={() => editable && fileRef.current?.click()}
        >
          {editable ? <Upload className="size-5 text-muted-foreground" /> : null}
          {placeholder}
        </div>
      )}
      <p className="mt-2 text-center text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

interface FooterProps {
  editable?: boolean
  onEdit?: (section: string) => void
  onImageUpload?: (field: string, file: File) => Promise<void>
  onImageClear?: (field: string) => Promise<void>
}

export function Footer({ editable, onEdit, onImageUpload, onImageClear }: FooterProps) {
  const t = useTranslations("Footer")
  const tNav = useTranslations("Nav")
  const { contactInfo, siteInfo } = useLocalizedConfig()

  /** 将内容包裹在可编辑叠加层中 */
  function wrapEditable(content: React.ReactNode, section: string, label: string, inline?: boolean) {
    if (!editable) return content
    return (
      <EditableOverlay onClick={() => onEdit?.(section)} label={label} inline={inline}>
        {content}
      </EditableOverlay>
    )
  }

  return (
    <footer className="border-t border-border/40 bg-muted/50">
      {/* 主体四栏 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* 栏 1：品牌简介 + 联系方式 */}
        <div className="sm:col-span-2 lg:col-span-1">
          {wrapEditable(
            <h3 className="mb-3 text-lg font-bold tracking-wide text-foreground">
              {siteInfo.brand_name || t("brandName")}
            </h3>,
            "brand_name",
            "编辑品牌名称"
          )}
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" />
              {wrapEditable(
                <span>{contactInfo.phone || t("phone")}</span>,
                "phone",
                "编辑电话",
                true
              )}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" />
              {wrapEditable(
                <span>{contactInfo.email || t("email")}</span>,
                "email",
                "编辑邮箱",
                true
              )}
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

        {/* 栏 4：微信二维码 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
            {t("followUs")}
          </h3>
          <div className="flex gap-4">
            <QrSlot
              url={siteInfo.wechat_service_qr_url}
              label={t("wechatService")}
              placeholder={t("qrPlaceholder")}
              editable={editable}
              alwaysShow
              onUpload={(file) => onImageUpload?.("wechat_service_qr_url", file)}
              onClear={() => onImageClear?.("wechat_service_qr_url")}
            />
            <QrSlot
              url={siteInfo.wechat_official_qr_url}
              label={t("wechatOfficial")}
              placeholder={t("qrPlaceholder")}
              editable={editable}
              onUpload={(file) => onImageUpload?.("wechat_official_qr_url", file)}
              onClear={() => onImageClear?.("wechat_official_qr_url")}
            />
          </div>
        </div>
      </div>

      {/* 底部版权栏 */}
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        <p className="opacity-60">{t("translationDisclaimer")}</p>
        <p className="mt-1">
          <span>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://github.com/whw23"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              whw23
            </a>
            {" "}版权所有 · 授权 浩然学行(苏州)文化传播有限公司 使用
          </span>
          {" | "}
          {wrapEditable(
            <span>{siteInfo.company_name}</span>,
            "company",
            "编辑公司名称",
            true
          )}
          {" | "}
          {wrapEditable(
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {siteInfo.icp_filing || t("icp")}
            </a>,
            "icp",
            "编辑ICP备案",
            true
          )}
        </p>
        <p className="mt-1 opacity-40">
          Licensed under{" "}
          <a
            href="https://polyformproject.org/licenses/noncommercial/1.0.0"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline"
          >
            PolyForm Noncommercial 1.0.0
          </a>
        </p>
      </div>
    </footer>
  )
}
