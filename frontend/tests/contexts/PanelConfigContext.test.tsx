/**
 * PanelConfigContext 面板配置上下文测试。
 * 验证 Provider 提供默认值、API 加载后更新配置。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from "@/lib/api"
import {
  PanelConfigProvider,
  usePanelConfig,
  type PanelConfig,
} from "@/contexts/PanelConfigContext"

/** 辅助组件：展示 usePanelConfig 结果 */
function ConfigConsumer() {
  const config = usePanelConfig()
  return (
    <div>
      <span data-testid="admin-count">{config.admin.length}</span>
      <span data-testid="portal-count">{config.portal.length}</span>
      {config.admin.map((p) => (
        <span key={p.key} data-testid={`admin-${p.key}`}>
          {p.key}
        </span>
      ))}
      {config.portal.map((p) => (
        <span key={p.key} data-testid={`portal-${p.key}`}>
          {p.key}
        </span>
      ))}
    </div>
  )
}

function renderWithProvider() {
  return render(
    <PanelConfigProvider>
      <ConfigConsumer />
    </PanelConfigProvider>,
  )
}

describe("PanelConfigContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("API 请求前提供默认空配置", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    renderWithProvider()

    expect(screen.getByTestId("admin-count").textContent).toBe("0")
    expect(screen.getByTestId("portal-count").textContent).toBe("0")
  })

  it("API 成功后更新面板配置", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        value: {
          admin: [
            { key: "dashboard", icon: "LayoutDashboard" },
            { key: "users", icon: "Users", permissions: ["admin/users/*"] },
          ],
          portal: [
            { key: "profile", icon: "User" },
          ],
        },
      },
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("admin-count").textContent).toBe("2")
    })

    expect(screen.getByTestId("portal-count").textContent).toBe("1")
    expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument()
    expect(screen.getByTestId("admin-users")).toBeInTheDocument()
    expect(screen.getByTestId("portal-profile")).toBeInTheDocument()
  })

  it("API 失败时保持默认值", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    renderWithProvider()

    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByTestId("admin-count").textContent).toBe("0")
    expect(screen.getByTestId("portal-count").textContent).toBe("0")
  })

  it("调用正确的 API 路径", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    renderWithProvider()

    expect(api.get).toHaveBeenCalledWith("/public/panel-config")
  })

  it("不在 Provider 内时返回默认值", () => {
    render(<ConfigConsumer />)

    expect(screen.getByTestId("admin-count").textContent).toBe("0")
    expect(screen.getByTestId("portal-count").textContent).toBe("0")
  })

  it("API 响应只有部分字段时合并默认值", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        value: {
          admin: [{ key: "dashboard", icon: "LayoutDashboard" }],
        },
      },
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("admin-count").textContent).toBe("1")
    })

    expect(screen.getByTestId("portal-count").textContent).toBe("0")
  })
})
