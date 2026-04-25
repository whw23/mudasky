/**
 * ContactInfoPanel 联系信息面板测试。
 * 验证联系方式（地址、电话、邮件、微信、办公时间）的渲染和配置回退。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}))

let mockContactInfo = {
  address: "苏州市工业园区",
  phone: "189-1268-6656",
  email: "info@mudasky.com",
  wechat: "mudasky_wechat",
  registered_address: "周一至周五 9:00-18:00",
}

vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => ({
    contactInfo: mockContactInfo,
  }),
}))

import { ContactInfoPanel } from "@/components/public/ContactInfoPanel"

describe("ContactInfoPanel", () => {
  it("渲染标题", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:infoTitle")).toBeInTheDocument()
  })

  it("渲染描述文本", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:infoDesc")).toBeInTheDocument()
  })

  it("渲染地址信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:addressLabel")).toBeInTheDocument()
    expect(screen.getByText("苏州市工业园区")).toBeInTheDocument()
  })

  it("渲染电话信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:phoneLabel")).toBeInTheDocument()
    expect(screen.getByText("189-1268-6656")).toBeInTheDocument()
  })

  it("渲染邮箱信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:emailLabel")).toBeInTheDocument()
    expect(screen.getByText("info@mudasky.com")).toBeInTheDocument()
  })

  it("渲染微信信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:wechatLabel")).toBeInTheDocument()
    expect(screen.getByText("mudasky_wechat")).toBeInTheDocument()
  })

  it("渲染办公时间", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:hoursLabel")).toBeInTheDocument()
    expect(screen.getByText("周一至周五 9:00-18:00")).toBeInTheDocument()
  })

  it("渲染地图占位符", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:mapPlaceholder")).toBeInTheDocument()
  })

  it("配置为空时回退到翻译值", () => {
    mockContactInfo = {
      address: "",
      phone: "",
      email: "",
      wechat: "",
      registered_address: "",
    }

    render(<ContactInfoPanel />)

    /* 空字符串 falsy → 回退到 t(key) */
    expect(screen.getByText("t:address")).toBeInTheDocument()
    expect(screen.getByText("t:phone")).toBeInTheDocument()
    expect(screen.getByText("t:email")).toBeInTheDocument()
    expect(screen.getByText("t:wechat")).toBeInTheDocument()
    expect(screen.getByText("t:hours")).toBeInTheDocument()

    /* 恢复 */
    mockContactInfo = {
      address: "苏州市工业园区",
      phone: "189-1268-6656",
      email: "info@mudasky.com",
      wechat: "mudasky_wechat",
      registered_address: "周一至周五 9:00-18:00",
    }
  })

  it("渲染 5 个联系方式项", () => {
    render(<ContactInfoPanel />)

    const labels = [
      "t:addressLabel",
      "t:phoneLabel",
      "t:emailLabel",
      "t:wechatLabel",
      "t:hoursLabel",
    ]
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })
})
