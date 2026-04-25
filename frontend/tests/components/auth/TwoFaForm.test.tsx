/**
 * TwoFaForm 二步验证表单组件测试。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/hooks/use-country-codes', () => ({
  useCountryCodes: () => [
    { code: '+86', country: '中国', label: '中国 +86', digits: 11, enabled: true },
  ],
}))

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
}))

vi.mock('@/lib/api-error', () => ({
  getApiError: (_err: unknown, _t: unknown, fallback: string) => fallback,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

import { TwoFaForm } from '@/components/auth/TwoFaForm'

describe('TwoFaForm', () => {
  const defaultProps = {
    phone: '+8613800138000',
    hasTotp: false,
    hasPhone: false,
    loading: false,
    error: '',
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('只有 TOTP 时渲染 TOTP 输入框', () => {
    render(<TwoFaForm {...defaultProps} hasTotp hasPhone={false} />)

    expect(screen.getByLabelText('totpLabel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('totpPlaceholder')).toBeInTheDocument()
  })

  it('只有手机验证时渲染短信输入框', () => {
    render(<TwoFaForm {...defaultProps} hasTotp={false} hasPhone />)

    expect(screen.getByLabelText('smsLabel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('codePlaceholder')).toBeInTheDocument()
  })

  it('两种方式都有时显示切换按钮', () => {
    render(<TwoFaForm {...defaultProps} hasTotp hasPhone />)

    expect(screen.getByRole('button', { name: 'totpTab' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'smsTab' })).toBeInTheDocument()
  })

  it('两种方式都有时默认显示 TOTP', () => {
    render(<TwoFaForm {...defaultProps} hasTotp hasPhone />)

    expect(screen.getByLabelText('totpLabel')).toBeInTheDocument()
  })

  it('点击短信 tab 切换到短信验证', async () => {
    const user = userEvent.setup()
    render(<TwoFaForm {...defaultProps} hasTotp hasPhone />)

    await user.click(screen.getByRole('button', { name: 'smsTab' }))

    expect(screen.getByLabelText('smsLabel')).toBeInTheDocument()
  })

  it('提交 TOTP 验证码', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TwoFaForm {...defaultProps} hasTotp onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('totpPlaceholder'), '123456')
    await user.click(screen.getByRole('button', { name: 'confirm' }))

    expect(onSubmit).toHaveBeenCalledWith({ totp: '123456' })
  })

  it('提交短信验证码', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TwoFaForm {...defaultProps} hasPhone onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('codePlaceholder'), '654321')
    await user.click(screen.getByRole('button', { name: 'confirm' }))

    expect(onSubmit).toHaveBeenCalledWith({ sms_code_2fa: '654321' })
  })

  it('显示错误信息', () => {
    render(<TwoFaForm {...defaultProps} hasTotp error="验证码错误" />)

    expect(screen.getByText('验证码错误')).toBeInTheDocument()
  })

  it('无错误时不显示错误区域', () => {
    render(<TwoFaForm {...defaultProps} hasTotp error="" />)

    expect(screen.queryByText('验证码错误')).not.toBeInTheDocument()
  })

  it('loading 状态下按钮显示验证中', () => {
    render(<TwoFaForm {...defaultProps} hasTotp loading />)

    expect(screen.getByRole('button', { name: 'verifying' })).toBeDisabled()
  })

  it('非 loading 状态下按钮显示确认', () => {
    render(<TwoFaForm {...defaultProps} hasTotp />)

    expect(screen.getByRole('button', { name: 'confirm' })).not.toBeDisabled()
  })
})
