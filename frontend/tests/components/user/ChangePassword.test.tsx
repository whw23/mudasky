/**
 * ChangePassword 组件测试。
 * 验证修改密码表单的渲染和交互。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      phone: "+8613800138000",
      username: "testuser",
    },
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

vi.mock("@/lib/crypto", () => ({
  encryptPassword: vi.fn().mockResolvedValue({
    encrypted_password: "encrypted",
    nonce: "nonce123",
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

import { ChangePassword } from "@/components/user/ChangePassword"
import api from "@/lib/api"
import { toast } from "sonner"
import { encryptPassword } from "@/lib/crypto"

describe("ChangePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染修改密码标题和表单", () => {
    render(<ChangePassword />)

    /* 标题和提交按钮都显示 changePassword */
    const changePasswordTexts = screen.getAllByText("changePassword")
    expect(changePasswordTexts.length).toBe(2)
    expect(screen.getByText("phone")).toBeInTheDocument()
    expect(screen.getByText("smsCode")).toBeInTheDocument()
    expect(screen.getByText("newPassword")).toBeInTheDocument()
    expect(screen.getByText("confirmPassword")).toBeInTheDocument()
  })

  it("渲染手机号输入框", () => {
    render(<ChangePassword />)

    expect(screen.getByTestId("phone-input")).toBeInTheDocument()
  })

  it("渲染密码输入框", () => {
    render(<ChangePassword />)

    expect(screen.getByTestId("password-new-password")).toBeInTheDocument()
    expect(screen.getByTestId("password-confirm-password")).toBeInTheDocument()
  })

  it("渲染 SMS 验证码按钮", () => {
    render(<ChangePassword />)

    expect(screen.getByTestId("sms-code-btn")).toBeInTheDocument()
  })

  it("渲染提交按钮", () => {
    render(<ChangePassword />)

    /* 表单底部的提交按钮文本与标题相同：changePassword */
    const buttons = screen.getAllByText("changePassword")
    const submitBtn = buttons.find((el) => el.tagName === "BUTTON")
    expect(submitBtn).toBeTruthy()
  })

  it("密码不匹配时显示错误提示", async () => {
    render(<ChangePassword />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613800138000")
    await userEvent.type(screen.getByLabelText("smsCode"), "123456")
    await userEvent.type(screen.getByTestId("password-new-password"), "password1")
    await userEvent.type(screen.getByTestId("password-confirm-password"), "password2")

    const submitBtn = screen.getAllByText("changePassword")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("passwordMismatch")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("密码匹配时提交成功", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<ChangePassword />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613800138000")
    await userEvent.type(screen.getByLabelText("smsCode"), "123456")
    await userEvent.type(screen.getByTestId("password-new-password"), "newpass")
    await userEvent.type(screen.getByTestId("password-confirm-password"), "newpass")

    const submitBtn = screen.getAllByText("changePassword")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(vi.mocked(encryptPassword)).toHaveBeenCalledWith("newpass")
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/portal/profile/password", {
        phone: "+8613800138000",
        code: "123456",
        encrypted_password: "encrypted",
        nonce: "nonce123",
      })
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("passwordChanged")
    })
  })

  it("API 失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Server Error"))

    render(<ChangePassword />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613800138000")
    await userEvent.type(screen.getByLabelText("smsCode"), "123456")
    await userEvent.type(screen.getByTestId("password-new-password"), "newpass")
    await userEvent.type(screen.getByTestId("password-confirm-password"), "newpass")

    const submitBtn = screen.getAllByText("changePassword")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("changeFailed")
    })
  })

  it("提交过程中按钮显示 saving", async () => {
    let resolvePost: (v: unknown) => void
    vi.mocked(api.post).mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve }),
    )

    render(<ChangePassword />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613800138000")
    await userEvent.type(screen.getByLabelText("smsCode"), "123456")
    await userEvent.type(screen.getByTestId("password-new-password"), "pass")
    await userEvent.type(screen.getByTestId("password-confirm-password"), "pass")

    const submitBtn = screen.getAllByText("changePassword")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    expect(screen.getByText("saving")).toBeInTheDocument()

    resolvePost!({ data: {} })
    await waitFor(() => {
      expect(screen.queryByText("saving")).not.toBeInTheDocument()
    })
  })
})
