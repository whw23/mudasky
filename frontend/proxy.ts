/**
 * Next.js 16 Proxy（原 Middleware）。
 * 处理 i18n 语言检测和路由重写。
 */

import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export const proxy = createMiddleware(routing)

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
