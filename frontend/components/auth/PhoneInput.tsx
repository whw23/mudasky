'use client'

/**
 * 国际手机号输入组件。
 * 带国家码选择器，默认 +86（中国），支持号码位数校验。
 */

import { useState } from 'react'
import { Input } from '@/components/ui/input'

/** 支持的国家码列表 */
const COUNTRY_CODES = [
  { code: '+86', country: '🇨🇳', label: '中国', digits: 11 },
  { code: '+81', country: '🇯🇵', label: '日本', digits: 10 },
  { code: '+49', country: '🇩🇪', label: '德国', digits: 10 },
  { code: '+65', country: '🇸🇬', label: '新加坡', digits: 8 },
  { code: '+1', country: '🇺🇸', label: 'US/CA', digits: 10 },
  { code: '+44', country: '🇬🇧', label: '英国', digits: 10 },
  { code: '+82', country: '🇰🇷', label: '韩国', digits: 10 },
  { code: '+33', country: '🇫🇷', label: '法国', digits: 9 },
] as const

interface PhoneInputProps {
  /** 完整手机号值（含国家码，如 +8613800138000） */
  value: string
  /** 值变化回调，返回完整手机号 */
  onChange: (fullPhone: string) => void
  /** 输入框 id */
  id?: string
  /** 占位文本 */
  placeholder?: string
  /** 是否必填 */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

/** 从完整号码中解析国家码和本地号码 */
function parsePhone(full: string): { countryCode: string; local: string } {
  for (const c of COUNTRY_CODES) {
    if (full.startsWith(c.code)) {
      return { countryCode: c.code, local: full.slice(c.code.length) }
    }
  }
  return { countryCode: '+86', local: full.replace(/^\+?\d{1,3}/, '') }
}

/** 获取国家码对应的号码位数要求 */
export function getDigitsForCode(code: string): number {
  const found = COUNTRY_CODES.find((c) => c.code === code)
  return found?.digits ?? 10
}

/** 校验手机号是否合法（含国家码） */
export function isValidPhone(fullPhone: string): boolean {
  const { countryCode, local } = parsePhone(fullPhone)
  const digits = getDigitsForCode(countryCode)
  return /^\d+$/.test(local) && local.length === digits
}

/** 国际手机号输入框 */
export function PhoneInput({
  value,
  onChange,
  id,
  placeholder,
  required,
  disabled,
}: PhoneInputProps) {
  const parsed = parsePhone(value)
  const [countryCode, setCountryCode] = useState(parsed.countryCode)
  const localNumber = parsed.local

  /** 国家码变更 */
  function handleCodeChange(newCode: string): void {
    setCountryCode(newCode)
    onChange(newCode + localNumber)
  }

  /** 号码变更（只允许数字） */
  function handleNumberChange(num: string): void {
    const cleaned = num.replace(/\D/g, '')
    onChange(countryCode + cleaned)
  }

  const currentCountry = COUNTRY_CODES.find((c) => c.code === countryCode)
  const maxDigits = currentCountry?.digits ?? 10

  return (
    <div className="flex gap-1.5">
      <select
        value={countryCode}
        onChange={(e) => handleCodeChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-28 shrink-0 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.country} {c.code}
          </option>
        ))}
      </select>
      <Input
        id={id}
        type="tel"
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxDigits}
      />
    </div>
  )
}
