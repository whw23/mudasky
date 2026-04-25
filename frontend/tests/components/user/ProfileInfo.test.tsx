/**
 * ProfileInfo 组件测试。
 * 验证用户资料卡片的渲染和交互。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types"

/* mock 外部依赖 */
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}(${JSON.stringify(params)})`
    return key
  },
}))

let mockUser: User | null = null
const mockFetchUser = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    fetchUser: mockFetchUser,
    loading: false,
    isLoggedIn: !!mockUser,
    logout: vi.fn(),
    authModal: null,
    showLoginModal: vi.fn(),
    showRegisterModal: vi.fn(),
    hideAuthModal: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-country-codes", () => ({
  useCountryCodes: () => [
    { code: "+86", country: "CN", label: "China", digits: 11, enabled: true },
  ],
}))

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("@/lib/crypto", () => ({
  encryptPassword: vi.fn().mockResolvedValue({
    encrypted_password: "enc",
    nonce: "nonce",
  }),
}))

vi.mock("@/lib/api-error", () => ({
  getApiError: (_err: unknown, _tErr: unknown, fallback: string) => fallback,
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/components/auth/PasswordInput", () => ({
  PasswordInput: ({ id, value, onChange, placeholder }: {
    id: string; value: string; onChange: (v: string) => void; placeholder?: string
  }) => (
    <input
      id={id}
      data-testid={`password-${id}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

vi.mock("@/components/auth/PhoneInput", () => ({
  PhoneInput: ({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string
  }) => (
    <input
      data-testid="phone-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

vi.mock("@/components/auth/SmsCodeButton", () => ({
  SmsCodeButton: () => <button data-testid="sms-code-btn">SMS</button>,
}))

vi.mock("@/components/user/SessionManagement", () => ({
  SessionManagement: () => <div data-testid="session-management">Sessions</div>,
}))

import { ProfileInfo } from "@/components/user/ProfileInfo"

/** 创建默认用户 */
function createMockUser(overrides?: Partial<User>): User {
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

describe("ProfileInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = createMockUser()
  })

  it("渲染用户名、手机号和角色", () => {
    render(<ProfileInfo />)

    expect(screen.getByText("testuser")).toBeInTheDocument()
    expect(screen.getByText("+8613800138000")).toBeInTheDocument()
    expect(screen.getByText("student")).toBeInTheDocument()
  })

  it("用户名为空时显示 notSet 占位文本", () => {
    mockUser = createMockUser({ username: null })
    render(<ProfileInfo />)

    const notSetTexts = screen.getAllByText("notSet")
    expect(notSetTexts.length).toBeGreaterThanOrEqual(1)
  })

  it("无用户时不渲染内容", () => {
    mockUser = null
    const { container } = render(<ProfileInfo />)
    expect(container.innerHTML).toBe("")
  })

  it("显示编辑按钮", () => {
    render(<ProfileInfo />)

    const editButtons = screen.getAllByText("edit")
    expect(editButtons.length).toBeGreaterThanOrEqual(2)
  })

  it("点击编辑按钮展开用户名编辑表单", async () => {
    render(<ProfileInfo />)

    const editButtons = screen.getAllByText("edit")
    await userEvent.click(editButtons[0])

    expect(screen.getByPlaceholderText("usernamePlaceholder")).toBeInTheDocument()
    expect(screen.getByText("cancel")).toBeInTheDocument()
  })

  it("渲染 2FA 未启用状态", () => {
    render(<ProfileInfo />)

    expect(screen.getByText("twoFaStatusDisabled")).toBeInTheDocument()
    expect(screen.getByText("enableTwoFa")).toBeInTheDocument()
  })

  it("渲染 2FA 已启用状态", () => {
    mockUser = createMockUser({
      two_factor_enabled: true,
      two_factor_method: "totp",
    })
    render(<ProfileInfo />)

    expect(screen.getByText(/twoFaStatusEnabled/)).toBeInTheDocument()
    expect(screen.getByText("disableTwoFa")).toBeInTheDocument()
  })

  it("显示密码设置行", () => {
    render(<ProfileInfo />)

    expect(screen.getByText("changePassword")).toBeInTheDocument()
    expect(screen.getByText("passwordSet")).toBeInTheDocument()
  })

  it("渲染登录设备管理区块", () => {
    render(<ProfileInfo />)

    expect(screen.getByTestId("session-management")).toBeInTheDocument()
  })

  it("有手机号时显示注销账号按钮", () => {
    render(<ProfileInfo />)

    expect(screen.getByText("deleteAccountButton")).toBeInTheDocument()
  })

  it("无手机号时不显示注销账号按钮", () => {
    mockUser = createMockUser({ phone: null })
    render(<ProfileInfo />)

    expect(screen.queryByText("deleteAccountButton")).not.toBeInTheDocument()
  })

  it("无角色名时不显示角色标签", () => {
    mockUser = createMockUser({ role_name: null })
    render(<ProfileInfo />)

    expect(screen.queryByText("student")).not.toBeInTheDocument()
  })

  it("点击启用 2FA 按钮展开方式选择", async () => {
    render(<ProfileInfo />)

    await userEvent.click(screen.getByText("enableTwoFa"))

    expect(screen.getByText("methodTotp")).toBeInTheDocument()
    expect(screen.getByText("methodSms")).toBeInTheDocument()
  })
})
