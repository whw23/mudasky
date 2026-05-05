/**
 * ContactInfoBlock 组件测试。
 * 验证联系信息区块的渲染、SpotlightOverlay 和回调透传。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

const mockContactItems = [
  {
    id: "g1",
    icon: "phone",
    label: { zh: "咨询热线", en: "Hotline" },
    content: { zh: "189-0000-0000", en: "189-0000-0000" },
    image_id: null,
    hover_zoom: false,
  },
]

vi.mock("@/contexts/ConfigContext", () => ({
  useConfig: () => ({ contactItems: mockContactItems }),
}))

vi.mock("@/lib/i18n-config", () => ({
  getLocalizedValue: (val: any, locale: string) => {
    if (typeof val === "string") return val
    return val?.[locale] ?? val?.zh ?? ""
  },
}))

vi.mock("@/components/about/ContactInfoSection", () => ({
  ContactInfoSection: ({ editable, maxColumns, items, onEditField, onDelete, renderAddCard }: any) => (
    <div data-testid="contact-info-section" data-editable={editable} data-max-columns={maxColumns}>
      <span data-testid="items-count">{items?.length ?? 0}</span>
      {onEditField && (
        <button onClick={() => onEditField("0")} data-testid="edit-item">
          编辑条目
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(0)} data-testid="delete-item">
          删除条目
        </button>
      )}
      {renderAddCard?.()}
    </div>
  ),
}))

vi.mock("@/components/admin/SpotlightOverlay", () => ({
  SpotlightOverlay: ({ children, onClick, label }: any) => (
    <div data-testid="spotlight-overlay" onClick={onClick} title={label}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/blocks/AddContactItemMenu", () => ({
  AddContactItemMenu: () => <div data-testid="add-contact-menu">添加</div>,
}))

import { ContactInfoBlock } from "@/components/blocks/ContactInfoBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "contact-1",
    type: "contact_info",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: { maxColumns: 3 },
    data: null,
    ...overrides,
  }
}

describe("ContactInfoBlock", () => {
  it("渲染 ContactInfoSection", () => {
    render(<ContactInfoBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByTestId("contact-info-section")).toBeInTheDocument()
  })

  it("透传 maxColumns 参数", () => {
    render(
      <ContactInfoBlock block={makeBlock({ options: { maxColumns: 4 } })} header={null} bg="" />,
    )

    expect(screen.getByTestId("contact-info-section")).toHaveAttribute("data-max-columns", "4")
  })

  it("渲染传入的 header", () => {
    render(
      <ContactInfoBlock
        block={makeBlock()}
        header={<h2>联系我们</h2>}
        bg=""
      />,
    )

    expect(screen.getByText("联系我们")).toBeInTheDocument()
  })

  it("无 header 时不渲染 header 容器", () => {
    const { container } = render(
      <ContactInfoBlock block={makeBlock()} header={null} bg="" />,
    )

    const headerContainer = container.querySelector(".pt-10")
    expect(headerContainer).toBeNull()
  })

  it("editable + onEdit + onEditConfig 时渲染 SpotlightOverlay", () => {
    const onEdit = vi.fn()
    const onEditConfig = vi.fn()
    render(
      <ContactInfoBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} onEditConfig={onEditConfig} />,
    )

    const overlay = screen.getByTestId("spotlight-overlay")
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute("title", "编辑联系信息")
  })

  it("点击 SpotlightOverlay 触发 onEdit 并传递 block", () => {
    const onEdit = vi.fn()
    const onEditConfig = vi.fn()
    const block = makeBlock()
    render(
      <ContactInfoBlock block={block} header={null} bg="" editable onEdit={onEdit} onEditConfig={onEditConfig} />,
    )

    fireEvent.click(screen.getByTestId("spotlight-overlay"))
    expect(onEdit).toHaveBeenCalledWith(block)
  })

  it("onEditConfig 回调透传（global 类型条目使用 contact_item_global_ 前缀）", () => {
    const onEditConfig = vi.fn()
    const onEdit = vi.fn()
    render(
      <ContactInfoBlock
        block={makeBlock()}
        header={null}
        bg=""
        editable
        onEdit={onEdit}
        onEditConfig={onEditConfig}
      />,
    )

    /* 点击编辑按钮触发 onEditField("0") */
    screen.getByTestId("edit-item").click()
    /* data 为 null 时回退到 globalItems，触发 global 分支 */
    expect(onEditConfig).toHaveBeenCalledWith("contact_item_global_g1")
  })

  it("无 onEditConfig 时不渲染 SpotlightOverlay（需要三者同时存在）", () => {
    const onEdit = vi.fn()
    render(
      <ContactInfoBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.queryByTestId("spotlight-overlay")).not.toBeInTheDocument()
  })

  it("无 onEdit 时不渲染 SpotlightOverlay", () => {
    render(
      <ContactInfoBlock block={makeBlock()} header={null} bg="" editable />,
    )

    expect(screen.queryByTestId("spotlight-overlay")).not.toBeInTheDocument()
  })
})
