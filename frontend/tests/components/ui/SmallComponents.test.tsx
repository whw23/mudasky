/**
 * SafeHtml + ImageGallery + EditableOverlay + HeaderLogo 小组件测试。
 * 验证 HTML 净化渲染、图片画廊切换、可编辑覆盖层和 Logo 渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

/* ─── SafeHtml ─── */

import { SafeHtml } from "@/components/common/SafeHtml"

describe("SafeHtml", () => {
  it("渲染净化后的 HTML 内容", () => {
    const { container } = render(<SafeHtml html="<p>Hello World</p>" />)

    expect(container.querySelector("p")).toBeInTheDocument()
    expect(container.textContent).toContain("Hello World")
  })

  it("移除恶意脚本标签", () => {
    const { container } = render(
      <SafeHtml html='<p>安全内容</p><script>alert("xss")</script>' />,
    )

    expect(container.querySelector("script")).toBeNull()
    expect(container.textContent).toContain("安全内容")
  })

  it("应用自定义 className", () => {
    const { container } = render(
      <SafeHtml html="<p>内容</p>" className="prose max-w-none" />,
    )

    const div = container.firstChild as HTMLElement
    expect(div.className).toContain("prose")
    expect(div.className).toContain("max-w-none")
  })

  it("保留允许的 iframe 标签", () => {
    const { container } = render(
      <SafeHtml html='<iframe src="https://example.com"></iframe>' />,
    )

    expect(container.querySelector("iframe")).toBeInTheDocument()
  })

  it("保留 style 属性", () => {
    const { container } = render(
      <SafeHtml html='<div style="color: red;">红色文字</div>' />,
    )

    const div = container.querySelector("[style]")
    expect(div).toBeInTheDocument()
  })

  it("移除 javascript: URI", () => {
    const { container } = render(
      <SafeHtml html='<a href="javascript:alert(1)">点击</a>' />,
    )

    const link = container.querySelector("a")
    const href = link?.getAttribute("href")
    expect(!href || !href.includes("javascript:")).toBe(true)
  })
})

/* ─── ImageGallery ─── */

import { ImageGallery } from "@/components/public/ImageGallery"

describe("ImageGallery", () => {
  it("渲染主图片", () => {
    render(<ImageGallery imageIds={["img-1"]} alt="测试图片" />)

    const img = screen.getByAltText("测试图片 - 1")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "/api/public/images/detail?id=img-1")
  })

  it("无图片时不渲染", () => {
    const { container } = render(<ImageGallery imageIds={[]} alt="空" />)

    expect(container.firstChild).toBeNull()
  })

  it("多图片时渲染缩略图", () => {
    render(<ImageGallery imageIds={["img-1", "img-2", "img-3"]} alt="画廊" />)

    const thumbnails = screen.getAllByRole("button")
    expect(thumbnails).toHaveLength(3)
  })

  it("单图片时不渲染缩略图", () => {
    render(<ImageGallery imageIds={["img-1"]} alt="单图" />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("点击缩略图切换主图", () => {
    render(<ImageGallery imageIds={["img-1", "img-2"]} alt="切换" />)

    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[1])

    const allImgs = screen.getAllByAltText("切换 - 2")
    const mainImg = allImgs.find((img) => !img.closest("button"))
    expect(mainImg).toHaveAttribute("src", "/api/public/images/detail?id=img-2")
  })

  it("选中缩略图有高亮边框", () => {
    render(<ImageGallery imageIds={["img-1", "img-2"]} alt="高亮" />)

    const buttons = screen.getAllByRole("button")
    expect(buttons[0].className).toContain("border-primary")
    expect(buttons[1].className).toContain("border-transparent")

    fireEvent.click(buttons[1])
    expect(buttons[1].className).toContain("border-primary")
    expect(buttons[0].className).toContain("border-transparent")
  })
})

/* ─── EditableOverlay ─── */

import { EditableOverlay } from "@/components/admin/EditableOverlay"

describe("EditableOverlay", () => {
  it("渲染子元素", () => {
    render(
      <EditableOverlay onClick={vi.fn()} label="编辑">
        <span>内容</span>
      </EditableOverlay>,
    )

    expect(screen.getByText("内容")).toBeInTheDocument()
  })

  it("点击触发 onClick", () => {
    const onClick = vi.fn()

    render(
      <EditableOverlay onClick={onClick} label="编辑">
        <span>内容</span>
      </EditableOverlay>,
    )

    fireEvent.click(screen.getByText("内容"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("设置 title 属性为 label", () => {
    const { container } = render(
      <EditableOverlay onClick={vi.fn()} label="编辑品牌">
        <span>内容</span>
      </EditableOverlay>,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.title).toBe("编辑品牌")
  })

  it("默认使用 div 包装器", () => {
    const { container } = render(
      <EditableOverlay onClick={vi.fn()}>
        <span>内容</span>
      </EditableOverlay>,
    )

    expect(container.firstChild?.nodeName).toBe("DIV")
  })

  it("inline 模式使用 span 包装器", () => {
    const { container } = render(
      <EditableOverlay onClick={vi.fn()} inline>
        <span>内容</span>
      </EditableOverlay>,
    )

    expect(container.firstChild?.nodeName).toBe("SPAN")
  })

  it("阻止事件冒泡", () => {
    const parentClick = vi.fn()
    const childClick = vi.fn()

    render(
      <div onClick={parentClick}>
        <EditableOverlay onClick={childClick}>
          <span>内容</span>
        </EditableOverlay>
      </div>,
    )

    fireEvent.click(screen.getByText("内容"))
    expect(childClick).toHaveBeenCalledTimes(1)
    expect(parentClick).not.toHaveBeenCalled()
  })
})

/* ─── HeaderLogo ─── */

import { HeaderLogo } from "@/components/layout/HeaderLogo"

describe("HeaderLogo", () => {
  it("有 logoUrl 时渲染图片", () => {
    render(<HeaderLogo logoUrl="/logo.png" brandName="测试" size={36} />)

    const img = screen.getByAltText("测试")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "/logo.png")
  })

  it("无 logoUrl 时渲染首字母方块", () => {
    render(<HeaderLogo brandName="品牌" size={36} />)

    expect(screen.getByText("品")).toBeInTheDocument()
  })

  it("图片设置正确尺寸", () => {
    render(<HeaderLogo logoUrl="/logo.png" brandName="测试" size={48} />)

    const img = screen.getByAltText("测试")
    expect(img.style.width).toBe("48px")
    expect(img.style.height).toBe("48px")
  })

  it("首字母方块设置正确尺寸", () => {
    render(<HeaderLogo brandName="品牌" size={48} />)

    const span = screen.getByText("品")
    expect(span.style.width).toBe("48px")
    expect(span.style.height).toBe("48px")
  })

  it("应用自定义 className", () => {
    render(<HeaderLogo logoUrl="/logo.png" brandName="测试" size={36} className="rounded-lg" />)

    const img = screen.getByAltText("测试")
    expect(img.className).toContain("rounded-lg")
  })

  it("无 logoUrl 时首字母方块字体大小为 size 的一半", () => {
    render(<HeaderLogo brandName="品牌" size={48} />)

    const span = screen.getByText("品")
    expect(span.style.fontSize).toBe("24px")
  })
})
