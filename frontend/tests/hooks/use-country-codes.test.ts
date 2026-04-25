/**
 * useCountryCodes hook 测试。
 * 验证默认国家码列表和 API 加载逻辑。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from "@/lib/api"
import { useCountryCodes } from "@/hooks/use-country-codes"

describe("useCountryCodes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("初始返回默认国家码列表", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useCountryCodes())

    expect(result.current).toHaveLength(1)
    expect(result.current[0].code).toBe("+86")
    expect(result.current[0].label).toBe("中国")
  })

  it("API 成功后更新国家码列表", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        value: [
          { code: "+86", country: "CN", label: "中国", digits: 11, enabled: true },
          { code: "+1", country: "US", label: "美国", digits: 10, enabled: true },
          { code: "+44", country: "GB", label: "英国", digits: 10, enabled: false },
        ],
      },
    })

    const { result } = renderHook(() => useCountryCodes())

    await waitFor(() => {
      expect(result.current).toHaveLength(2)
    })

    expect(result.current[0].code).toBe("+86")
    expect(result.current[1].code).toBe("+1")
  })

  it("API 返回空数组时保持默认值", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { value: [] },
    })

    const { result } = renderHook(() => useCountryCodes())

    /* 等待 effect 执行完毕 */
    await new Promise((r) => setTimeout(r, 50))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].code).toBe("+86")
  })

  it("API 失败时保持默认值", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(() => useCountryCodes())

    await new Promise((r) => setTimeout(r, 50))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].code).toBe("+86")
  })

  it("只返回 enabled 的国家码", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        value: [
          { code: "+86", country: "CN", label: "中国", digits: 11, enabled: true },
          { code: "+44", country: "GB", label: "英国", digits: 10, enabled: false },
        ],
      },
    })

    const { result } = renderHook(() => useCountryCodes())

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    expect(result.current[0].code).toBe("+86")
  })

  it("调用正确的 API 路径", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    renderHook(() => useCountryCodes())

    expect(api.get).toHaveBeenCalledWith("/public/config/phone_country_codes")
  })

  it("API 返回非数组值时保持默认值", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { value: "invalid" },
    })

    const { result } = renderHook(() => useCountryCodes())

    await new Promise((r) => setTimeout(r, 50))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].code).toBe("+86")
  })
})
