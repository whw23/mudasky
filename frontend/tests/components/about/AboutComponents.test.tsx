/**
 * HistorySection + ContactInfoSection 组件测试。
 * 验证关于我们页面的历史区块和联系方式区块渲染与编辑模式。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}))

vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => ({
    aboutInfo: { history_title: "我们的故事", history: "成立于2010年" },
    contactItems: [
      { icon: "map-pin", label: "办公地址", content: "苏州工业园区", image_id: null, hover_zoom: false },
      { icon: "phone", label: "咨询热线", content: "0512-12345678", image_id: null, hover_zoom: false },
      { icon: "mail", label: "电子邮箱", content: "info@mudasky.com", image_id: null, hover_zoom: false },
      { icon: "message-circle", label: "微信咨询", content: "mudasky_wechat", image_id: "qr-123", hover_zoom: true },
      { icon: "building", label: "注册地址", content: "苏州高新区", image_id: null, hover_zoom: false },
    ],
  }),
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children, onClick, label }: any) => (
    <div data-testid="editable-overlay" onClick={onClick} title={label}>
      {children}
    </div>
  ),
}))

vi.mock("@/lib/icon-utils", () => ({
  resolveIcon: () => (props: any) => <svg data-testid="lucide-icon" {...props} />,
}))

/* ─── HistorySection ─── */

import { HistorySection } from "@/components/about/AboutContent"

describe("HistorySection", () => {
  it("渲染历史标题和内容", () => {
    render(<HistorySection />)

    expect(screen.getByText("我们的故事")).toBeInTheDocument()
    expect(screen.getByText("成立于2010年")).toBeInTheDocument()
    expect(screen.getByText("Our Story")).toBeInTheDocument()
  })

  it("editable 模式包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    const onEditTitle = vi.fn()

    render(<HistorySection editable onEdit={onEdit} onEditTitle={onEditTitle} />)

    const overlays = screen.getAllByTestId("editable-overlay")
    expect(overlays.length).toBe(2)
  })

  it("editable 模式点击触发 onEdit", () => {
    const onEdit = vi.fn()

    render(<HistorySection editable onEdit={onEdit} />)

    const overlays = screen.getAllByTestId("editable-overlay")
    /* 只有内容区域有 onEdit（标题没有 onEditTitle） */
    const contentOverlay = overlays.find((el) => el.title === "编辑公司历史")
    expect(contentOverlay).toBeTruthy()
    fireEvent.click(contentOverlay!)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("editable 模式点击标题触发 onEditTitle", () => {
    const onEditTitle = vi.fn()

    render(<HistorySection editable onEditTitle={onEditTitle} />)

    const titleOverlay = screen.getAllByTestId("editable-overlay")
      .find((el) => el.title === "编辑标题")
    expect(titleOverlay).toBeTruthy()
    fireEvent.click(titleOverlay!)
    expect(onEditTitle).toHaveBeenCalledTimes(1)
  })

  it("非 editable 模式不渲染 overlay", () => {
    render(<HistorySection />)

    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })
})

/* ─── ContactInfoSection ─── */

import { ContactInfoSection } from "@/components/about/ContactInfoSection"

describe("ContactInfoSection", () => {
  it("渲染五个联系方式项", () => {
    render(<ContactInfoSection />)

    expect(screen.getByText("苏州工业园区")).toBeInTheDocument()
    expect(screen.getByText("0512-12345678")).toBeInTheDocument()
    expect(screen.getByText("info@mudasky.com")).toBeInTheDocument()
    expect(screen.getByText("mudasky_wechat")).toBeInTheDocument()
    expect(screen.getByText("苏州高新区")).toBeInTheDocument()
  })

  it("渲染联系方式标签（来自 contactItems.label）", () => {
    render(<ContactInfoSection />)

    expect(screen.getByText("办公地址")).toBeInTheDocument()
    expect(screen.getByText("咨询热线")).toBeInTheDocument()
    expect(screen.getByText("电子邮箱")).toBeInTheDocument()
    expect(screen.getByText("微信咨询")).toBeInTheDocument()
    expect(screen.getByText("注册地址")).toBeInTheDocument()
  })

  it("有 image_id + hover_zoom 的条目渲染二维码图片", () => {
    render(<ContactInfoSection />)

    const qrImg = screen.getByAltText("微信咨询")
    expect(qrImg).toBeInTheDocument()
    expect(qrImg).toHaveAttribute("src", "/api/public/images/detail?id=qr-123")
  })

  it("editable 模式包裹 EditableOverlay", () => {
    const onEditField = vi.fn()

    render(<ContactInfoSection editable onEditField={onEditField} />)

    const overlays = screen.getAllByTestId("editable-overlay")
    expect(overlays).toHaveLength(5)
  })

  it("editable 模式点击触发 onEditField 并传递索引", () => {
    const onEditField = vi.fn()

    render(<ContactInfoSection editable onEditField={onEditField} />)

    const overlays = screen.getAllByTestId("editable-overlay")
    fireEvent.click(overlays[0])
    expect(onEditField).toHaveBeenCalledWith("0")
  })

  it("非 editable 模式不渲染 overlay", () => {
    render(<ContactInfoSection />)

    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })

  it("maxColumns 控制网格列数", () => {
    const { container } = render(<ContactInfoSection maxColumns={2} />)

    const grid = container.querySelector(".grid")
    expect(grid?.className).not.toContain("lg:grid-cols-3")
  })

  it("默认 maxColumns=3 显示三列网格", () => {
    const { container } = render(<ContactInfoSection />)

    const grid = container.querySelector(".grid")
    expect(grid?.className).toContain("lg:grid-cols-3")
  })
})
