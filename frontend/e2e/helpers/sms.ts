/**
 * E2E 测试辅助：获取短信验证码。
 * DEBUG 模式下直接返回；生产环境通过 INTERNAL_SECRET 获取。
 */

import type { Page } from "@playwright/test"

/**
 * 发送短信验证码并返回验证码。
 * 使用 page.request.post（基于 baseURL 配置），避免 page.evaluate 中
 * 相对 URL 在 about:blank 页面无法解析的问题。
 */
export async function getSmsCode(page: Page, phone: string): Promise<string> {
  const internalSecret = process.env.INTERNAL_SECRET || "";

  // 通过 cookie 传递 internal_secret
  if (internalSecret) {
    const baseURL = process.env.BASE_URL || "http://localhost";
    const domain = new URL(baseURL).hostname;
    await page.context().addCookies([
      { name: "internal_secret", value: internalSecret, domain, path: "/" },
    ]);
  }

  const res = await page.request.post("/api/auth/sms-code", {
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    data: { phone },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`sms-code 请求失败: ${res.status()} ${body}`);
  }

  const data = await res.json();
  if (!data.code) {
    throw new Error("sms-code 响应中无验证码（需设置 INTERNAL_SECRET）");
  }
  return data.code as string;
}
