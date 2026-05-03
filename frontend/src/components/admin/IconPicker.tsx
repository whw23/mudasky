"use client"

/**
 * 图标选择器。
 * Popover 形式，搜索 + 网格 + 文本输入 + 实时预览。
 */

import { useState, useMemo } from "react"
import { icons, type LucideIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { resolveIcon } from "@/lib/icon-utils"
import { Search } from "lucide-react"

/** 常用图标子集（默认显示） */
const COMMON_ICONS = [
  "Phone", "Mail", "MessageCircle", "MapPin", "Building",
  "Globe", "Clock", "Smartphone", "Link", "FileText",
  "Briefcase", "GraduationCap", "Heart", "Star", "Users",
  "Home", "Calendar", "Camera", "Book", "Award",
  "CheckCircle", "AlertCircle", "Info", "HelpCircle", "Shield",
  "Wifi", "Printer", "Monitor", "Headphones", "Mic",
  "Video", "Image", "Music", "Download", "Upload",
  "Send", "Share", "Bookmark", "Flag", "Tag",
  "Coffee", "Utensils", "Car", "Plane", "Train",
  "Bus", "Bike", "Anchor", "Compass", "Map",
]

interface IconPickerProps {
  /** 当前图标名称 */
  value: string
  /** 选中图标回调 */
  onChange: (name: string) => void
  className?: string
}

/** 图标选择器 */
export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [textInput, setTextInput] = useState(value)

  const CurrentIcon = resolveIcon(value)

  /** 过滤图标列表 */
  const filteredIcons = useMemo(() => {
    if (!search.trim()) return COMMON_ICONS
    const q = search.toLowerCase()
    return Object.keys(icons).filter((name) =>
      name.toLowerCase().includes(q),
    ).slice(0, 60)
  }, [search])

  /** 选择图标 */
  function handleSelect(name: string): void {
    onChange(name)
    setTextInput(name)
    setOpen(false)
    setSearch("")
  }

  /** 手动输入图标名称 */
  function handleTextChange(text: string): void {
    setTextInput(text)
    if (resolveIcon(text)) {
      onChange(text)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent ${className ?? ""}`}
      >
        {CurrentIcon && <CurrentIcon className="size-5 text-primary" />}
        <span className="text-muted-foreground">
          {value || "选择图标"}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索图标名称..."
            className="pl-8"
          />
        </div>

        {/* 当前选中预览 */}
        {value && (
          <div className="mb-3 flex items-center gap-2 rounded bg-primary/5 px-2 py-1.5 text-sm">
            {CurrentIcon && <CurrentIcon className="size-4 text-primary" />}
            <span className="font-medium text-primary">{value}</span>
            <span className="ml-auto text-xs text-muted-foreground">当前选中</span>
          </div>
        )}

        {/* 图标网格 */}
        <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
          {filteredIcons.map((name) => {
            const Icon = icons[name as keyof typeof icons] as LucideIcon | undefined
            if (!Icon) return null
            const isActive = name === value
            return (
              <button
                key={name}
                type="button"
                title={name}
                className={`flex size-9 items-center justify-center rounded transition-colors ${
                  isActive
                    ? "border border-primary bg-primary/10"
                    : "hover:bg-accent"
                }`}
                onClick={() => handleSelect(name)}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-6 py-4 text-center text-xs text-muted-foreground">
              未找到匹配图标
            </div>
          )}
        </div>

        {/* 手动输入 */}
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Input
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="手动输入图标名称"
              className="text-xs"
            />
            <span className="shrink-0 text-xs text-muted-foreground">手动输入</span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            参考{" "}
            <a
              href="https://lucide.dev/icons/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Lucide 图标库
            </a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
