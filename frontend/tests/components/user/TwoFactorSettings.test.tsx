/**
 * TwoFactorSettings 组件测试。
 * 验证两步验证设置的渲染、启用/禁用流程。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

let mockUser: User | null = null
const mockFetchUser = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    fetchUser: mockFetchUser,
  }),
}))

vi.mock("@/hooks/use-country-codes", () => ({
  useCountryCodes: () => [
    { code: "+86", country: "CN", label: "China", digits: 11, enabled: true },
  ],
}))

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn() },
}))

vi.mock("@/lib/api-error", () => ({
  getApiError: (_err: unknown, _tErr: unknown, fallback: string) => fallback,
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/components/auth/SmsCodeButton", () => ({
  SmsCodeButton: () => <button data-testid="sms-code-btn">SMS</button>,
}))

/** mock URL.createObjectURL / revokeObjectURL */
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-qr-url")
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(globalThis, "URL", {
  value: {
    ...globalThis.URL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
})

import { TwoFactorSettings } from "@/components/user/TwoFactorSettings"
import api from "@/lib/api"
import { toast } from "sonner"

/** 创建默认用户 */
function createUser(overrides?: Partial<User>): User {
  return {
    id: "u-1",
    phone: "+8613800138000",
    username: "testuser",
    is_active: true,
    two_factor_enabled: false,
    two_factor_method: null,
    storage_quota: 104857600,
    permissions: [],
    role_id: "r-1",
    role_name: "student",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  }
}

describe("TwoFactorSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = createUser()
  })

  it("渲染两步验证标题", () => {
    render(<TwoFactorSettings />)

    expect(screen.getByText("twoFactorAuth")).toBeInTheDocument()
  })

  it("无用户时不渲染内容", () => {
    mockUser = null
    const { container } = render(<TwoFactorSettings />)
    expect(container.innerHTML).toBe("")
  })

  it("未启用时显示禁用状态和启用按钮", () => {
    render(<TwoFactorSettings />)

    expect(screen.getByText("twoFaStatusDisabled")).toBeInTheDocument()
    expect(screen.getByText("enableTwoFa")).toBeInTheDocument()
  })

  it("已启用时显示启用状态和禁用按钮", () => {
    mockUser = createUser({ two_factor_enabled: true })
    render(<TwoFactorSettings />)

    expect(screen.getByText("twoFaStatusEnabled")).toBeInTheDocument()
    expect(screen.getByText("disableTwoFa")).toBeInTheDocument()
  })

  it("点击启用按钮请求 QR 码并显示扫码界面", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: new Blob(["qr"]) })

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("enableTwoFa"))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/portal/profile/two-factor/enable-totp",
        null,
        { responseType: "blob" },
      )
      expect(screen.getByText("scanQrCode")).toBeInTheDocument()
      expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument()
    })
  })

  it("输入 TOTP 码确认启用成功", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: new Blob(["qr"]) })
      .mockResolvedValueOnce({ data: {} })

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("enableTwoFa"))
    await waitFor(() => {
      expect(screen.getByText("scanQrCode")).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText("totpCode"), "123456")
    await userEvent.click(screen.getByText("confirmEnable"))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/portal/profile/two-factor/confirm-totp",
        { totp_code: "123456" },
      )
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("twoFaEnabled")
      expect(mockFetchUser).toHaveBeenCalled()
    })
  })

  it("启用 API 失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Server Error"))

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("enableTwoFa"))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("enableFailed")
    })
  })

  it("TOTP 确认失败时显示错误提示", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: new Blob(["qr"]) })
      .mockRejectedValueOnce(new Error("Invalid code"))

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("enableTwoFa"))
    await waitFor(() => {
      expect(screen.getByText("scanQrCode")).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText("totpCode"), "000000")
    await userEvent.click(screen.getByText("confirmEnable"))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("confirmFailed")
    })
  })

  it("取消启用流程恢复到未启用状态", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: new Blob(["qr"]) })

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("enableTwoFa"))
    await waitFor(() => {
      expect(screen.getByText("scanQrCode")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText("cancel"))

    expect(screen.getByText("twoFaStatusDisabled")).toBeInTheDocument()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })

  it("点击禁用按钮打开确认弹窗", async () => {
    mockUser = createUser({ two_factor_enabled: true })

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("disableTwoFa"))

    expect(screen.getByText("disableConfirmHint")).toBeInTheDocument()
    expect(screen.getByText("confirmDisable")).toBeInTheDocument()
  })

  it("禁用确认提交成功", async () => {
    mockUser = createUser({ two_factor_enabled: true })
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("disableTwoFa"))

    await userEvent.type(screen.getByLabelText("smsCode"), "654321")
    await userEvent.click(screen.getByText("confirmDisable"))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/portal/profile/two-factor/disable",
        { phone: "+8613800138000", code: "654321" },
      )
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("twoFaDisabled")
      expect(mockFetchUser).toHaveBeenCalled()
    })
  })

  it("禁用确认 API 失败时显示错误提示", async () => {
    mockUser = createUser({ two_factor_enabled: true })
    vi.mocked(api.post).mockRejectedValue(new Error("Fail"))

    render(<TwoFactorSettings />)

    await userEvent.click(screen.getByText("disableTwoFa"))

    await userEvent.type(screen.getByLabelText("smsCode"), "654321")
    await userEvent.click(screen.getByText("confirmDisable"))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("disableFailed")
    })
  })
})
