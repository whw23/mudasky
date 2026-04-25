/**
 * CardGridBlock 组件测试。
 * 验证卡片网格区块的渲染和不同卡片类型分发。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <div data-testid="editable-overlay">{children}</div>,
}))

/* mock 所有卡片组件，避免深层依赖 */
vi.mock("@/components/blocks/cards/GuideCard", () => ({
  GuideCard: ({ card }: any) => <div data-testid="guide-card">{card.title?.zh}</div>,
}))
vi.mock("@/components/blocks/cards/TimelineCard", () => ({
  TimelineCard: ({ card }: any) => <div data-testid="timeline-card">{card.title?.zh}</div>,
}))
vi.mock("@/components/blocks/cards/CityCard", () => ({
  CityCard: ({ card }: any) => <div data-testid="city-card">{card.city?.zh}</div>,
}))
vi.mock("@/components/blocks/cards/ProgramCard", () => ({
  ProgramCard: ({ card }: any) => <div data-testid="program-card">{card.name?.zh}</div>,
}))
vi.mock("@/components/blocks/cards/ChecklistCard", () => ({
  ChecklistCard: ({ card }: any) => <div data-testid="checklist-card">{card.label?.zh}</div>,
}))

import { CardGridBlock } from "@/components/blocks/CardGridBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "card-1",
    type: "card_grid",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: { cardType: "guide", maxColumns: 3 },
    data: [
      { title: { zh: "签证指南" }, desc: { zh: "签证申请流程" }, icon: "FileText" },
      { title: { zh: "院校推荐" }, desc: { zh: "热门院校列表" }, icon: "School" },
    ],
    ...overrides,
  }
}

describe("CardGridBlock", () => {
  it("渲染 guide 类型卡片", () => {
    render(<CardGridBlock block={makeBlock()} header={null} bg="" />)

    const cards = screen.getAllByTestId("guide-card")
    expect(cards).toHaveLength(2)
    expect(screen.getByText("签证指南")).toBeInTheDocument()
    expect(screen.getByText("院校推荐")).toBeInTheDocument()
  })

  it("渲染 timeline 类型卡片", () => {
    const block = makeBlock({
      options: { cardType: "timeline" },
      data: [{ title: { zh: "第一阶段" }, time: { zh: "1月" } }],
    })
    render(<CardGridBlock block={block} header={null} bg="" />)

    expect(screen.getByTestId("timeline-card")).toBeInTheDocument()
  })

  it("渲染 city 类型卡片", () => {
    const block = makeBlock({
      options: { cardType: "city" },
      data: [{ city: { zh: "伦敦" }, country: { zh: "英国" } }],
    })
    render(<CardGridBlock block={block} header={null} bg="" />)

    expect(screen.getByTestId("city-card")).toBeInTheDocument()
  })

  it("渲染 program 类型卡片", () => {
    const block = makeBlock({
      options: { cardType: "program" },
      data: [{ name: { zh: "计算机科学" }, country: { zh: "美国" } }],
    })
    render(<CardGridBlock block={block} header={null} bg="" />)

    expect(screen.getByTestId("program-card")).toBeInTheDocument()
  })

  it("渲染 checklist 类型卡片", () => {
    const block = makeBlock({
      options: { cardType: "checklist" },
      data: [{ label: { zh: "申请材料" }, items: [] }],
    })
    render(<CardGridBlock block={block} header={null} bg="" />)

    expect(screen.getByTestId("checklist-card")).toBeInTheDocument()
  })

  it("data 为空数组时不渲染卡片", () => {
    render(
      <CardGridBlock block={makeBlock({ data: [] })} header={null} bg="" />,
    )

    expect(screen.queryByTestId("guide-card")).not.toBeInTheDocument()
  })

  it("data 非数组时不渲染卡片", () => {
    render(
      <CardGridBlock block={makeBlock({ data: undefined })} header={null} bg="" />,
    )

    expect(screen.queryByTestId("guide-card")).not.toBeInTheDocument()
  })

  it("editable 模式包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <CardGridBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })
})
