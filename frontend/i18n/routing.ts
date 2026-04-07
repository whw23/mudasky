/**
 * i18n 路由配置。
 * 定义支持的语言和默认语言。
 */

import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["zh", "en", "ja", "de"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
})
