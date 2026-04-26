"use client"

/**
 * 统一 Block 编辑弹窗。
 * 合并显示配置和内容编辑为双 Tab，支持多语言切换。
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SwitchField } from "@/components/admin/SwitchField"
import { SelectField } from "@/components/admin/SelectField"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog"
import type { Block } from "@/types/block"
import type { ConfigLocale, LocalizedField } from "@/lib/i18n-config"
import { LanguageCapsule } from "@/components/admin/LanguageCapsule"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import { TypeSpecificFields } from "./BlockTypeFields"
import api from "@/lib/api"
import { BlockContentTab, getBlockEditType } from "./BlockContentTab"

/** 区块类型中文名 */
const BLOCK_TYPE_NAMES: Record<string, string> = {
  intro: "介绍",
  card_grid: "卡片网格",
  step_list: "步骤列表",
  doc_list: "文档清单",
  gallery: "图片墙",
  article_list: "文章列表",
  university_list: "院校列表",
  case_grid: "案例网格",
  featured_data: "精选展示",
  cta: "行动号召",
  contact_info: "联系信息",
}

type EditorTab = "config" | "content"

interface UnifiedBlockEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  block: Block | null
  defaultTab?: EditorTab
  defaultFieldIndex?: number | null
  onSave: (updated: Block) => void
}

/** 统一 Block 编辑弹窗 */
export function UnifiedBlockEditor({
  open,
  onOpenChange,
  block,
  defaultTab,
  defaultFieldIndex,
  onSave,
}: UnifiedBlockEditorProps) {
  const [locale, setLocale] = useState<ConfigLocale>("zh")
  const [activeTab, setActiveTab] = useState<EditorTab>("content")

  /* 配置状态 */
  const [showTitle, setShowTitle] = useState(true)
  const [sectionTag, setSectionTag] = useState("")
  const [sectionTitle, setSectionTitle] = useState<Record<string, string>>({})
  const [bgColor, setBgColor] = useState<"white" | "gray">("white")
  const [options, setOptions] = useState<Record<string, any>>({})

  /* 内容状态 */
  const [data, setData] = useState<any>(null)

  /* 打开弹窗时初始化所有状态 */
  useEffect(() => {
    if (!block || !open) return
    setShowTitle(block.showTitle)
    setSectionTag(block.sectionTag)
    setSectionTitle(normalizeLocalized(block.sectionTitle))
    setBgColor(block.bgColor)
    setOptions({ ...block.options })
    if (block.type === "contact_info") {
      api.get("/public/config/all").then((res) => {
        setData(res.data.contact_items ?? [])
      })
    } else {
      setData(JSON.parse(JSON.stringify(block.data ?? null)))
    }
    setLocale("zh")

    const editType = getBlockEditType(block.type)
    if (defaultTab) {
      setActiveTab(defaultTab)
    } else {
      setActiveTab(editType === "api" ? "config" : "content")
    }
  }, [block, open, defaultTab])

  /** 更新 options */
  function updateOption(key: string, value: any): void {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  /** 保存 */
  function handleSave(): void {
    if (!block) return
    onSave({ ...block, showTitle, sectionTag, sectionTitle, bgColor, options, data })
    onOpenChange(false)
  }

  if (!block) return null

  const typeName = BLOCK_TYPE_NAMES[block.type] || block.type
  const editType = getBlockEditType(block.type)
  const isApiDriven = editType === "api"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-16">
            <div>
              <DialogTitle>编辑 {typeName}</DialogTitle>
              <DialogDescription>修改区块的显示配置和内容</DialogDescription>
            </div>
            <LanguageCapsule value={locale} onChange={setLocale} />
          </div>
        </DialogHeader>

        {/* Tab 栏 */}
        <div className="flex border-b">
          <TabButton
            label="显示配置"
            active={activeTab === "config"}
            onClick={() => setActiveTab("config")}
          />
          <TabButton
            label="内容编辑"
            active={activeTab === "content"}
            disabled={isApiDriven}
            onClick={() => !isApiDriven && setActiveTab("content")}
          />
        </div>

        <DialogBody className="max-h-[60vh] overflow-y-auto">
          {activeTab === "config" ? (
            <ConfigTabContent
              showTitle={showTitle}
              onShowTitleChange={setShowTitle}
              sectionTag={sectionTag}
              onSectionTagChange={setSectionTag}
              sectionTitle={sectionTitle}
              onSectionTitleChange={setSectionTitle}
              bgColor={bgColor}
              onBgColorChange={setBgColor}
              blockType={block.type}
              options={options}
              onUpdateOption={updateOption}
              locale={locale}
              isApiDriven={isApiDriven}
            />
          ) : (
            <BlockContentTab
              block={{ ...block, options }}
              locale={locale}
              data={data}
              onDataChange={setData}
              defaultFieldIndex={defaultFieldIndex}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ========== 子组件 ========== */

/** Tab 按钮 */
function TabButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : disabled
            ? "cursor-not-allowed border-transparent text-muted-foreground/50"
            : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

/** 显示配置 Tab 内容 */
function ConfigTabContent({
  showTitle,
  onShowTitleChange,
  sectionTag,
  onSectionTagChange,
  sectionTitle,
  onSectionTitleChange,
  bgColor,
  onBgColorChange,
  blockType,
  options,
  onUpdateOption,
  locale,
  isApiDriven,
}: {
  showTitle: boolean
  onShowTitleChange: (v: boolean) => void
  sectionTag: string
  onSectionTagChange: (v: string) => void
  sectionTitle: Record<string, string>
  onSectionTitleChange: (v: Record<string, string>) => void
  bgColor: "white" | "gray"
  onBgColorChange: (v: "white" | "gray") => void
  blockType: string
  options: Record<string, any>
  onUpdateOption: (key: string, value: any) => void
  locale: ConfigLocale
  isApiDriven: boolean
}) {
  return (
    <div className="space-y-4">
      {/* 显示标题 */}
      <SwitchField
        id="block-show-title"
        label="显示标题区域"
        checked={showTitle}
        onCheckedChange={onShowTitleChange}
      />

      {/* 英文标签 */}
      <div className="space-y-1.5">
        <Label htmlFor="block-section-tag">英文标签</Label>
        <Input
          id="block-section-tag"
          value={sectionTag}
          onChange={(e) => onSectionTagChange(e.target.value)}
          placeholder="如 OUR STORY"
        />
      </div>

      {/* 板块标题 */}
      <LocalizedInput
        value={sectionTitle}
        onChange={onSectionTitleChange}
        label="板块标题"
        locale={locale}
      />

      {/* 背景色 */}
      <SelectField
        label="背景色"
        value={bgColor}
        options={[{ value: "white", label: "白色" }, { value: "gray", label: "浅灰" }]}
        onValueChange={(v) => onBgColorChange(v as "white" | "gray")}
      />

      {/* 类型特定选项 */}
      <TypeSpecificFields type={blockType} options={options} onUpdateOption={onUpdateOption} />

      {/* API 驱动型提示 */}
      {isApiDriven && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          {"💡 内容通过预览页面中的管理工具栏直接编辑。"}
        </div>
      )}
    </div>
  )
}

/** 将 LocalizedField 标准化为 Record */
function normalizeLocalized(field: LocalizedField | undefined): Record<string, string> {
  if (!field) return { zh: "", en: "", ja: "", de: "" }
  if (typeof field === "string") return { zh: field, en: "", ja: "", de: "" }
  return { zh: "", en: "", ja: "", de: "", ...field }
}
