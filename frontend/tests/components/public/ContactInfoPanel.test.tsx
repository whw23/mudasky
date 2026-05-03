/**
 * ContactInfoPanel 联系信息面板测试。
 * 验证联系方式从 contactItems 数组动态渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}))

vi.mock("@/lib/icon-utils", () => ({
  resolveIcon: () => (props: any) => <svg data-testid="lucide-icon" {...props} />,
}))

let mockContactItems = [
  { icon: "map-pin", label: "办公地址", content: "苏州市工业园区", image_id: null, hover_zoom: false },
  { icon: "phone", label: "咨询热线", content: "189-1268-6656", image_id: null, hover_zoom: false },
  { icon: "mail", label: "电子邮箱", content: "info@mudasky.com", image_id: null, hover_zoom: false },
  { icon: "message-circle", label: "微信咨询", content: "mudasky_wechat", image_id: null, hover_zoom: false },
  { icon: "clock", label: "办公时间", content: "周一至周五 9:00-18:00", image_id: null, hover_zoom: false },
]

vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => ({
    contactItems: mockContactItems,
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

    expect(screen.getByText("办公地址")).toBeInTheDocument()
    expect(screen.getByText("苏州市工业园区")).toBeInTheDocument()
  })

  it("渲染电话信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("咨询热线")).toBeInTheDocument()
    expect(screen.getByText("189-1268-6656")).toBeInTheDocument()
  })

  it("渲染邮箱信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("电子邮箱")).toBeInTheDocument()
    expect(screen.getByText("info@mudasky.com")).toBeInTheDocument()
  })

  it("渲染微信信息", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("微信咨询")).toBeInTheDocument()
    expect(screen.getByText("mudasky_wechat")).toBeInTheDocument()
  })

  it("渲染办公时间", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("办公时间")).toBeInTheDocument()
    expect(screen.getByText("周一至周五 9:00-18:00")).toBeInTheDocument()
  })

  it("渲染地图占位符", () => {
    render(<ContactInfoPanel />)

    expect(screen.getByText("t:mapPlaceholder")).toBeInTheDocument()
  })

  it("contactItems 为空时不渲染条目", () => {
    const original = mockContactItems
    mockContactItems = []

    render(<ContactInfoPanel />)

    /* 标题和描述仍然渲染 */
    expect(screen.getByText("t:infoTitle")).toBeInTheDocument()
    /* 无联系条目 */
    expect(screen.queryByText("办公地址")).not.toBeInTheDocument()

    mockContactItems = original
  })

  it("渲染所有联系方式条目", () => {
    render(<ContactInfoPanel />)

    const labels = [
      "办公地址",
      "咨询热线",
      "电子邮箱",
      "微信咨询",
      "办公时间",
    ]
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })
})
