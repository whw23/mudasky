/**
 * SessionManagement 组件测试。
 * 验证登录设备管理区块的渲染和交互。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock("@/lib/api-error", () => ({
  getApiError: (_err: unknown, _tErr: unknown, fallback: string) => fallback,
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { SessionManagement } from "@/components/user/SessionManagement"
import api from "@/lib/api"
import { toast } from "sonner"

/** 创建 mock 会话列表 */
function createSessions() {
  return [
    {
      id: "s-1",
      user_agent: "Chrome/120.0.0.0 Windows NT 10.0",
      ip_address: "192.168.1.1",
      created_at: "2024-06-15T10:00:00Z",
      is_current: true,
    },
    {
      id: "s-2",
      user_agent: "Firefox/119.0 Linux x86_64",
      ip_address: "10.0.0.1",
      created_at: "2024-06-14T08:00:00Z",
      is_current: false,
    },
    {
      id: "s-3",
      user_agent: null,
      ip_address: null,
      created_at: "2024-06-13T06:00:00Z",
      is_current: false,
    },
  ]
}

describe("SessionManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染会话管理标题", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    expect(screen.getByText("sessions")).toBeInTheDocument()
  })

  it("加载中显示 loading 文本", () => {
    vi.mocked(api.get).mockImplementation(
      () => new Promise(() => {}),
    )

    render(<SessionManagement />)

    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("渲染会话列表", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText(/Chrome\/120/)).toBeInTheDocument()
      expect(screen.getByText(/Firefox\/119/)).toBeInTheDocument()
    })
  })

  it("当前设备显示 currentDevice 标签", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText("currentDevice")).toBeInTheDocument()
    })
  })

  it("当前设备不显示踢出按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [createSessions()[0]],
    })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText(/Chrome\/120/)).toBeInTheDocument()
    })

    expect(screen.queryByText("revokeSession")).not.toBeInTheDocument()
  })

  it("其他设备显示踢出按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    await waitFor(() => {
      const revokeButtons = screen.getAllByText("revokeSession")
      /* 两个非当前设备 */
      expect(revokeButtons).toHaveLength(2)
    })
  })

  it("user_agent 为空时显示 unknownDevice", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText("unknownDevice")).toBeInTheDocument()
    })
  })

  it("显示 IP 地址", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument()
      expect(screen.getByText(/10\.0\.0\.1/)).toBeInTheDocument()
    })
  })

  it("有其他设备时显示全部踢出按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText("revokeAllOthers")).toBeInTheDocument()
    })
  })

  it("只有当前设备时不显示全部踢出按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [createSessions()[0]],
    })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText(/Chrome\/120/)).toBeInTheDocument()
    })

    expect(screen.queryByText("revokeAllOthers")).not.toBeInTheDocument()
  })

  it("点击踢出按钮调用 revoke API", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getAllByText("revokeSession")).toHaveLength(2)
    })

    await userEvent.click(screen.getAllByText("revokeSession")[0])

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/portal/profile/sessions/list/revoke",
        { token_id: "s-2" },
      )
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("sessionRevoked")
    })
  })

  it("点击全部踢出按钮调用 revoke-all API", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText("revokeAllOthers")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText("revokeAllOthers"))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/portal/profile/sessions/list/revoke-all",
      )
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("allSessionsRevoked")
    })
  })

  it("踢出失败时显示错误提示", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createSessions() })
    vi.mocked(api.post).mockRejectedValue(new Error("Fail"))

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getAllByText("revokeSession")).toHaveLength(2)
    })

    await userEvent.click(screen.getAllByText("revokeSession")[0])

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("saveFailed")
    })
  })

  it("空会话列表显示 noOtherSessions", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    render(<SessionManagement />)

    await waitFor(() => {
      expect(screen.getByText("noOtherSessions")).toBeInTheDocument()
    })
  })

  it("获取会话列表失败时显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network"))

    render(<SessionManagement />)

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("saveFailed")
    })
  })
})
