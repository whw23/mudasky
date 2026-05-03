import type { ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { AuthProvider } from "@/contexts/AuthContext"
import { ConfigProvider } from "@/contexts/ConfigContext"
import { LoginModal } from "@/components/auth/LoginModal"
import { RegisterModal } from "@/components/auth/RegisterModal"
import { Toaster } from "@/components/ui/sonner"
import { FaviconHead } from "@/components/layout/FaviconHead"
import { ScrollToTop } from "@/components/common/ScrollToTop"

/** 生成元数据 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Metadata" })
  return {
    title: t("title"),
    description: t("description"),
  }
}

/** 语言布局 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  await params
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <ConfigProvider>
          <FaviconHead />
          {children}
          <LoginModal />
          <RegisterModal />
          <Toaster />
          <ScrollToTop />
        </ConfigProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  )
}
