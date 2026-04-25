/**
 * BannerImageEditor Banner 图片管理组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { BannerImageEditor } from "@/components/admin/web-settings/BannerImageEditor"

describe("BannerImageEditor", () => {
  const defaultProps = {
    pageKey: "about",
    imageIds: [] as string[],
    onUpdate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染 Banner 背景图标签", () => {
    render(<BannerImageEditor {...defaultProps} />)

    expect(screen.getByText("Banner 背景图")).toBeInTheDocument()
  })

  it("渲染添加图片按钮", () => {
    render(<BannerImageEditor {...defaultProps} />)

    expect(screen.getByText("添加图片")).toBeInTheDocument()
  })

  it("无图片时显示默认渐变色提示", () => {
    render(<BannerImageEditor {...defaultProps} imageIds={[]} />)

    expect(screen.getByText("未设置背景图，使用默认渐变色")).toBeInTheDocument()
  })

  it("有图片时渲染缩略图列表", () => {
    render(<BannerImageEditor {...defaultProps} imageIds={["id1", "id2", "id3"]} />)

    const images = screen.getAllByAltText("Banner")
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute("src", "/api/public/images/detail?id=id1")
    expect(images[1]).toHaveAttribute("src", "/api/public/images/detail?id=id2")
    expect(images[2]).toHaveAttribute("src", "/api/public/images/detail?id=id3")
  })

  it("有图片时不显示默认提示", () => {
    render(<BannerImageEditor {...defaultProps} imageIds={["id1"]} />)

    expect(screen.queryByText("未设置背景图，使用默认渐变色")).not.toBeInTheDocument()
  })

  it("点击删除按钮成功移除图片", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<BannerImageEditor {...defaultProps} imageIds={["id1"]} />)

    const deleteBtn = screen.getByRole("button")
    await userEvent.click(deleteBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/web-settings/banners/remove", {
        page_key: "about",
        image_id: "id1",
      })
      expect(toast.success).toHaveBeenCalledWith("已移除")
      expect(defaultProps.onUpdate).toHaveBeenCalled()
    })
  })

  it("删除失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<BannerImageEditor {...defaultProps} imageIds={["id1"]} />)

    const deleteBtn = screen.getByRole("button")
    await userEvent.click(deleteBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("移除失败")
    })
  })

  it("file input 使用正确的 pageKey 生成 id", () => {
    const { container } = render(
      <BannerImageEditor {...defaultProps} pageKey="universities" />,
    )

    const fileInput = container.querySelector("#banner-upload-universities")
    expect(fileInput).toBeTruthy()
  })

  it("多张图片都有独立的删除按钮", () => {
    render(<BannerImageEditor {...defaultProps} imageIds={["a", "b"]} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(2)
  })
})
