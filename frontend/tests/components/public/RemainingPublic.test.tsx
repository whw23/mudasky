/**
 * UniversityMap + ImageGallery 公开组件测试。
 * UniversityMap 通过 next/dynamic 加载 UniversityMapInner。
 * ImageGallery 已在 SmallComponents.test.tsx 中测试，此处补充边界场景。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

/* ─── UniversityMap ─── */

vi.mock("next/dynamic", () => ({
  default: () => {
    const Component = (props: any) => (
      <div data-testid="university-map-inner" data-lat={props.latitude} data-lng={props.longitude}>
        {props.name}
      </div>
    )
    return Component
  },
}))

import { UniversityMap } from "@/components/public/UniversityMap"

describe("UniversityMap", () => {
  it("渲染 dynamic 包装的内部组件", () => {
    render(
      <UniversityMap latitude={40.0} longitude={116.3} name="北京大学" />,
    )

    expect(screen.getByTestId("university-map-inner")).toBeInTheDocument()
    expect(screen.getByText("北京大学")).toBeInTheDocument()
  })

  it("传递坐标 props", () => {
    render(
      <UniversityMap latitude={31.3} longitude={121.5} name="复旦大学" />,
    )

    const el = screen.getByTestId("university-map-inner")
    expect(el).toHaveAttribute("data-lat", "31.3")
    expect(el).toHaveAttribute("data-lng", "121.5")
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
