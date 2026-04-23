"use client"

/**
 * Block 配置编辑弹窗。
 * 编辑区块的显示配置（标题显示、标签、背景色）和类型特定选项。
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog"
import type { Block } from "@/types/block"
import { getLocalizedValue } from "@/lib/i18n-config"
import { TypeSpecificFields } from "./BlockTypeFields"

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
}

interface BlockEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  block: Block | null
  onSave: (updated: Block) => void
}

/** Block 配置编辑弹窗 */
export function BlockEditDialog({
  open,
  onOpenChange,
  block,
  onSave,
}: BlockEditDialogProps) {
  const [showTitle, setShowTitle] = useState(true)
  const [sectionTag, setSectionTag] = useState("")
  const [sectionTitle, setSectionTitle] = useState("")
  const [bgColor, setBgColor] = useState<"white" | "gray">("white")
  const [options, setOptions] = useState<Record<string, any>>({})

  // 打开弹窗时初始化表单
  useEffect(() => {
    if (block) {
      setShowTitle(block.showTitle)
      setSectionTag(block.sectionTag)
      setSectionTitle(
        typeof block.sectionTitle === "string"
          ? block.sectionTitle
          : getLocalizedValue(block.sectionTitle, "zh") || ""
      )
      setBgColor(block.bgColor)
      setOptions({ ...block.options })
    }
  }, [block])

  /** 更新 options 中的字段 */
  function updateOption(key: string, value: any): void {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  /** 保存 */
  function handleSave(): void {
    if (!block) return
    onSave({
      ...block,
      showTitle,
      sectionTag,
      sectionTitle: { zh: sectionTitle },
      bgColor,
      options,
    })
    onOpenChange(false)
  }

  if (!block) return null
  const typeName = BLOCK_TYPE_NAMES[block.type] || block.type

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" enableFullscreen={false}>
        <DialogHeader>
          <DialogTitle>编辑区块配置</DialogTitle>
          <DialogDescription>
            {typeName} — 修改显示选项和类型配置
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 通用配置 */}
          <CommonFields
            showTitle={showTitle}
            onShowTitleChange={setShowTitle}
            sectionTag={sectionTag}
            onSectionTagChange={setSectionTag}
            sectionTitle={sectionTitle}
            onSectionTitleChange={setSectionTitle}
            bgColor={bgColor}
            onBgColorChange={setBgColor}
          />

          {/* 类型特定选项 */}
          <TypeSpecificFields
            type={block.type}
            options={options}
            onUpdateOption={updateOption}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 通用配置字段 */
function CommonFields({
  showTitle,
  onShowTitleChange,
  sectionTag,
  onSectionTagChange,
  sectionTitle,
  onSectionTitleChange,
  bgColor,
  onBgColorChange,
}: {
  showTitle: boolean
  onShowTitleChange: (v: boolean) => void
  sectionTag: string
  onSectionTagChange: (v: string) => void
  sectionTitle: string
  onSectionTitleChange: (v: string) => void
  bgColor: "white" | "gray"
  onBgColorChange: (v: "white" | "gray") => void
}) {
  return (
    <>
      {/* 显示标题 */}
      <div className="flex items-center justify-between">
        <Label htmlFor="block-show-title">显示标题区域</Label>
        <Switch
          checked={showTitle}
          onCheckedChange={onShowTitleChange}
        />
      </div>

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

      {/* 中文标题 */}
      <div className="space-y-1.5">
        <Label htmlFor="block-section-title">中文标题</Label>
        <Input
          id="block-section-title"
          value={sectionTitle}
          onChange={(e) => onSectionTitleChange(e.target.value)}
          placeholder="如 关于我们"
        />
      </div>

      {/* 背景色 */}
      <div className="space-y-1.5">
        <Label>背景色</Label>
        <Select
          value={bgColor}
          onValueChange={(v) => onBgColorChange((v ?? "white") as "white" | "gray")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="white">白色</SelectItem>
            <SelectItem value="gray">浅灰</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
