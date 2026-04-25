/**
 * ConfigContext 系统配置上下文测试。
 * 改造后 ConfigProvider 通过 /public/config/all 一次获取全部配置。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

import api from "@/lib/api"
import { ConfigProvider, useConfig, useLocalizedConfig } from "@/contexts/ConfigContext"

/** 辅助组件：展示 useConfig 结果 */
function ConfigConsumer() {
  const config = useConfig()
  return (
    <div>
      <span data-testid="brand">{config.siteInfo.brand_name as string}</span>
      <span data-testid="stats">{config.homepageStats.length}</span>
      <span data-testid="items">{config.contactItems.length}</span>
    </div>
  )
}

/** 辅助组件：展示 useLocalizedConfig 结果 */
function LocalizedConsumer() {
  const config = useLocalizedConfig()
  return (
    <div>
      <span data-testid="l-brand">{config.siteInfo.brand_name}</span>
    </div>
  )
}

function renderWithProvider(consumer: React.ReactNode) {
  return render(<ConfigProvider>{consumer}</ConfigProvider>)
}

describe("ConfigContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("API 请求前使用默认值", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    renderWithProvider(<ConfigConsumer />)

    expect(screen.getByTestId("brand").textContent).toBe("慕大国际教育")
    expect(screen.getByTestId("stats").textContent).toBe("4")
    expect(screen.getByTestId("items").textContent).toBe("0")
  })

  it("/config/all 成功后更新配置", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/public/config/all") {
        return Promise.resolve({
          data: {
            contact_items: [
              { icon: "phone", label: "电话", content: "123-456", image_id: null, hover_zoom: false },
            ],
            site_info: {
              brand_name: "新品牌",
              tagline: "新标语",
              hotline: "123",
              hotline_contact: "张老师",
              logo_url: "",
              favicon_url: "",
              wechat_service_qr_url: "",
              wechat_official_qr_url: "",
              company_name: "",
              icp_filing: "",
            },
            homepage_stats: [{ value: "10+", label: "测试" }],
            about_info: { history: "", mission: "", vision: "", partnership: "" },
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<ConfigConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("brand").textContent).toBe("新品牌")
      expect(screen.getByTestId("stats").textContent).toBe("1")
      expect(screen.getByTestId("items").textContent).toBe("1")
    })
  })

  it("API 失败时保持默认值", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    renderWithProvider(<ConfigConsumer />)

    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByTestId("brand").textContent).toBe("慕大国际教育")
    expect(screen.getByTestId("stats").textContent).toBe("4")
  })

  it("useLocalizedConfig 解析多语言字段", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/public/config/all") {
        return Promise.resolve({
          data: {
            contact_items: [],
            site_info: {
              brand_name: { zh: "中文品牌", en: "English Brand" },
              tagline: "标语",
              hotline: "123",
              hotline_contact: "联系人",
              logo_url: "",
              favicon_url: "",
              wechat_service_qr_url: "",
              wechat_official_qr_url: "",
              company_name: "",
              icp_filing: "",
            },
            homepage_stats: [],
            about_info: { history: "", mission: "", vision: "", partnership: "" },
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<LocalizedConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("l-brand").textContent).toBe("中文品牌")
    })
  })
})
