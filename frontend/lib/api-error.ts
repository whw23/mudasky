/**
 * API 错误码翻译工具。
 * 从 axios 错误响应中提取 code,查 ApiErrors 翻译。
 */

import { AxiosError } from 'axios'

/**
 * 从 API 错误中获取本地化错误消息。
 * 优先用 code 查翻译,找不到则回退到 fallback。
 */
export function getApiError(
  err: unknown,
  t: (key: string) => string,
  fallback: string,
): string {
  if (!(err instanceof AxiosError)) return fallback
  const code = err.response?.data?.code as string | undefined
  if (!code) return fallback
  const translated = t(code)
  // next-intl 找不到 key 时返回 key 本身
  return translated === code ? fallback : translated
}
