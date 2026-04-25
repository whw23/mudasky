/**
 * page-api 服务端数据预取测试。
 * 验证 fetchPageBlocks 的成功、失败、缺失场景。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { fetchPageBlocks } from "@/lib/page-api"

describe("fetchPageBlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("成功获取指定页面的 Block 列表", async () => {
    const blocks = [
      { id: "b1", type: "intro", showTitle: true },
      { id: "b2", type: "card_grid", showTitle: false },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: { home: blocks } }),
    })

    const result = await fetchPageBlocks("home")

    expect(result).toEqual(blocks)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("请求的 slug 不存在时返回空数组", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: { home: [] } }),
    })

    const result = await fetchPageBlocks("about")

    expect(result).toEqual([])
  })

  it("API 返回非 ok 时返回空数组", async () => {
    mockFetch.mockResolvedValue({ ok: false })

    const result = await fetchPageBlocks("home")

    expect(result).toEqual([])
  })

  it("网络错误时返回空数组", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))

    const result = await fetchPageBlocks("home")

    expect(result).toEqual([])
  })

  it("value 为 null 时返回空数组", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: null }),
    })

    const result = await fetchPageBlocks("home")

    expect(result).toEqual([])
  })

  it("请求 URL 包含正确端点", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: {} }),
    })

    await fetchPageBlocks("home")

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("/api/public/config/page_blocks")
  })

  it("请求包含 revalidate 配置", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: {} }),
    })

    await fetchPageBlocks("home")

    const options = mockFetch.mock.calls[0][1]
    expect(options?.next?.revalidate).toBe(60)
  })
})
