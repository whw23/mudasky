/**
 * getApiError 工具函数测试。
 */

import { describe, it, expect } from "vitest"
import { AxiosError, AxiosHeaders } from "axios"
import { getApiError } from "@/lib/api-error"

/** 模拟翻译函数：已知 key 返回翻译，未知 key 返回 key 本身 */
function mockTranslate(key: string): string {
  const translations: Record<string, string> = {
    PHONE_ALREADY_REGISTERED: "手机号已注册",
    PASSWORD_INCORRECT: "密码不正确",
    USER_NOT_FOUND: "用户不存在",
  }
  return translations[key] ?? key
}

describe("getApiError", () => {
  it("非 AxiosError 返回 fallback", () => {
    const result = getApiError(new Error("random"), mockTranslate, "操作失败")
    expect(result).toBe("操作失败")
  })

  it("AxiosError 无 response 返回 fallback", () => {
    const err = new AxiosError("network error")
    const result = getApiError(err, mockTranslate, "操作失败")
    expect(result).toBe("操作失败")
  })

  it("AxiosError 无 code 字段返回 fallback", () => {
    const err = new AxiosError("error", "400", undefined, undefined, {
      data: { message: "参数错误" },
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    const result = getApiError(err, mockTranslate, "操作失败")
    expect(result).toBe("操作失败")
  })

  it("已知 code 返回翻译后的消息", () => {
    const err = new AxiosError("error", "409", undefined, undefined, {
      data: { code: "PHONE_ALREADY_REGISTERED", message: "手机号已注册" },
      status: 409,
      statusText: "Conflict",
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    const result = getApiError(err, mockTranslate, "操作失败")
    expect(result).toBe("手机号已注册")
  })

  it("未知 code 返回 fallback（翻译函数返回 key 本身）", () => {
    const err = new AxiosError("error", "500", undefined, undefined, {
      data: { code: "UNKNOWN_ERROR", message: "未知错误" },
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    const result = getApiError(err, mockTranslate, "操作失败")
    expect(result).toBe("操作失败")
  })

  it("null 错误返回 fallback", () => {
    const result = getApiError(null, mockTranslate, "操作失败")
    expect(result).toBe("操作失败")
  })

  it("undefined 错误返回 fallback", () => {
    const result = getApiError(undefined, mockTranslate, "操作失败")
    expect(result).toBe("操作失败")
  })
})
