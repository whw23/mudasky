/**
 * RegisterModal 注册弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockFetchUser = vi.fn()
const mockHideAuthModal = vi.fn()
const mockShowLoginModal = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    authModal: 'register' as const,
    hideAuthModal: mockHideAuthModal,
    fetchUser: mockFetchUser,
    showLoginModal: mockShowLoginModal,
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

/* mock 子组件 */
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
  PasswordInput: ({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string }) => (
    <input data-testid={id || 'password-input'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  ),
}))

import { RegisterModal } from '@/components/auth/RegisterModal'
import api from '@/lib/api'

describe('RegisterModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('authModal 为 register 时渲染注册弹窗', () => {
    render(<RegisterModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'registerTitle' })).toBeInTheDocument()
  })

  it('显示手机号和验证码输入区域', () => {
    render(<RegisterModal />)
    expect(screen.getByTestId('phone-input')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('codePlaceholder')).toBeInTheDocument()
  })

  it('显示可选的用户名输入', () => {
    render(<RegisterModal />)
    expect(screen.getByPlaceholderText('usernamePlaceholder')).toBeInTheDocument()
  })

  it('点击"去登录"调用 showLoginModal', async () => {
    const user = userEvent.setup()
    render(<RegisterModal />)
    await user.click(screen.getByText('goLogin'))
    expect(mockShowLoginModal).toHaveBeenCalled()
  })

  it('提交注册表单发送正确参数', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    mockFetchUser.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RegisterModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.type(screen.getByPlaceholderText('usernamePlaceholder'), 'testuser')
    await user.click(screen.getByRole('button', { name: 'registerButton' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        phone: '+8613800138000',
        code: '123456',
        username: 'testuser',
      }))
    })
  })

  it('注册成功后调用 fetchUser 和 hideAuthModal', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    mockFetchUser.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RegisterModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'registerButton' }))

    await waitFor(() => {
      expect(mockFetchUser).toHaveBeenCalled()
      expect(mockHideAuthModal).toHaveBeenCalled()
    })
  })

  it('注册失败时显示错误信息', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('failed'))
    const user = userEvent.setup()
    render(<RegisterModal />)

    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'registerButton' }))

    await waitFor(() => {
      expect(screen.getByText('registerFailed')).toBeInTheDocument()
    })
  })

  it('密码不匹配时显示错误', async () => {
    const user = userEvent.setup()
    render(<RegisterModal />)

    await user.type(screen.getByTestId('reg-password'), 'password123')
    await user.type(screen.getByTestId('reg-confirm-password'), 'different')
    await user.type(screen.getByTestId('phone-input'), '+8613800138000')
    await user.type(screen.getByPlaceholderText('codePlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'registerButton' }))

    expect(screen.getByText('passwordMismatch')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })
})
