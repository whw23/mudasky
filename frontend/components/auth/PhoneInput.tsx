'use client'

/**
 * 国际手机号输入组件。
 * 带国家码选择器，从系统配置动态获取国家码列表。
 */

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useCountryCodes } from '@/hooks/use-country-codes'
import type { CountryCode } from '@/types/config'

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

/** 从完整号码中解析国家码和本地号码（兼容 +86-xxx 和 +86xxx 格式） */
function parsePhone(full: string, codes: CountryCode[]): { countryCode: string; local: string } {
  for (const c of codes) {
    if (full.startsWith(c.code + '-')) {
      return { countryCode: c.code, local: full.slice(c.code.length + 1) }
    }
    if (full.startsWith(c.code)) {
      return { countryCode: c.code, local: full.slice(c.code.length) }
    }
  }
  return { countryCode: codes[0]?.code ?? '+86', local: full.replace(/^\+?\d{1,4}-?/, '') }
}

/** 获取国家码对应的号码位数要求 */
export function getDigitsForCode(code: string, codes: CountryCode[]): number {
  const found = codes.find((c) => c.code === code)
  return found?.digits ?? 10
}

/** 校验手机号是否合法（含国家码） */
export function isValidPhone(fullPhone: string, codes: CountryCode[]): boolean {
  const { countryCode, local } = parsePhone(fullPhone, codes)
  const digits = getDigitsForCode(countryCode, codes)
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
  const countryCodes = useCountryCodes()
  const parsed = parsePhone(value, countryCodes)
  const [countryCode, setCountryCode] = useState(parsed.countryCode)
  const localNumber = parsed.local

  /** 国家码变更 */
  function handleCodeChange(newCode: string): void {
    setCountryCode(newCode)
    onChange(newCode + '-' + localNumber)
  }

  /** 号码变更（只允许数字） */
  function handleNumberChange(num: string): void {
    const cleaned = num.replace(/\D/g, '')
    onChange(countryCode + '-' + cleaned)
  }

  const currentCountry = countryCodes.find((c) => c.code === countryCode)
  const maxDigits = currentCountry?.digits ?? 10

  return (
    <div className="flex gap-1.5 w-full">
      <select
        value={countryCode}
        onChange={(e) => handleCodeChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-28 shrink-0 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {countryCodes.map((c) => (
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
