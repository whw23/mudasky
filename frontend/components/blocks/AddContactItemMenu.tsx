"use client"

/**
 * ContactInfo Block 添加条目下拉菜单。
 * 列出未被引用的全局条目 + 自定义新建选项。
 */

import { useState, useRef, useEffect } from "react"
import { CirclePlus, PenLine } from "lucide-react"
import { useLocale } from "next-intl"
import { getLocalizedValue } from "@/lib/i18n-config"
import { resolveIcon } from "@/lib/icon-utils"
import type { Block, ContactInfoBlockItem } from "@/types/block"
import type { ContactItem } from "@/types/config"

interface AddContactItemMenuProps {
  block: Block
  items: ContactInfoBlockItem[] | null
  globalItems: ContactItem[]
  onEditConfig: (section: string) => void
  compact?: boolean
}

/** 添加条目下拉菜单 */
export function AddContactItemMenu({ block, items, globalItems, onEditConfig, compact }: AddContactItemMenuProps) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const referencedIds = new Set(
    (items ?? []).filter((i) => i.type === "global").map((i) => i.id),
  )
  const availableGlobal = globalItems.filter((g) => !referencedIds.has(g.id))

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function handleSelect(section: string): void {
    setOpen(false)
    onEditConfig(section)
  }

  function handleClick(): void {
    if (availableGlobal.length === 0) {
      onEditConfig(`contact_item_add_custom_${block.id}`)
    } else {
      setOpen(!open)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {compact ? (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          onClick={handleClick}
        >
          <CirclePlus className="size-4" />
          添加条目
        </button>
      ) : (
        <button
          type="button"
          className="flex h-full w-full items-start gap-3 rounded-lg bg-white p-5 opacity-50 transition-opacity hover:opacity-80"
          onClick={handleClick}
        >
          <CirclePlus className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-muted-foreground">新建条目</div>
            <div className="mt-1 text-sm text-foreground">点击添加联系方式</div>
          </div>
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-popover py-1 shadow-md">
          {availableGlobal.map((g) => {
            const Icon = resolveIcon(g.icon)
            return (
              <button
                key={g.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
                onClick={() => handleSelect(`contact_item_add_global_${block.id}_${g.id}`)}
              >
                {Icon && <Icon className="size-4 text-muted-foreground" />}
                {getLocalizedValue(g.label, locale)}
              </button>
            )
          })}
          {availableGlobal.length > 0 && <div className="my-1 border-t" />}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent"
            onClick={() => handleSelect(`contact_item_add_custom_${block.id}`)}
          >
            <PenLine className="size-4 text-muted-foreground" />
            自定义条目
          </button>
        </div>
      )}
    </div>
  )
}
