/**
 * GalleryBlock 组件测试。
 * 验证图片画廊区块的图片和说明渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <div data-testid="editable-overlay">{children}</div>,
}))

import { GalleryBlock } from "@/components/blocks/GalleryBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "gallery-1",
    type: "gallery",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: [
      { image_id: "img-1", caption: { zh: "校园风景", en: "Campus View" } },
      { image_id: "img-2", caption: { zh: "教室环境", en: "Classroom" } },
    ],
    ...overrides,
  }
}

describe("GalleryBlock", () => {
  it("渲染所有图片", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)

    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)
  })

  it("图片 src 使用正确的 API 路径", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)

    const images = screen.getAllByRole("img")
    expect(images[0]).toHaveAttribute("src", "/api/public/images/detail?id=img-1")
    expect(images[1]).toHaveAttribute("src", "/api/public/images/detail?id=img-2")
  })

  it("渲染图片说明文字", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("校园风景")).toBeInTheDocument()
    expect(screen.getByText("教室环境")).toBeInTheDocument()
  })

  it("图片 alt 使用当前语言的说明文字", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)

    const images = screen.getAllByRole("img")
    expect(images[0]).toHaveAttribute("alt", "校园风景")
  })

  it("说明为空时不渲染说明段落", () => {
    const block = makeBlock({
      data: [{ image_id: "img-1", caption: {} }],
    })
    const { container } = render(<GalleryBlock block={block} header={null} bg="" />)

    /* 不应有说明段落 */
    const captions = container.querySelectorAll("p")
    expect(captions.length).toBe(0)
  })

  it("data 为空数组时不渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ data: [] })} header={null} bg="" />)

    expect(screen.queryAllByRole("img")).toHaveLength(0)
  })

  it("data 非数组时不渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ data: null })} header={null} bg="" />)

    expect(screen.queryAllByRole("img")).toHaveLength(0)
  })

  it("editable 模式包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <GalleryBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })
})
