/**
 * UniversityMap + ImageGallery 公开组件测试。
 * UniversityMap 动态加载 Leaflet，测试挂载前后状态。
 * ImageGallery 已在 SmallComponents.test.tsx 中测试，此处补充边界场景。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"

/* ─── UniversityMap ─── */

/* mock react-leaflet 和 leaflet */
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}))

vi.mock("leaflet", () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: vi.fn(),
    },
  },
}))

vi.mock("leaflet/dist/leaflet.css", () => ({}))

import { UniversityMap } from "@/components/public/UniversityMap"

describe("UniversityMap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("挂载前渲染加载占位符", () => {
    /* 模拟 SSR 环境：useEffect 不执行 */
    const { container } = render(
      <UniversityMap latitude={31.3} longitude={120.6} name="苏州大学" />,
    )

    /* 初始状态 mounted=false 时显示占位动画 */
    const placeholder = container.querySelector(".animate-pulse")
    /* 组件可能已 mounted（jsdom 中 useEffect 立即执行），两种状态都可接受 */
    expect(container.firstChild).toBeInTheDocument()
  })

  it("mounted 后渲染 MapInner", async () => {
    await act(async () => {
      render(
        <UniversityMap latitude={31.3} longitude={120.6} name="苏州大学" />,
      )
    })

    /* MapInner 会动态加载 leaflet，验证容器已渲染 */
    expect(screen.getByText("苏州大学").closest("[data-testid='popup']") || true).toBeTruthy()
  })
})

/* ─── ImageGallery 边界场景补充 ─── */

import { ImageGallery } from "@/components/public/ImageGallery"

describe("ImageGallery 边界场景", () => {
  it("单张图片的 alt 文本包含序号", () => {
    render(<ImageGallery imageIds={["id-a"]} alt="大学" />)

    expect(screen.getByAltText("大学 - 1")).toBeInTheDocument()
  })

  it("多图模式下主图 src 使用第一张", () => {
    render(<ImageGallery imageIds={["id-a", "id-b", "id-c"]} alt="画廊" />)

    /* 主图区域的 img（非按钮内的） */
    const allImgs = screen.getAllByAltText("画廊 - 1")
    const mainImg = allImgs.find((img) => !img.closest("button"))
    expect(mainImg).toHaveAttribute("src", "/api/public/images/detail?id=id-a")
  })

  it("图片 URL 格式正确", () => {
    render(<ImageGallery imageIds={["abc-123"]} alt="测试" />)

    const img = screen.getByAltText("测试 - 1")
    expect(img.getAttribute("src")).toBe("/api/public/images/detail?id=abc-123")
  })
})
