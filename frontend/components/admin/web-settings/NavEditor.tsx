"use client"

/**
 * 导航栏拖动排序编辑器。
 * 支持水平拖拽排序、新增自定义项、删除自定义项。
 */

import { useCallback, useEffect, useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { GripVertical, Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { toast } from "sonner"
import api from "@/lib/api"
import { getLocalizedValue } from "@/lib/i18n-config"
import { AddNavItemDialog } from "./AddNavItemDialog"
import { RemoveNavItemDialog } from "./RemoveNavItemDialog"

/** 预设导航 key → 翻译 key 映射 */
const NAV_KEY_TO_I18N: Record<string, string> = {
  "home": "home",
  "universities": "universities",
  "study-abroad": "studyAbroad",
  "requirements": "requirements",
  "cases": "cases",
  "visa": "visa",
  "life": "life",
  "news": "news",
  "about": "about",
}

/** 预设导航 key 集合 */
const BUILTIN_KEYS = new Set(Object.keys(NAV_KEY_TO_I18N))

/** 自定义导航项数据 */
interface CustomItem {
  slug: string
  name: string | Record<string, string>
  description?: string
}

/** API 返回的导航配置 */
interface NavConfig {
  order: string[]
  custom_items: CustomItem[]
}

interface NavEditorProps {
  activePage: string
  onPageChange: (key: string) => void
}

export function NavEditor({ activePage, onPageChange }: NavEditorProps) {
  const tNav = useTranslations("Nav")
  const locale = useLocale()
  const [navOrder, setNavOrder] = useState<string[]>([])
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<{
    slug: string
    name: string
  } | null>(null)

  /** 获取导航配置 */
  const fetchNavConfig = useCallback(async () => {
    try {
      const res = await api.get("/admin/web-settings/nav/list")
      const data = res.data as NavConfig
      setNavOrder(data.order)
      setCustomItems(data.custom_items)
    } catch {
      toast.error("获取导航配置失败")
    }
  }, [])

  useEffect(() => {
    fetchNavConfig()
  }, [fetchNavConfig])

  /** 获取导航项显示名称 */
  function getItemName(key: string): string {
    const i18nKey = NAV_KEY_TO_I18N[key]
    if (i18nKey) {
      return tNav(i18nKey)
    }
    const custom = customItems.find((item) => item.slug === key)
    if (custom) {
      return getLocalizedValue(custom.name, locale)
    }
    return key
  }

  /** 拖动结束处理 */
  async function handleDragEnd(result: DropResult): Promise<void> {
    if (!result.destination) return
    if (result.source.index === result.destination.index) return

    const newOrder = Array.from(navOrder)
    const [moved] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, moved)
    setNavOrder(newOrder)

    try {
      await api.post("/admin/web-settings/nav/reorder", { order: newOrder })
    } catch {
      toast.error("排序保存失败")
      fetchNavConfig()
    }
  }

  /** 打开删除确认弹窗 */
  function handleRemoveClick(slug: string): void {
    const name = getItemName(slug)
    setRemoveTarget({ slug, name })
  }

  return (
    <>
      <nav className="border-t border-black/[0.04]">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="nav-editor" direction="horizontal">
              {(provided) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-1 items-center justify-evenly"
                >
                  {navOrder.map((key, index) => (
                    <Draggable key={key} draggableId={key} index={index}>
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-0.5 transition-opacity ${
                            snapshot.isDragging ? "opacity-70" : ""
                          }`}
                          style={provided.draggableProps.style}
                        >
                          {/* 拖动手柄 */}
                          <span
                            {...provided.dragHandleProps}
                            className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
                          >
                            <GripVertical className="size-3.5" />
                          </span>

                          {/* 导航项按钮 */}
                          <button
                            onClick={() => onPageChange(key)}
                            className={`whitespace-nowrap px-2 py-1.5 text-sm font-medium transition-colors ${
                              activePage === key
                                ? "text-primary border-b-2 border-primary"
                                : "text-foreground/60 hover:text-foreground"
                            }`}
                          >
                            {getItemName(key)}
                          </button>

                          {/* 自定义项删除按钮 */}
                          {!BUILTIN_KEYS.has(key) && (
                            <button
                              onClick={() => handleRemoveClick(key)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors"
                              aria-label={`删除 ${getItemName(key)}`}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* 新增按钮 */}
                  <li>
                    <button
                      onClick={() => setAddDialogOpen(true)}
                      className="flex items-center gap-0.5 whitespace-nowrap px-2 py-1.5 text-sm font-medium text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </li>
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </nav>

      {/* 新增导航项弹窗 */}
      <AddNavItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchNavConfig}
      />

      {/* 删除导航项确认弹窗 */}
      {removeTarget && (
        <RemoveNavItemDialog
          open={!!removeTarget}
          onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
          slug={removeTarget.slug}
          name={removeTarget.name}
          onSuccess={fetchNavConfig}
        />
      )}
    </>
  )
}
