"use client"

/**
 * ContactInfo Block 添加条目下拉菜单。
 * 列出未被引用的全局条目 + 自定义新建选项。
 */

import { Plus, PenLine } from "lucide-react"
import { icons } from "lucide-react"
import { useLocale } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getLocalizedValue } from "@/lib/i18n-config"
import { resolveIcon } from "@/lib/icon-utils"
import type { Block, ContactInfoBlockItem } from "@/types/block"
import type { ContactItem } from "@/types/config"

interface AddContactItemMenuProps {
  block: Block
  items: ContactInfoBlockItem[] | null
  globalItems: ContactItem[]
  onEditConfig: (section: string) => void
}

/** 添加条目下拉菜单 */
export function AddContactItemMenu({ block, items, globalItems, onEditConfig }: AddContactItemMenuProps) {
  const locale = useLocale()

  const referencedIds = new Set(
    (items ?? []).filter((i) => i.type === "global").map((i) => i.id),
  )
  const availableGlobal = globalItems.filter((g) => !referencedIds.has(g.id))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 p-5 text-sm text-muted-foreground transition-colors hover:border-blue-400 hover:text-blue-500"
          />
        }
      >
        <Plus className="size-4" />
        添加条目
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {availableGlobal.map((g) => {
          const Icon = resolveIcon(g.icon, icons.Info)!
          return (
            <DropdownMenuItem
              key={g.id}
              onClick={() => onEditConfig(`contact_item_add_global_${block.id}_${g.id}`)}
            >
              <Icon className="mr-2 size-4 text-muted-foreground" />
              {getLocalizedValue(g.label, locale)}
            </DropdownMenuItem>
          )
        })}
        {availableGlobal.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => onEditConfig(`contact_item_add_custom_${block.id}`)}>
          <PenLine className="mr-2 size-4 text-muted-foreground" />
          自定义条目
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
