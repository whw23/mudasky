"use client"

/**
 * 页面区块统一预览编辑组件。
 * 渲染当前页面的 Block 列表，支持拖动排序、添加、删除、编辑配置。
 * 替代所有页面特定的预览组件（HomePreview, AboutPreview 等）。
 */

import { useState, useCallback, Fragment } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import api from "@/lib/api"
import { useConfig } from "@/contexts/ConfigContext"
import type { Block, BlockType } from "@/types/block"
import { BlockRenderer } from "@/components/blocks/BlockRenderer"
import { BlockEditorOverlay } from "./BlockEditorOverlay"
import { AddBlockDialog } from "./AddBlockDialog"
import { BlockEditDialog } from "./BlockEditDialog"
import { BlockDataEditor } from "./BlockDataEditor"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { PageBanner } from "@/components/layout/PageBanner"
import { HomeBanner } from "@/components/home/HomeBanner"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { HistorySection } from "@/components/about/AboutContent"

interface PageBlocksPreviewProps {
  pageSlug: string
  onBannerEdit: (pageKey: string) => void
  /** 关于页面联系信息/历史编辑回调 */
  onEditConfig?: (section: string) => void
}

/** 页面区块统一预览 */
export function PageBlocksPreview({
  pageSlug,
  onBannerEdit,
  onEditConfig,
}: PageBlocksPreviewProps) {
  const { pageBlocks, refreshConfig } = useConfig()
  const blocks = pageBlocks[pageSlug] ?? []

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addInsertIndex, setAddInsertIndex] = useState(0)
  const [editBlock, setEditBlock] = useState<Block | null>(null)
  const [dataEditBlock, setDataEditBlock] = useState<Block | null>(null)

  /** 保存区块列表到后端 */
  const saveBlocks = useCallback(async (updatedBlocks: Block[]) => {
    try {
      const currentPageBlocks = { ...pageBlocks }
      currentPageBlocks[pageSlug] = updatedBlocks
      await api.post("/admin/web-settings/list/edit", {
        key: "page_blocks",
        value: currentPageBlocks,
      })
      refreshConfig()
    } catch {
      toast.error("保存失败")
    }
  }, [pageBlocks, pageSlug, refreshConfig])

  /** 拖动结束处理 */
  function handleDragEnd(result: DropResult): void {
    if (!result.destination) return
    if (result.source.index === result.destination.index) return
    const newBlocks = Array.from(blocks)
    const [moved] = newBlocks.splice(result.source.index, 1)
    newBlocks.splice(result.destination.index, 0, moved)
    saveBlocks(newBlocks)
  }

  /** 删除区块 */
  function handleDelete(blockId: string): void {
    const updated = blocks.filter((b) => b.id !== blockId)
    saveBlocks(updated)
  }

  /** 打开添加弹窗 */
  function handleAddClick(insertIndex: number): void {
    setAddInsertIndex(insertIndex)
    setAddDialogOpen(true)
  }

  /** 选择区块类型后创建并插入 */
  function handleAddBlock(type: BlockType): void {
    const newBlock = createDefaultBlock(type)
    const updated = [...blocks]
    updated.splice(addInsertIndex, 0, newBlock)
    saveBlocks(updated)
  }

  /** 编辑区块配置 */
  function handleEditConfig(block: Block): void {
    setEditBlock(block)
  }

  /** 点击 Block 内容触发数据编辑 */
  function handleEditData(block: Block): void {
    setDataEditBlock(block)
  }

  /** 保存 Block 数据 */
  async function handleDataSave(blockId: string, newData: any): Promise<void> {
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, data: newData } : b,
    )
    await saveBlocks(newBlocks)
    setDataEditBlock(null)
  }

  /** 保存区块配置 */
  function handleEditSave(updated: Block): void {
    const newBlocks = blocks.map((b) =>
      b.id === updated.id ? updated : b,
    )
    saveBlocks(newBlocks)
  }

  return (
    <>
      {/* 页面顶部区域（Banner + 特殊区块） */}
      <PageTopSection
        pageSlug={pageSlug}
        onBannerEdit={onBannerEdit}
        onEditConfig={onEditConfig}
      />

      {/* 可拖拽的 Block 列表 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`blocks-${pageSlug}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {blocks.map((block, index) => (
                <Fragment key={block.id}>
                  {/* 插入点 */}
                  <InsertButton onClick={() => handleAddClick(index)} />

                  {/* 可拖拽的 Block */}
                  <Draggable draggableId={block.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={snapshot.isDragging ? "opacity-70" : ""}
                        style={dragProvided.draggableProps.style}
                      >
                        <BlockEditorOverlay
                          block={block}
                          onDelete={handleDelete}
                          onEditConfig={handleEditConfig}
                          dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                        >
                          <BlockRenderer
                            blocks={[block]}
                            editable
                            onEditData={handleEditData}
                          />
                        </BlockEditorOverlay>
                      </div>
                    )}
                  </Draggable>
                </Fragment>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* 末尾插入点 */}
      <InsertButton onClick={() => handleAddClick(blocks.length)} />

      {/* 添加区块弹窗 */}
      <AddBlockDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSelect={handleAddBlock}
      />

      {/* 区块配置编辑弹窗 */}
      <BlockEditDialog
        open={!!editBlock}
        onOpenChange={(open) => { if (!open) setEditBlock(null) }}
        block={editBlock}
        onSave={handleEditSave}
      />

      {/* 区块数据编辑弹窗 */}
      {dataEditBlock && (
        <BlockDataEditor
          block={dataEditBlock}
          onClose={() => setDataEditBlock(null)}
          onSave={handleDataSave}
        />
      )}
    </>
  )
}

/** 页面顶部区域（Banner、联系信息等） */
function PageTopSection({
  pageSlug,
  onBannerEdit,
  onEditConfig,
}: {
  pageSlug: string
  onBannerEdit: (pageKey: string) => void
  onEditConfig?: (section: string) => void
}) {
  const p = useTranslations("Pages")

  // 首页使用 HomeBanner
  if (pageSlug === "home") {
    return (
      <HomeBanner
        editable
        onEditConfig={onEditConfig}
        onBannerEdit={onBannerEdit}
      />
    )
  }

  // 关于页面有额外的联系信息和历史区块
  if (pageSlug === "about") {
    return (
      <>
        <EditableOverlay onClick={() => onBannerEdit("about")} label="编辑 Banner">
          <PageBanner pageKey="about" title={p("about")} subtitle={p("aboutSubtitle")} />
        </EditableOverlay>
        <ContactInfoSection
          editable
          onEditField={(field) => onEditConfig?.(`contact_${field}`)}
        />
        <HistorySection
          editable
          onEditTitle={() => onEditConfig?.("about_history_title")}
          onEdit={() => onEditConfig?.("about_history")}
        />
      </>
    )
  }

  // 其他页面通用 Banner
  const pageI18nKey = getPageI18nKey(pageSlug)
  return (
    <EditableOverlay onClick={() => onBannerEdit(pageSlug)} label="编辑 Banner">
      <PageBanner
        pageKey={pageSlug}
        title={p(pageI18nKey as any)}
        subtitle={p(`${pageI18nKey}Subtitle` as any)}
      />
    </EditableOverlay>
  )
}

/** 区块之间的插入按钮 */
function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="group flex items-center justify-center py-1" data-editable>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 rounded-full border border-dashed border-transparent px-3 py-1 text-xs text-muted-foreground/0 transition-all group-hover:border-blue-300 group-hover:text-blue-500 hover:bg-blue-50"
      >
        <Plus className="size-3" />
        添加模组
      </button>
    </div>
  )
}

/** 页面 slug → 翻译 key 映射 */
const SLUG_TO_I18N: Record<string, string> = {
  home: "home", about: "about", universities: "universities", cases: "cases",
  "study-abroad": "studyAbroad", requirements: "requirements",
  visa: "visa", life: "life", news: "news",
}

/** 获取页面翻译 key */
function getPageI18nKey(slug: string): string {
  return SLUG_TO_I18N[slug] ?? slug
}

/** 创建默认区块 */
function createDefaultBlock(type: BlockType): Block {
  return {
    id: crypto.randomUUID(),
    type,
    showTitle: true,
    sectionTag: "",
    sectionTitle: { zh: "" },
    bgColor: "white",
    options: getDefaultOptions(type),
    data: getDefaultData(type),
  }
}

/** 获取类型默认选项 */
function getDefaultOptions(type: BlockType): Record<string, any> {
  switch (type) {
    case "card_grid": return { cardType: "guide", maxColumns: 3 }
    case "doc_list": return { iconName: "FileText" }
    case "article_list": return { categorySlug: "" }
    case "featured_data": return { dataType: "universities", maxItems: 6 }
    case "cta": return { variant: "bg-gray-50" }
    default: return {}
  }
}

/** 获取类型默认数据 */
function getDefaultData(type: BlockType): any {
  switch (type) {
    case "intro": return { title: { zh: "标题" }, content: { zh: "内容描述" } }
    case "cta": return { title: { zh: "标题" }, desc: { zh: "描述" } }
    case "card_grid": return []
    case "step_list": return []
    case "doc_list": return []
    case "gallery": return []
    default: return null
  }
}
