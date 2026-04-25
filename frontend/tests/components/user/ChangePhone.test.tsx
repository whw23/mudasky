/**
 * ChangePhone 组件测试。
 * 验证修改手机号表单的渲染和交互。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

const mockFetchUser = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      phone: "+8613800138000",
      username: "testuser",
    },
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

import { ChangePhone } from "@/components/user/ChangePhone"
import api from "@/lib/api"
import { toast } from "sonner"

describe("ChangePhone", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染修改手机号标题和表单字段", () => {
    render(<ChangePhone />)

    /* 标题和提交按钮都显示 changePhone */
    const changePhoneTexts = screen.getAllByText("changePhone")
    expect(changePhoneTexts.length).toBe(2)
    expect(screen.getByText("newPhone")).toBeInTheDocument()
    expect(screen.getByText("smsCode")).toBeInTheDocument()
  })

  it("渲染手机号输入框", () => {
    render(<ChangePhone />)

    expect(screen.getByTestId("phone-input")).toBeInTheDocument()
  })

  it("渲染验证码输入框", () => {
    render(<ChangePhone />)

    expect(screen.getByLabelText("smsCode")).toBeInTheDocument()
  })

  it("渲染 SMS 验证码按钮", () => {
    render(<ChangePhone />)

    expect(screen.getByTestId("sms-code-btn")).toBeInTheDocument()
  })

  it("渲染提交按钮", () => {
    render(<ChangePhone />)

    /* 按钮文本与标题相同 */
    const buttons = screen.getAllByText("changePhone")
    const submitBtn = buttons.find((el) => el.tagName === "BUTTON")
    expect(submitBtn).toBeTruthy()
  })

  it("提交成功后调用 fetchUser 并显示成功提示", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<ChangePhone />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613900139000")
    await userEvent.type(screen.getByLabelText("smsCode"), "654321")

    const submitBtn = screen.getAllByText("changePhone")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/portal/profile/phone", {
        new_phone: "+8613900139000",
        code: "654321",
      })
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("phoneChanged")
      expect(mockFetchUser).toHaveBeenCalled()
    })
  })

  it("API 失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Server Error"))

    render(<ChangePhone />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613900139000")
    await userEvent.type(screen.getByLabelText("smsCode"), "654321")

    const submitBtn = screen.getAllByText("changePhone")
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

    render(<ChangePhone />)

    await userEvent.type(screen.getByTestId("phone-input"), "+8613900139000")
    await userEvent.type(screen.getByLabelText("smsCode"), "654321")

    const submitBtn = screen.getAllByText("changePhone")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    expect(screen.getByText("saving")).toBeInTheDocument()

    resolvePost!({ data: {} })
    await waitFor(() => {
      expect(screen.queryByText("saving")).not.toBeInTheDocument()
    })
  })

  it("成功提交后表单重置", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<ChangePhone />)

    const phoneInput = screen.getByTestId("phone-input")
    const codeInput = screen.getByLabelText("smsCode")

    await userEvent.type(phoneInput, "+8613900139000")
    await userEvent.type(codeInput, "654321")

    const submitBtn = screen.getAllByText("changePhone")
      .find((el) => el.tagName === "BUTTON")!
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(phoneInput).toHaveValue("")
      expect(codeInput).toHaveValue("")
    })
  })
})
