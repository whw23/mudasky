/**
 * SmsCodeButton 短信验证码按钮组件测试。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
}))

vi.mock('@/lib/api-error', () => ({
  getApiError: (_err: unknown, _t: unknown, fallback: string) => fallback,
}))

vi.mock('@/components/auth/PhoneInput', () => ({
  isValidPhone: (phone: string) => phone.length >= 10,
}))

import { SmsCodeButton } from '@/components/auth/SmsCodeButton'
import api from '@/lib/api'
import type { CountryCode } from '@/types/config'

const MOCK_CODES: CountryCode[] = [
  { code: '+86', country: '中国', label: '中国 +86', digits: 11, enabled: true },
]

const VALID_PHONE = '+8613800138000'
const INVALID_PHONE = '+861'

describe('SmsCodeButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('渲染发送验证码按钮文本', () => {
    render(<SmsCodeButton phone={VALID_PHONE} countryCodes={MOCK_CODES} />)
    expect(screen.getByRole('button', { name: 'sendCode' })).toBeInTheDocument()
  })

  it('手机号有效时按钮可点击', () => {
    render(<SmsCodeButton phone={VALID_PHONE} countryCodes={MOCK_CODES} />)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('手机号无效时按钮禁用', () => {
    render(<SmsCodeButton phone={INVALID_PHONE} countryCodes={MOCK_CODES} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('手机号为空时按钮禁用', () => {
    render(<SmsCodeButton phone="" countryCodes={MOCK_CODES} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('disabled 属性为 true 时按钮禁用', () => {
    render(<SmsCodeButton phone={VALID_PHONE} countryCodes={MOCK_CODES} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('点击后调用发送短信 API', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    render(<SmsCodeButton phone={VALID_PHONE} countryCodes={MOCK_CODES} />)

    await user.click(screen.getByRole('button', { name: 'sendCode' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/sms-code', { phone: VALID_PHONE })
    })
  })

  it('发送成功后按钮显示倒计时并禁用', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    render(<SmsCodeButton phone={VALID_PHONE} countryCodes={MOCK_CODES} />)

    await user.click(screen.getByRole('button', { name: 'sendCode' }))

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button')).toHaveTextContent(/\d+s/)
    })
  })

  it('发送失败时显示错误提示', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.post).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<SmsCodeButton phone={VALID_PHONE} countryCodes={MOCK_CODES} />)

    await user.click(screen.getByRole('button', { name: 'sendCode' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
