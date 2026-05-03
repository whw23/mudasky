/**
 * FeaturedDataBlock 组件测试。
 * 验证精选数据区块（院校/案例）的渲染和空状态。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("@/components/admin/SpotlightOverlay", () => ({
  SpotlightOverlay: ({ children }: any) => <div data-testid="spotlight-overlay">{children}</div>,
}))

const mockGet = vi.fn()
vi.mock("@/lib/api", () => ({
  default: { get: (...args: any[]) => mockGet(...args) },
}))

import { FeaturedDataBlock } from "@/components/blocks/FeaturedDataBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "featured-1",
    type: "featured_data",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: { dataType: "universities", maxItems: 3 },
    data: null,
    ...overrides,
  }
}

const MOCK_UNIVERSITIES = [
  {
    id: "u1",
    name: "牛津大学",
    name_en: "Oxford",
    city: "牛津",
    country: "英国",
    logo_image_id: null,
    qs_rankings: [{ year: 2025, ranking: 3 }],
  },
  {
    id: "u2",
    name: "剑桥大学",
    name_en: "Cambridge",
    city: "剑桥",
    country: "英国",
    logo_image_id: "logo-1",
    qs_rankings: [],
  },
]

const MOCK_CASES = [
  {
    id: "c1",
    student_name: "张三",
    university: "MIT",
    program: "CS",
    year: 2025,
    avatar_image_id: null,
  },
]

describe("FeaturedDataBlock", () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it("请求院校数据并渲染", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_UNIVERSITIES } })

    render(<FeaturedDataBlock block={makeBlock()} header={null} bg="" />)

    await waitFor(() => {
      expect(screen.getByText("牛津大学")).toBeInTheDocument()
      expect(screen.getByText("剑桥大学")).toBeInTheDocument()
    })

    expect(mockGet).toHaveBeenCalledWith(
      "/public/universities/list",
      { params: { is_featured: true, page_size: 3 } },
    )
  })

  it("院校渲染 QS 排名徽章", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_UNIVERSITIES } })

    render(<FeaturedDataBlock block={makeBlock()} header={null} bg="" />)

    await waitFor(() => {
      expect(screen.getByText(/QS 2025 #3/)).toBeInTheDocument()
    })
  })

  it("院校有 logo 时渲染图片", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_UNIVERSITIES } })

    render(<FeaturedDataBlock block={makeBlock()} header={null} bg="" />)

    await waitFor(() => {
      const logoImg = screen.getByAltText("剑桥大学")
      expect(logoImg).toHaveAttribute("src", "/api/public/images/detail?id=logo-1")
    })
  })

  it("请求案例数据并渲染", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_CASES } })

    const block = makeBlock({ options: { dataType: "cases", maxItems: 6 } })
    render(<FeaturedDataBlock block={block} header={null} bg="" />)

    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument()
      expect(screen.getByText("MIT")).toBeInTheDocument()
    })

    expect(mockGet).toHaveBeenCalledWith(
      "/public/cases/list",
      { params: { is_featured: true, page_size: 6 } },
    )
  })

  it("无数据时显示暂无数据", async () => {
    mockGet.mockResolvedValue({ data: { items: [] } })

    render(<FeaturedDataBlock block={makeBlock()} header={null} bg="" />)

    await waitFor(() => {
      expect(screen.getByText("暂无数据")).toBeInTheDocument()
    })
  })

  it("API 错误时显示暂无数据", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"))

    render(<FeaturedDataBlock block={makeBlock()} header={null} bg="" />)

    await waitFor(() => {
      expect(screen.getByText("暂无数据")).toBeInTheDocument()
    })
  })

  it("渲染查看更多链接（院校）", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_UNIVERSITIES } })

    render(<FeaturedDataBlock block={makeBlock()} header={null} bg="" />)

    await waitFor(() => {
      /* viewMore 和 → 在同一个 a 标签内 */
      const link = screen.getByText(/viewMore/).closest("a")
      expect(link).toHaveAttribute("href", "/universities")
    })
  })

  it("渲染查看更多链接（案例）", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_CASES } })

    const block = makeBlock({ options: { dataType: "cases" } })
    render(<FeaturedDataBlock block={block} header={null} bg="" />)

    await waitFor(() => {
      const link = screen.getByText(/viewMore/).closest("a")
      expect(link).toHaveAttribute("href", "/cases")
    })
  })

  it("editable 模式包裹 SpotlightOverlay", async () => {
    mockGet.mockResolvedValue({ data: { items: MOCK_UNIVERSITIES } })
    const onEdit = vi.fn()

    render(
      <FeaturedDataBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("spotlight-overlay")).toBeInTheDocument()
    })
  })
})
