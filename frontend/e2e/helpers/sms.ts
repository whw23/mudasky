/**
 * E2E 测试辅助：获取短信验证码。
 * DEBUG 模式下直接返回；生产环境通过 INTERNAL_SECRET 获取。
 */

import type { Page } from "@playwright/test"

/**
 * 发送短信验证码并返回验证码。
 */
export async function getSmsCode(page: Page, phone: string): Promise<string> {
  const internalSecret = process.env.INTERNAL_SECRET || "";
  const result = await page.evaluate(
    async ({ ph, secret }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };
      if (secret) {
        headers["X-Internal-Secret"] = secret;
      }
      const res = await fetch("/api/auth/sms-code", {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: ph }),
        credentials: "include",
      });
      const data = await res.json();
      return data.code as string;
    },
    { ph: phone, secret: internalSecret },
  );
  return result;
}
