/**
 * Footer 官网底部组件测试。
 * 验证品牌信息、联系方式、快速链接、服务项目和版权栏渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => mockConfig,
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <>{children}</>,
}))

import { Footer } from "@/components/layout/Footer"

let mockConfig = {
  contactInfo: {
    phone: "189-1234-5678",
    email: "test@example.com",
    address: "",
    wechat: "",
    registered_address: "",
  },
  siteInfo: {
    brand_name: "测试品牌",
    tagline: "测试标语",
    hotline: "189-1234-5678",
    hotline_contact: "张老师",
    logo_url: "",
    favicon_url: "",
    wechat_service_qr_url: "",
    wechat_official_qr_url: "",
    company_name: "测试公司",
    icp_filing: "苏ICP备2022046719号-1",
  },
}

describe("Footer", () => {
  it("渲染品牌名称", () => {
    render(<Footer />)

    expect(screen.getByText("测试品牌")).toBeInTheDocument()
  })

  it("渲染联系电话和邮箱", () => {
    render(<Footer />)

    expect(screen.getByText("189-1234-5678")).toBeInTheDocument()
    expect(screen.getByText("test@example.com")).toBeInTheDocument()
  })

  it("渲染快速链接", () => {
    render(<Footer />)

    expect(screen.getByText("quickLinks")).toBeInTheDocument()
    expect(screen.getByText("universities")).toBeInTheDocument()
    expect(screen.getByText("studyAbroad")).toBeInTheDocument()
    expect(screen.getByText("cases")).toBeInTheDocument()
    expect(screen.getByText("about")).toBeInTheDocument()
  })

  it("渲染服务项目链接", () => {
    render(<Footer />)

    expect(screen.getByText("services")).toBeInTheDocument()
    expect(screen.getByText("visa")).toBeInTheDocument()
    expect(screen.getByText("life")).toBeInTheDocument()
    expect(screen.getByText("requirements")).toBeInTheDocument()
    expect(screen.getByText("news")).toBeInTheDocument()
  })

  it("渲染 ICP 备案信息", () => {
    render(<Footer />)

    expect(screen.getByText("苏ICP备2022046719号-1")).toBeInTheDocument()
  })

  it("渲染公司名称", () => {
    render(<Footer />)

    expect(screen.getByText("测试公司")).toBeInTheDocument()
  })

  it("渲染版权年份", () => {
    render(<Footer />)

    const year = new Date().getFullYear().toString()
    const footer = document.querySelector("footer")!
    expect(footer.textContent).toContain(year)
  })

  it("无 ICP 配置时显示翻译键兜底", () => {
    const original = mockConfig.siteInfo.icp_filing
    mockConfig.siteInfo.icp_filing = ""

    render(<Footer />)

    expect(screen.getByText("icp")).toBeInTheDocument()

    mockConfig.siteInfo.icp_filing = original
  })

  it("渲染微信二维码区域标题", () => {
    render(<Footer />)

    expect(screen.getByText("followUs")).toBeInTheDocument()
  })

  it("有二维码图片时渲染 img 标签", () => {
    const original = mockConfig.siteInfo.wechat_service_qr_url
    mockConfig.siteInfo.wechat_service_qr_url = "/api/images/qr.png"

    render(<Footer />)

    const img = document.querySelector('img[alt="wechatService"]')
    expect(img).toBeInTheDocument()

    mockConfig.siteInfo.wechat_service_qr_url = original
  })
})
