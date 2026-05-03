"use client"

/** 开关字段。label 上方，Switch 下方左对齐。 */

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface SwitchFieldProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
}

export function SwitchField({ label, checked, onCheckedChange, id }: SwitchFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  )
}
