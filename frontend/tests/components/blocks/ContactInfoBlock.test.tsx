/**
 * ContactInfoBlock 组件测试。
 * 验证联系信息区块的渲染和回调透传。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/components/about/ContactInfoSection", () => ({
  ContactInfoSection: ({ editable, maxColumns, onEditField }: any) => (
    <div data-testid="contact-info-section" data-editable={editable} data-max-columns={maxColumns}>
      {onEditField && (
        <button onClick={() => onEditField("phone")} data-testid="edit-phone">
          编辑电话
        </button>
      )}
    </div>
  ),
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

    /* 无 pt-10 的容器 */
    const headerContainer = container.querySelector(".pt-10")
    expect(headerContainer).toBeNull()
  })

  it("onEditConfig 回调透传并添加 contact_ 前缀", () => {
    const onEditConfig = vi.fn()
    render(
      <ContactInfoBlock
        block={makeBlock()}
        header={null}
        bg=""
        editable
        onEditConfig={onEditConfig}
      />,
    )

    /* 点击编辑按钮触发 onEditField("phone") → onEditConfig("contact_phone") */
    screen.getByTestId("edit-phone").click()
    expect(onEditConfig).toHaveBeenCalledWith("contact_phone")
  })

  it("无 onEditConfig 时不渲染编辑按钮", () => {
    render(
      <ContactInfoBlock block={makeBlock()} header={null} bg="" editable />,
    )

    expect(screen.queryByTestId("edit-phone")).not.toBeInTheDocument()
  })
})
