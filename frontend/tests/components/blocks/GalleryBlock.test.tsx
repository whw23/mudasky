/**
 * GalleryBlock 组件测试。
 * 验证图片画廊区块的布局分发、图片渲染、Lightbox 集成。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/SpotlightOverlay", () => ({
  SpotlightOverlay: ({ children }: any) => <div data-testid="spotlight-overlay">{children}</div>,
}))

vi.mock("@/components/admin/FieldOverlay", () => ({
  FieldOverlay: ({ children }: any) => <div data-testid="field-overlay">{children}</div>,
}))

vi.mock("react-photoswipe-gallery", () => ({
  Gallery: ({ children }: any) => <div data-testid="photoswipe-gallery">{children}</div>,
  Item: ({ children }: any) => children({ ref: { current: null }, open: vi.fn() }),
}))

vi.mock("photoswipe/style.css", () => ({}))

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
    options: { galleryType: "grid" },
    data: [
      { image_id: "img-1", caption: { zh: "校园风景", en: "Campus" }, width: 1920, height: 1080 },
      { image_id: "img-2", caption: { zh: "教室环境", en: "Classroom" }, width: 1600, height: 1200 },
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
  })

  it("data 为空数组时不渲染", () => {
    const { container } = render(<GalleryBlock block={makeBlock({ data: [] })} header={null} bg="" />)
    expect(container.querySelector("section")).toBeNull()
  })

  it("data 非数组时不渲染", () => {
    const { container } = render(<GalleryBlock block={makeBlock({ data: null })} header={null} bg="" />)
    expect(container.querySelector("section")).toBeNull()
  })

  it("包裹 PhotoSwipe Gallery", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)
    expect(screen.getByTestId("photoswipe-gallery")).toBeInTheDocument()
  })

  it("editable 模式包裹 SpotlightOverlay", () => {
    const onEdit = vi.fn()
    render(<GalleryBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />)
    expect(screen.getByTestId("spotlight-overlay")).toBeInTheDocument()
  })

  it("默认 galleryType 为 grid", () => {
    render(<GalleryBlock block={makeBlock({ options: {} })} header={null} bg="" />)
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)
  })

  it("masonry 布局渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ options: { galleryType: "masonry" } })} header={null} bg="" />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("rows 布局渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ options: { galleryType: "rows" } })} header={null} bg="" />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("carousel 布局渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ options: { galleryType: "carousel" } })} header={null} bg="" />)
    const images = screen.getAllByRole("img")
    expect(images.length).toBeGreaterThanOrEqual(1)
  })
})
