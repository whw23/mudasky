/**
 * LoginModal 登录弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockFetchUser = vi.fn()
const mockHideAuthModal = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    authModal: 'login' as const,
    hideAuthModal: mockHideAuthModal,
    fetchUser: mockFetchUser,
    showLoginModal: vi.fn(),
    showRegisterModal: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-country-codes', () => ({
  useCountryCodes: () => [
    { code: '+86', country: '中国', label: '中国 +86', digits: 11, enabled: true },
  ],
}))

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  setKeepLogin: vi.fn(),
}))

vi.mock('@/lib/crypto', () => ({
  encryptPassword: vi.fn().mockResolvedValue({
    encrypted_password: 'encrypted',
    nonce: 'nonce123',
  }),
}))

vi.mock('@/lib/api-error', () => ({
  getApiError: (_err: unknown, _t: unknown, fallback: string) => fallback,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

/* mock 子组件避免内部依赖 */
vi.mock('@/components/auth/PhoneInput', () => ({
  PhoneInput: ({ value, onChange, ...props }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) => (
    <input data-testid="phone-input" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
  ),
  isValidPhone: () => true,
}))
vi.mock('@/components/auth/SmsCodeButton', () => ({
  SmsCodeButton: () => <button type="button">sendCode</button>,
}))
vi.mock('@/components/auth/PasswordInput', () => ({
  PasswordInput: ({ value, onChange, ...props }: { value: string; onChange: (v: string) => void; id?: string; required?: boolean }) => (
    <input data-testid="password-input" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
  ),
}))
vi.mock('@/components/auth/TwoFaForm', () => ({
  TwoFaForm: ({ onSubmit }: { onSubmit: (d: Record<string, string>) => void }) => (
    <div data-testid="two-fa-form">
      <span>twoFaTitle</span>
      <button onClick={() => onSubmit({ totp: '123456' })}>verify</button>
    </div>
  ),
}))

import { LoginModal } from '@/components/auth/LoginModal'
import api from '@/lib/api'
import { encryptPassword } from '@/lib/crypto'

describe('LoginModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('authModal 为 login 时渲染登录弹窗', () => {
    render(<LoginModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('显示短信登录和账号登录 tab', () => {
    render(<LoginModal />)
    expect(screen.getByRole('tab', { name: 'tabSms' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'tabAccount' })).toBeInTheDocument()
  })

  it('切换到账号密码 tab', async () => {
    const user = userEvent.setup()
    render(<LoginModal />)
    await user.click(screen.getByRole('tab', { name: 'tabAccount' }))
    expect(screen.getByTestId('password-input')).toBeInTheDocument()
  })

  it('短信登录提交发送正确参数', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { step: 'done' } })
    mockFetchUser.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'loginOrRegister' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
        phone: '+8613800138000',
        code: '123456',
      }))
    })
  })

  it('账号密码登录提交加密密码', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { step: 'done' } })
    mockFetchUser.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginModal />)

    await user.click(screen.getByRole('tab', { name: 'tabAccount' }))
    await user.type(screen.getByPlaceholderText('accountPlaceholder'), 'testuser')
    await user.type(screen.getByTestId('password-input'), 'password123')
    await user.click(screen.getByRole('button', { name: 'loginButton' }))

    await waitFor(() => {
      expect(encryptPassword).toHaveBeenCalledWith('password123')
      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
        username: 'testuser',
        encrypted_password: 'encrypted',
        nonce: 'nonce123',
      }))
    })
  })

  it('登录成功后调用 fetchUser 和 hideAuthModal', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { step: 'done' } })
    mockFetchUser.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'loginOrRegister' }))

    await waitFor(() => {
      expect(mockFetchUser).toHaveBeenCalled()
      expect(mockHideAuthModal).toHaveBeenCalled()
    })
  })

  it('返回 2fa_required 时显示二步验证', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { step: '2fa_required', two_fa_methods: { has_totp: true, has_phone: false } },
    })
    const user = userEvent.setup()
    render(<LoginModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'loginOrRegister' }))

    await waitFor(() => {
      expect(screen.getByTestId('two-fa-form')).toBeInTheDocument()
    })
  })

  it('登录失败时显示错误信息', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('invalid'))
    const user = userEvent.setup()
    render(<LoginModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'loginOrRegister' }))

    await waitFor(() => {
      expect(screen.getByText('loginFailed')).toBeInTheDocument()
    })
  })
})
