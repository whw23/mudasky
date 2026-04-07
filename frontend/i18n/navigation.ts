/**
 * i18n 导航工具。
 * 提供带语言前缀的 Link、redirect、usePathname、useRouter。
 */

import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
