/**
 * NavEditor 导航栏编辑器组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "zh",
}))

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

vi.mock("@/lib/i18n-config", () => ({
  getLocalizedValue: (val: string | Record<string, string>) => {
    if (typeof val === "string") return val
    return val.zh ?? val.en ?? Object.values(val)[0] ?? ""
  },
}))

/* mock 拖拽库 - 简化渲染 */
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (p: unknown) => React.ReactNode }) =>
    children({
      innerRef: vi.fn(),
      droppableProps: {},
      placeholder: null,
    }),
  Draggable: ({ children }: { children: (p: unknown, s: unknown) => React.ReactNode }) =>
    children(
      { innerRef: vi.fn(), draggableProps: { style: {} }, dragHandleProps: {} },
      { isDragging: false },
    ),
}))

/* mock 子对话框 */
vi.mock("@/components/admin/web-settings/AddNavItemDialog", () => ({
  AddNavItemDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-nav-dialog" /> : null,
}))

vi.mock("@/components/admin/web-settings/RemoveNavItemDialog", () => ({
  RemoveNavItemDialog: ({ open, name }: { open: boolean; name: string }) =>
    open ? <div data-testid="remove-nav-dialog">{name}</div> : null,
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { NavEditor } from "@/components/admin/web-settings/NavEditor"

describe("NavEditor", () => {
  const defaultProps = {
    activePage: "home",
    onPageChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("获取导航配置后渲染预设导航项", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "about", "universities"],
        custom_items: [],
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      /* 预设导航使用 tNav 翻译 key */
      expect(screen.getByText("home")).toBeInTheDocument()
      expect(screen.getByText("about")).toBeInTheDocument()
      expect(screen.getByText("universities")).toBeInTheDocument()
    })
  })

  it("渲染自定义导航项名称", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "custom-page"],
        custom_items: [{ slug: "custom-page", name: "自定义页" }],
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("自定义页")).toBeInTheDocument()
    })
  })

  it("自定义项显示删除按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "custom-page"],
        custom_items: [{ slug: "custom-page", name: "自定义页" }],
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByLabelText("删除 自定义页")).toBeInTheDocument()
    })
  })

  it("预设项不显示删除按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home"],
        custom_items: [],
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.queryByLabelText(/删除/)).not.toBeInTheDocument()
    })
  })

  it("渲染新增按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { order: ["home"], custom_items: [] },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByLabelText("添加导航项")).toBeInTheDocument()
    })
  })

  it("点击导航项调用 onPageChange", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { order: ["home", "about"], custom_items: [] },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("about")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText("about"))

    expect(defaultProps.onPageChange).toHaveBeenCalledWith("about")
  })

  it("点击新增按钮打开 AddNavItemDialog", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { order: ["home"], custom_items: [] },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByLabelText("添加导航项")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText("添加导航项"))

    expect(screen.getByTestId("add-nav-dialog")).toBeInTheDocument()
  })

  it("获取导航配置失败显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("fail"))

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("获取导航配置失败")
    })
  })

  it("点击自定义项删除按钮打开 RemoveNavItemDialog", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "my-page"],
        custom_items: [{ slug: "my-page", name: "我的页面" }],
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByLabelText("删除 我的页面")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText("删除 我的页面"))

    expect(screen.getByTestId("remove-nav-dialog")).toBeInTheDocument()
    /* "我的页面" 同时出现在导航按钮和对话框中，确认对话框存在即可 */
    expect(screen.getAllByText("我的页面").length).toBe(2)
  })
})
