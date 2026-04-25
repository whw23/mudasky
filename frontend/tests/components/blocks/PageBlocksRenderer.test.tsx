/**
 * PageBlocksRenderer 组件测试。
 * 验证从 ConfigContext 或 initialBlocks 读取 Block 列表。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Block } from "@/types/block"

const mockPageBlocks: Record<string, Block[]> = {}

vi.mock("@/contexts/ConfigContext", () => ({
  useConfig: () => ({ pageBlocks: mockPageBlocks }),
}))

vi.mock("@/components/blocks/BlockRenderer", () => ({
  BlockRenderer: ({ blocks }: any) => (
    <div data-testid="block-renderer" data-count={blocks.length}>
      {blocks.map((b: Block) => <span key={b.id}>{b.type}</span>)}
    </div>
  ),
}))

import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"

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

describe("PageBlocksRenderer", () => {
  it("使用 initialBlocks 渲染", () => {
    const blocks = [makeBlock("intro", "1"), makeBlock("cta", "2")]

    render(<PageBlocksRenderer pageSlug="home" initialBlocks={blocks} />)

    expect(screen.getByTestId("block-renderer")).toBeInTheDocument()
    expect(screen.getByTestId("block-renderer")).toHaveAttribute("data-count", "2")
  })

  it("context 有数据时优先使用 context", () => {
    mockPageBlocks["about"] = [makeBlock("intro", "ctx-1")]

    render(
      <PageBlocksRenderer
        pageSlug="about"
        initialBlocks={[makeBlock("cta", "init-1"), makeBlock("gallery", "init-2")]}
      />,
    )

    /* context 有 1 个 block，而非 initialBlocks 的 2 个 */
    expect(screen.getByTestId("block-renderer")).toHaveAttribute("data-count", "1")
    expect(screen.getByText("intro")).toBeInTheDocument()

    /* 清理 */
    delete mockPageBlocks["about"]
  })

  it("context 为空数组时回退到 initialBlocks", () => {
    mockPageBlocks["test"] = []

    const blocks = [makeBlock("gallery", "fb-1")]
    render(<PageBlocksRenderer pageSlug="test" initialBlocks={blocks} />)

    expect(screen.getByTestId("block-renderer")).toHaveAttribute("data-count", "1")
    expect(screen.getByText("gallery")).toBeInTheDocument()

    delete mockPageBlocks["test"]
  })

  it("无 blocks 数据时返回 null", () => {
    const { container } = render(<PageBlocksRenderer pageSlug="empty" />)

    expect(container.innerHTML).toBe("")
  })

  it("initialBlocks 为空数组且无 context 时返回 null", () => {
    const { container } = render(
      <PageBlocksRenderer pageSlug="none" initialBlocks={[]} />,
    )

    expect(container.innerHTML).toBe("")
  })
})
