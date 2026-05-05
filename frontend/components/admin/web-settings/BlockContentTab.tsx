"use client"

/**
 * Block 内容编辑 Tab 组件。
 * 根据 Block 类型渲染简单字段表单或数组条目列表。
 */

import { useEffect, useRef, useState, useCallback } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Info, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SwitchField } from "@/components/admin/SwitchField"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import { ArrayFieldRenderer } from "@/components/admin/ArrayFieldRenderer"
import { useConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import { resolveIcon } from "@/lib/icon-utils"
import { AddContactItemMenu } from "@/components/blocks/AddContactItemMenu"
import { BlockItemsList } from "@/components/admin/web-settings/BlockItemsList"
import { ArticleEditDialog } from "@/components/admin/web-settings/ArticleEditDialog"
import { CaseEditDialog } from "@/components/admin/web-settings/CaseEditDialog"
import { UniversityEditDialog } from "@/components/admin/web-settings/UniversityEditDialog"
import api from "@/lib/api"
import type { Block, BlockType, ContactInfoBlockItem } from "@/types/block"
import type { ConfigLocale } from "@/lib/i18n-config"
import type { ArrayFieldDef } from "@/components/admin/ArrayEditDialog"

/** Block 编辑类型 */
export type BlockEditType = "simple" | "array" | "api"

/** 判断 Block 类型的编辑方式 */
export function getBlockEditType(type: BlockType): BlockEditType {
  if (type === "intro" || type === "cta") return "simple"
  if (
    type === "card_grid" || type === "step_list" ||
    type === "doc_list" || type === "gallery" || type === "contact_info"
  ) return "array"
  return "api"
}

/** 简单字段定义 */
interface SimpleFieldDef {
  key: string
  label: string
  type: "text" | "textarea" | "switch"
  localized: boolean
  rows?: number
}

/** 各 Block 类型的简单字段 */
const SIMPLE_FIELDS: Record<string, SimpleFieldDef[]> = {
  intro: [
    { key: "content", label: "内容", type: "textarea", localized: true, rows: 5 },
  ],
  cta: [
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "desc", label: "描述", type: "text", localized: true },
    { key: "link", label: "按钮链接", type: "text", localized: false },
    { key: "showLogin", label: "未登录时弹出登录弹窗", type: "switch", localized: false },
  ],
}

/** 各 Block 类型的数组字段 */
const ARRAY_FIELDS: Record<string, ArrayFieldDef[]> = {
  step_list: [
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
  ],
  doc_list: [
    { key: "text", label: "文本", type: "text", localized: true },
  ],
  gallery: [
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "caption", label: "说明", type: "text", localized: true },
  ],
}

/** card_grid 各 cardType 的字段 */
const CARD_TYPE_FIELDS: Record<string, ArrayFieldDef[]> = {
  guide: [
    { key: "icon", label: "图标名称", type: "text", localized: false },
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
  ],
  timeline: [
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "time", label: "时间", type: "text", localized: true },
    { key: "desc", label: "描述", type: "text", localized: true },
  ],
  city: [
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "city", label: "城市", type: "text", localized: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
  ],
  program: [
    { key: "name", label: "项目名称", type: "text", localized: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
    { key: "features", label: "特点列表", type: "nested-items", localized: true },
  ],
  checklist: [
    { key: "icon", label: "图标名称", type: "text", localized: false },
    { key: "label", label: "标签", type: "text", localized: true },
    { key: "items", label: "条目列表", type: "nested-items", localized: true },
  ],
}

interface BlockContentTabProps {
  block: Block
  locale: ConfigLocale
  data: any
  onDataChange: (data: any) => void
  defaultFieldIndex?: number | null
  onEditConfig?: (section: string) => void
  onClose?: () => void
}

/** Block 内容编辑 Tab */
export function BlockContentTab({ block, locale, data, onDataChange, defaultFieldIndex, onEditConfig, onClose }: BlockContentTabProps) {
  const editType = getBlockEditType(block.type)

  if (block.type === "article_list") {
    return <ArticleItemsList block={block} />
  }

  if (block.type === "case_grid") {
    return <CaseItemsList />
  }

  if (block.type === "university_list") {
    return <UniversityItemsList />
  }

  if (editType === "api") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Info className="mb-2 size-8" />
        <p className="text-sm">此区块的数据通过管理页面编辑</p>
        <p className="mt-1 text-xs">使用左侧导航栏进入对应的管理模块</p>
      </div>
    )
  }

  if (editType === "simple" && onEditConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Button variant="outline" onClick={() => onEditConfig(`${block.type}_edit_${block.id}`)}>
          <Pencil className="mr-1.5 size-4" />
          编辑内容
        </Button>
      </div>
    )
  }

  if (block.type === "contact_info" && onEditConfig) {
    return <ContactItemsList block={block} locale={locale} onEditConfig={onEditConfig} />
  }

  if (block.type === "card_grid" && onEditConfig) {
    return <CardGridItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  if (block.type === "step_list" && onEditConfig) {
    return <StepListItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  if (block.type === "doc_list" && onEditConfig) {
    return <DocListItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  if (block.type === "gallery" && onEditConfig) {
    return <GalleryItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  const fields = getArrayFields(block)
  const cardType = block.type === "card_grid" ? (block.options?.cardType || "guide") : ""
  const hasIconField = cardType === "guide" || cardType === "checklist"
  const description = hasIconField
    ? <>图标名称参考 <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide 图标库</a>，支持 PascalCase 和 kebab-case</>
    : null

  return (
    <ArrayItemsForm
      fields={fields}
      items={Array.isArray(data) ? data : []}
      locale={locale}
      onChange={onDataChange}
      description={description}
      defaultFieldIndex={defaultFieldIndex}
    />
  )
}

/** 联系信息条目列表（支持拖动排序） */
function ContactItemsList({
  block, locale, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  onEditConfig: (section: string) => void
}) {
  const { contactItems, pageBlocks } = useConfig()
  const currentBlock = Object.values(pageBlocks).flat().find((b) => b.id === block.id)
  const items: ContactInfoBlockItem[] | null = currentBlock?.data?.items ?? block.data?.items ?? null
  const resolved = resolveContactItems(items, contactItems, locale, block.id)

  return (
    <BlockItemsList
      items={resolved}
      onEditItem={(idx) => onEditConfig(resolved[idx].editSection)}
      onDeleteItem={(idx) => onEditConfig(`contact_item_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`contact_item_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item) => ({
        icon: item.icon,
        label: item.label,
        content: item.content,
        badge: item.source === "global" ? "共享" : undefined,
      })}
      addButton={
        <AddContactItemMenu
          block={block}
          items={items}
          globalItems={contactItems}
          onEditConfig={onEditConfig}
          compact
        />
      }
    />
  )
}

/** 从 ConfigContext 读最新的 Block data */
function useLatestBlockData(block: Block, fallbackData: any): any[] {
  const { pageBlocks } = useConfig()
  const latest = Object.values(pageBlocks).flat().find((b) => b.id === block.id)
  const raw = latest?.data ?? fallbackData
  return Array.isArray(raw) ? raw : []
}

/** card_grid 卡片列表（支持拖动排序） */
function CardGridItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const cards = useLatestBlockData(block, data)
  const cardType = block.options?.cardType || "guide"

  return (
    <BlockItemsList
      items={cards}
      onEditItem={(idx) => onEditConfig(`card_grid_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`card_grid_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`card_grid_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const firstTextField = getFirstTextField(item, cardType, locale)
        const secondTextField = getSecondTextField(item, cardType, locale)
        const iconField = getIconField(item, cardType)
        return {
          icon: iconField,
          label: firstTextField || `卡片 ${idx + 1}`,
          content: secondTextField || '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`card_grid_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加卡片
        </Button>
      }
    />
  )
}

/** step_list 步骤列表（支持拖动排序） */
function StepListItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const steps = useLatestBlockData(block, data)

  return (
    <BlockItemsList
      items={steps}
      onEditItem={(idx) => onEditConfig(`step_list_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`step_list_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`step_list_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const title = typeof item.title === 'object' ? (item.title[locale] || item.title.zh || '') : (item.title || '')
        const desc = typeof item.desc === 'object' ? (item.desc[locale] || item.desc.zh || '') : (item.desc || '')
        return {
          label: title || `步骤 ${idx + 1}`,
          content: desc || '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`step_list_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加步骤
        </Button>
      }
    />
  )
}

/** doc_list 文档列表（支持拖动排序） */
function DocListItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const docs = useLatestBlockData(block, data)

  return (
    <BlockItemsList
      items={docs}
      onEditItem={(idx) => onEditConfig(`doc_list_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`doc_list_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`doc_list_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const text = typeof item.text === 'object' ? (item.text[locale] || item.text.zh || '') : (item.text || '')
        return {
          icon: item.icon || block.options?.iconName,
          label: text || `文档 ${idx + 1}`,
          content: '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`doc_list_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加文档
        </Button>
      }
    />
  )
}

/** gallery 图片列表（支持拖动排序） */
function GalleryItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const items = useLatestBlockData(block, data)

  return (
    <BlockItemsList
      items={items}
      onEditItem={(idx) => onEditConfig(`gallery_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`gallery_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`gallery_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const caption = typeof item.caption === 'object' ? (item.caption[locale] || item.caption.zh || '') : (item.caption || '')
        return {
          label: caption || `图片 ${idx + 1}`,
          content: item.image_id ? `ID: ${item.image_id}` : '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`gallery_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加图片
        </Button>
      }
    />
  )
}

/** 获取卡片的第一个文本字段（作为标签） */
function getFirstTextField(item: any, cardType: string, locale: string): string {
  const fieldMap: Record<string, string> = {
    guide: 'title',
    timeline: 'title',
    city: 'city',
    program: 'name',
    checklist: 'label',
  }
  const key = fieldMap[cardType]
  if (!key) return ''
  const value = item[key]
  return typeof value === 'object' ? (value[locale] || value.zh || '') : (value || '')
}

/** 获取卡片的第二个文本字段（作为内容） */
function getSecondTextField(item: any, cardType: string, locale: string): string {
  const fieldMap: Record<string, string> = {
    guide: 'desc',
    timeline: 'time',
    city: 'country',
    program: 'country',
    checklist: 'items',
  }
  const key = fieldMap[cardType]
  if (!key) return ''
  const value = item[key]
  if (key === 'items' && Array.isArray(value)) {
    // checklist.items 是数组，显示第一项
    const first = value[0]
    return typeof first === 'object' ? (first[locale] || first.zh || '') : (first || '')
  }
  return typeof value === 'object' ? (value[locale] || value.zh || '') : (value || '')
}

/** 获取卡片的图标字段 */
function getIconField(item: any, cardType: string): string | undefined {
  if (cardType === 'guide' || cardType === 'checklist') {
    return item.icon || undefined
  }
  return undefined
}

/** 解析联系条目到列表展示数据 */
function resolveContactItems(
  items: ContactInfoBlockItem[] | null,
  globalItems: Array<{ id: string; icon: string; label: any; content: any }>,
  locale: string,
  blockId: string,
): Array<{ icon: string; label: string; content: string; source: "global" | "custom"; editSection: string }> {
  const source = items ?? globalItems.map((g) => ({ type: "global" as const, id: g.id }))
  return source.map((item, idx) => {
    if (item.type === "global") {
      const g = globalItems.find((gi) => gi.id === item.id)
      if (!g) return null
      return {
        icon: g.icon,
        label: getLocalizedValue(g.label, locale),
        content: getLocalizedValue(g.content, locale),
        source: "global" as const,
        editSection: `contact_item_global_${g.id}`,
      }
    }
    return {
      icon: item.icon,
      label: getLocalizedValue(item.label, locale),
      content: getLocalizedValue(item.content, locale),
      source: "custom" as const,
      editSection: `contact_item_custom_${blockId}_${idx}`,
    }
  }).filter(Boolean) as any[]
}

/** 文章数据 */
interface ArticleItem {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  category_id: string
  status: string
  content_type?: string
  file_id?: string | null
  published_at: string | null
  created_at: string
}

/** 文章列表管理（article_list 内容标签页） */
function ArticleItemsList({ block }: { block: Block }) {
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<ArticleItem | null>(null)

  const categorySlug = block.options?.categorySlug as string | undefined

  const isAllCategories = !categorySlug

  const fetchArticles = useCallback(async (catId?: string) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page_size: 100 }
      if (catId) params.category_id = catId
      const { data } = await api.get("/admin/web-settings/articles/list", { params })
      setArticles(data.items ?? [])
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAllCategories) {
      fetchArticles()
      return
    }
    api.get("/admin/web-settings/categories/list")
      .then(({ data }) => {
        const cat = (data ?? []).find((c: any) => c.slug === categorySlug)
        if (cat) {
          setCategoryId(cat.id)
          fetchArticles(cat.id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [categorySlug, isAllCategories, fetchArticles])

  async function handleDelete(articleId: string) {
    try {
      await api.post("/admin/web-settings/articles/list/detail/delete", { article_id: articleId })
      toast.success("文章已删除")
      fetchArticles(categoryId ?? undefined)
    } catch {
      toast.error("删除失败")
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-2">
      {articles.map((article) => (
        <div key={article.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{article.title}</span>
              {article.status === "draft" && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">草稿</span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {(article.published_at ?? article.created_at).slice(0, 10)}
              {article.excerpt && ` · ${article.excerpt}`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditItem(article); setEditOpen(true) }}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => handleDelete(article.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => { setEditItem(null); setEditOpen(true) }}
      >
        <Plus className="mr-1 size-4" />
        写文章
      </Button>

      <ArticleEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        article={editItem}
        categoryId={categoryId ?? undefined}
        onSuccess={() => fetchArticles(categoryId ?? undefined)}
      />
    </div>
  )
}

/** 案例数据 */
interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  is_featured: boolean
  avatar_image_id: string | null
  offer_image_id: string | null
  related_university_id: string | null
}

/** 案例列表管理（case_grid 内容标签页） */
function CaseItemsList() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<CaseItem | null>(null)

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/admin/web-settings/cases/list", { params: { page_size: 100 } })
      setCases(data.items ?? [])
    } catch {
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCases() }, [fetchCases])

  async function handleDelete(caseId: string) {
    try {
      await api.post("/admin/web-settings/cases/list/detail/delete", { case_id: caseId })
      toast.success("案例已删除")
      fetchCases()
    } catch {
      toast.error("删除失败")
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-2">
      {cases.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.student_name}</span>
              {c.is_featured && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">精选</span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {c.university} · {c.program} · {c.year}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditItem(c); setEditOpen(true) }}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => handleDelete(c.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => { setEditItem(null); setEditOpen(true) }}
      >
        <Plus className="mr-1 size-4" />
        添加案例
      </Button>

      <CaseEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        caseItem={editItem}
        onSuccess={fetchCases}
      />
    </div>
  )
}

/** 院校数据 */
interface UniversityItem {
  id: string
  name: string
  name_en: string | null
  country: string
  city: string
  is_featured: boolean
  [key: string]: unknown
}

/** 院校列表管理（university_list 内容标签页） */
function UniversityItemsList() {
  const [unis, setUnis] = useState<UniversityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<UniversityItem | null>(null)

  const fetchUnis = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/admin/web-settings/universities/list", { params: { page_size: 100 } })
      setUnis(data.items ?? [])
    } catch {
      setUnis([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUnis() }, [fetchUnis])

  async function handleDelete(uniId: string) {
    try {
      await api.post("/admin/web-settings/universities/list/detail/delete", { university_id: uniId })
      toast.success("院校已删除")
      fetchUnis()
    } catch {
      toast.error("删除失败")
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-2">
      {unis.map((u) => (
        <div key={u.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{u.name}</span>
              {u.is_featured && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">精选</span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {u.country} · {u.city}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditItem(u); setEditOpen(true) }}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => handleDelete(u.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => { setEditItem(null); setEditOpen(true) }}
      >
        <Plus className="mr-1 size-4" />
        添加院校
      </Button>

      <UniversityEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        university={editItem as any}
        onSuccess={fetchUnis}
      />
    </div>
  )
}

/** 获取数组类型 Block 的字段定义 */
function getArrayFields(block: Block): ArrayFieldDef[] {
  if (block.type === "card_grid") {
    const cardType = block.options?.cardType || "guide"
    return CARD_TYPE_FIELDS[cardType] || CARD_TYPE_FIELDS.guide
  }
  return ARRAY_FIELDS[block.type] || []
}

/* ========== 子组件 ========== */

/** 简单字段表单 */
function SimpleFieldsForm({
  fields,
  data,
  locale,
  onChange,
}: {
  fields: SimpleFieldDef[]
  data: Record<string, any>
  locale: ConfigLocale
  onChange: (data: Record<string, any>) => void
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (field.type === "switch") {
          return (
            <SwitchField
              key={field.key}
              label={field.label}
              checked={!!data[field.key]}
              onCheckedChange={(v) => onChange({ ...data, [field.key]: v })}
            />
          )
        }
        if (field.localized) {
          return (
            <LocalizedInput
              key={field.key}
              value={data[field.key] ?? ""}
              onChange={(v) => onChange({ ...data, [field.key]: v })}
              label={field.label}
              multiline={field.type === "textarea"}
              rows={field.rows}
              locale={locale}
            />
          )
        }
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Input
              value={(data[field.key] ?? "") as string}
              onChange={(e) => onChange({ ...data, [field.key]: e.target.value })}
            />
          </div>
        )
      })}
    </div>
  )
}

/** 数组条目列表表单 */
function ArrayItemsForm({
  fields,
  items,
  locale,
  onChange,
  description,
  defaultFieldIndex,
}: {
  fields: ArrayFieldDef[]
  items: Record<string, unknown>[]
  locale: ConfigLocale
  onChange: (items: Record<string, unknown>[]) => void
  description: React.ReactNode
  defaultFieldIndex?: number | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultFieldIndex != null && scrollRef.current) {
      const target = scrollRef.current.querySelector(`[data-item-index="${defaultFieldIndex}"]`)
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [defaultFieldIndex])
  /** 更新指定条目的指定字段 */
  function updateItem(index: number, key: string, value: unknown) {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    onChange(next)
  }

  /** 拖动排序 */
  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.source.index === result.destination.index) return
    const next = Array.from(items)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    onChange(next)
  }

  /** 添加空条目 */
  function handleAdd() {
    const empty: Record<string, unknown> = {}
    for (const f of fields) {
      empty[f.key] = f.type === "nested-items" ? [] : ""
    }
    onChange([...items, empty])
  }

  /** 删除条目 */
  function handleDelete(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div ref={scrollRef} className="space-y-3">
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="block-content-items">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {items.map((item, index) => (
                <Draggable key={index} draggableId={`content-item-${index}`} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      data-item-index={index}
                      style={dragProvided.draggableProps.style}
                      className={`rounded-lg border p-4 transition-shadow ${snapshot.isDragging ? "shadow-md" : ""}`}
                    >
                      {/* 条目头部 */}
                      <div className="mb-3 flex items-center gap-2">
                        <span {...dragProvided.dragHandleProps} className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                          <GripVertical className="size-4" />
                        </span>
                        <span className="text-sm font-medium">条目 {index + 1}</span>
                        <span className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {/* 字段列表 */}
                      <div className="space-y-3">
                        {fields.map((field) => (
                          <ArrayFieldRenderer
                            key={field.key}
                            item={item}
                            index={index}
                            field={field}
                            onUpdate={updateItem}
                            locale={locale}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button variant="outline" className="w-full" onClick={handleAdd}>
        <Plus className="mr-1 size-4" />
        添加条目
      </Button>
    </div>
  )
}
