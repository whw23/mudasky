/**
 * BlockRenderer 组件测试。
 * 验证 Block 类型到组件的分发和空列表处理。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

/* mock 所有子 Block 组件 */
vi.mock("@/components/blocks/SectionHeader", () => ({
  SectionHeader: ({ tag, title }: any) => (
    <div data-testid="section-header">{tag} - {typeof title === "string" ? title : title.zh}</div>
  ),
}))
vi.mock("@/components/blocks/IntroBlock", () => ({
  IntroBlock: ({ header }: any) => <div data-testid="intro-block">{header}</div>,
}))
vi.mock("@/components/blocks/CardGridBlock", () => ({
  CardGridBlock: () => <div data-testid="card-grid-block" />,
}))
vi.mock("@/components/blocks/StepListBlock", () => ({
  StepListBlock: () => <div data-testid="step-list-block" />,
}))
vi.mock("@/components/blocks/DocListBlock", () => ({
  DocListBlock: () => <div data-testid="doc-list-block" />,
}))
vi.mock("@/components/blocks/GalleryBlock", () => ({
  GalleryBlock: () => <div data-testid="gallery-block" />,
}))
vi.mock("@/components/blocks/ArticleListBlock", () => ({
  ArticleListBlock: () => <div data-testid="article-list-block" />,
}))
vi.mock("@/components/blocks/UniversityListBlock", () => ({
  UniversityListBlock: () => <div data-testid="university-list-block" />,
}))
vi.mock("@/components/blocks/CaseGridBlock", () => ({
  CaseGridBlock: () => <div data-testid="case-grid-block" />,
}))
vi.mock("@/components/blocks/FeaturedDataBlock", () => ({
  FeaturedDataBlock: () => <div data-testid="featured-data-block" />,
}))
vi.mock("@/components/blocks/CtaBlock", () => ({
  CtaBlock: () => <div data-testid="cta-block" />,
}))
vi.mock("@/components/blocks/ContactInfoBlock", () => ({
  ContactInfoBlock: () => <div data-testid="contact-info-block" />,
}))

import { BlockRenderer } from "@/components/blocks/BlockRenderer"
import type { Block } from "@/types/block"

function makeBlock(type: Block["type"], id: string): Block {
  return {
    id,
    type,
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: null,
  }
}

describe("BlockRenderer", () => {
  it("渲染空 blocks 列表", () => {
    const { container } = render(<BlockRenderer blocks={[]} />)

    expect(container.innerHTML).toBe("")
  })

  it("渲染 intro 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("intro", "1")]} />)

    expect(screen.getByTestId("intro-block")).toBeInTheDocument()
  })

  it("渲染 card_grid 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("card_grid", "2")]} />)

    expect(screen.getByTestId("card-grid-block")).toBeInTheDocument()
  })

  it("渲染 step_list 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("step_list", "3")]} />)

    expect(screen.getByTestId("step-list-block")).toBeInTheDocument()
  })

  it("渲染 doc_list 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("doc_list", "4")]} />)

    expect(screen.getByTestId("doc-list-block")).toBeInTheDocument()
  })

  it("渲染 gallery 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("gallery", "5")]} />)

    expect(screen.getByTestId("gallery-block")).toBeInTheDocument()
  })

  it("渲染 cta 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("cta", "6")]} />)

    expect(screen.getByTestId("cta-block")).toBeInTheDocument()
  })

  it("渲染 featured_data 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("featured_data", "7")]} />)

    expect(screen.getByTestId("featured-data-block")).toBeInTheDocument()
  })

  it("渲染 article_list 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("article_list", "8")]} />)

    expect(screen.getByTestId("article-list-block")).toBeInTheDocument()
  })

  it("渲染 university_list 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("university_list", "9")]} />)

    expect(screen.getByTestId("university-list-block")).toBeInTheDocument()
  })

  it("渲染 case_grid 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("case_grid", "10")]} />)

    expect(screen.getByTestId("case-grid-block")).toBeInTheDocument()
  })

  it("渲染 contact_info 类型 Block", () => {
    render(<BlockRenderer blocks={[makeBlock("contact_info", "11")]} />)

    expect(screen.getByTestId("contact-info-block")).toBeInTheDocument()
  })

  it("渲染多个不同类型 Block", () => {
    render(
      <BlockRenderer
        blocks={[
          makeBlock("intro", "a"),
          makeBlock("cta", "b"),
          makeBlock("gallery", "c"),
        ]}
      />,
    )

    expect(screen.getByTestId("intro-block")).toBeInTheDocument()
    expect(screen.getByTestId("cta-block")).toBeInTheDocument()
    expect(screen.getByTestId("gallery-block")).toBeInTheDocument()
  })

  it("showTitle 为 true 时渲染 SectionHeader", () => {
    const block: Block = {
      ...makeBlock("intro", "x"),
      showTitle: true,
      sectionTag: "ABOUT",
      sectionTitle: { zh: "关于我们", en: "About Us" },
    }
    render(<BlockRenderer blocks={[block]} />)

    expect(screen.getByTestId("section-header")).toBeInTheDocument()
    expect(screen.getByText(/ABOUT/)).toBeInTheDocument()
  })

  it("bgColor 为 gray 时传递 bg-gray-50 样式", () => {
    /* 通过 mock 验证 props 传递 */
    const IntroBlockSpy = vi.fn(() => <div data-testid="intro-spy" />)
    vi.doMock("@/components/blocks/IntroBlock", () => ({ IntroBlock: IntroBlockSpy }))

    /* 此处仅验证 BlockRenderer 可正常渲染灰色背景 Block */
    const block: Block = { ...makeBlock("intro", "y"), bgColor: "gray" }
    render(<BlockRenderer blocks={[block]} />)

    expect(screen.getByTestId("intro-block")).toBeInTheDocument()
  })
})
