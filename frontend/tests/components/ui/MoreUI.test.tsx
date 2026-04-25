/**
 * Carousel + AlertDialog UI 组件测试。
 * Select 已在其他测试中充分覆盖（extractLabels 内部逻辑）。
 * 验证 Carousel 上下文、键盘导航和 AlertDialog 结构。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

/* ─── Carousel ─── */

/* mock embla-carousel-react */
const mockScrollPrev = vi.fn()
const mockScrollNext = vi.fn()
const mockCanScrollPrev = vi.fn(() => true)
const mockCanScrollNext = vi.fn(() => true)
const mockOn = vi.fn()
const mockOff = vi.fn()

vi.mock("embla-carousel-react", () => ({
  default: () => [
    vi.fn(),
    {
      scrollPrev: mockScrollPrev,
      scrollNext: mockScrollNext,
      canScrollPrev: mockCanScrollPrev,
      canScrollNext: mockCanScrollNext,
      on: mockOn,
      off: mockOff,
    },
  ],
}))

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"

describe("Carousel", () => {
  it("渲染 carousel region", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    expect(screen.getByRole("region")).toBeInTheDocument()
    expect(screen.getByText("Slide 1")).toBeInTheDocument()
  })

  it("渲染多个 slide", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide A</CarouselItem>
          <CarouselItem>Slide B</CarouselItem>
          <CarouselItem>Slide C</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const slides = screen.getAllByRole("group")
    expect(slides).toHaveLength(3)
  })

  it("slide 有 aria-roledescription", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const slide = screen.getByRole("group")
    expect(slide).toHaveAttribute("aria-roledescription", "slide")
  })

  it("region 有 aria-roledescription carousel", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const region = screen.getByRole("region")
    expect(region).toHaveAttribute("aria-roledescription", "carousel")
  })

  it("Previous 按钮点击调用 scrollPrev", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
      </Carousel>,
    )

    const prevBtn = screen.getByText("Previous slide").closest("button")!
    fireEvent.click(prevBtn)
    expect(mockScrollPrev).toHaveBeenCalled()
  })

  it("Next 按钮点击调用 scrollNext", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselNext />
      </Carousel>,
    )

    const nextBtn = screen.getByText("Next slide").closest("button")!
    fireEvent.click(nextBtn)
    expect(mockScrollNext).toHaveBeenCalled()
  })

  it("ArrowLeft 键触发 scrollPrev", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const region = screen.getByRole("region")
    fireEvent.keyDown(region, { key: "ArrowLeft" })
    expect(mockScrollPrev).toHaveBeenCalled()
  })

  it("ArrowRight 键触发 scrollNext", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const region = screen.getByRole("region")
    fireEvent.keyDown(region, { key: "ArrowRight" })
    expect(mockScrollNext).toHaveBeenCalled()
  })

  it("vertical 方向使用 flex-col", () => {
    const { container } = render(
      <Carousel orientation="vertical">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const content = container.querySelector(".flex-col")
    expect(content).toBeInTheDocument()
  })

  it("horizontal 方向使用 -ml-4", () => {
    const { container } = render(
      <Carousel orientation="horizontal">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    )

    const content = container.querySelector(".-ml-4")
    expect(content).toBeInTheDocument()
  })
})

/* ─── AlertDialog ─── */

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog"

describe("AlertDialog", () => {
  it("渲染 trigger 按钮", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>删除</AlertDialogTrigger>
      </AlertDialog>,
    )

    expect(screen.getByText("删除")).toBeInTheDocument()
  })

  it("AlertDialogHeader 渲染 data-slot", () => {
    const { container } = render(
      <AlertDialogHeader>标题区域</AlertDialogHeader>,
    )

    const header = container.querySelector("[data-slot='alert-dialog-header']")
    expect(header).toBeInTheDocument()
  })

  it("AlertDialogFooter 渲染 data-slot", () => {
    const { container } = render(
      <AlertDialogFooter>操作区域</AlertDialogFooter>,
    )

    const footer = container.querySelector("[data-slot='alert-dialog-footer']")
    expect(footer).toBeInTheDocument()
  })

  it("AlertDialogMedia 渲染 data-slot", () => {
    const { container } = render(
      <AlertDialogMedia>图标</AlertDialogMedia>,
    )

    const media = container.querySelector("[data-slot='alert-dialog-media']")
    expect(media).toBeInTheDocument()
  })

  it("AlertDialogAction 渲染为按钮", () => {
    render(<AlertDialogAction>确认</AlertDialogAction>)

    expect(screen.getByText("确认")).toBeInTheDocument()
    expect(screen.getByText("确认").closest("button")).toBeTruthy()
  })

  it("AlertDialogAction 有 data-slot", () => {
    render(<AlertDialogAction>确认</AlertDialogAction>)

    const btn = screen.getByText("确认").closest("[data-slot='alert-dialog-action']")
    expect(btn).toBeInTheDocument()
  })
})
