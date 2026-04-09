/**
 * ConfigContext 系统配置上下文测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { useContext } from "react"

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

/** 辅助组件:展示 useConfig 结果 */
function ConfigConsumer() {
  const config = useConfig()
  return (
    <div>
      <span data-testid="brand">{config.siteInfo.brand_name as string}</span>
      <span data-testid="codes">{config.countryCodes.length}</span>
      <span data-testid="stats">{config.homepageStats.length}</span>
    </div>
  )
}

/** 辅助组件:展示 useLocalizedConfig 结果 */
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
    expect(screen.getByTestId("codes").textContent).toBe("1")
    expect(screen.getByTestId("stats").textContent).toBe("4")
  })

  it("API 成功后更新 siteInfo", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/config/site_info") {
        return Promise.resolve({
          data: {
            value: {
              brand_name: "新品牌",
              tagline: "新标语",
              hotline: "123",
              hotline_contact: "张老师",
              logo_url: "",
              favicon_url: "",
              wechat_qr_url: "",
              icp_filing: "",
            },
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<ConfigConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("brand").textContent).toBe("新品牌")
    })
  })

  it("countryCodes 只保留 enabled: true 的", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/config/phone_country_codes") {
        return Promise.resolve({
          data: {
            value: [
              { code: "+86", country: "CN", label: "中国", digits: 11, enabled: true },
              { code: "+1", country: "US", label: "美国", digits: 10, enabled: false },
              { code: "+81", country: "JP", label: "日本", digits: 11, enabled: true },
            ],
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<ConfigConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("codes").textContent).toBe("2")
    })
  })

  it("API 全部失败时保持默认值", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    renderWithProvider(<ConfigConsumer />)

    /* 等待所有请求完成 */
    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByTestId("brand").textContent).toBe("慕大国际教育")
    expect(screen.getByTestId("codes").textContent).toBe("1")
  })

  it("useLocalizedConfig 解析多语言字段", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/config/site_info") {
        return Promise.resolve({
          data: {
            value: {
              brand_name: { zh: "中文品牌", en: "English Brand" },
              tagline: "标语",
              hotline: "123",
              hotline_contact: "联系人",
              logo_url: "",
              favicon_url: "",
              wechat_qr_url: "",
              icp_filing: "",
            },
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<LocalizedConsumer />)

    await waitFor(() => {
      /* useLocale mock 返回 "zh",所以取中文值 */
      expect(screen.getByTestId("l-brand").textContent).toBe("中文品牌")
    })
  })
})
