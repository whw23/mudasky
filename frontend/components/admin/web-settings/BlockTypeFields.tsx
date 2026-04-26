"use client"

/**
 * Block 类型特定配置字段。
 * 根据区块类型渲染对应的选项表单（卡片类型、图标名、分类标识等）。
 */

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"

interface FieldsProps {
  options: Record<string, any>
  onUpdate: (key: string, value: any) => void
}

/** 类型特定配置字段入口 */
export function TypeSpecificFields({
  type,
  options,
  onUpdateOption,
}: {
  type: string
  options: Record<string, any>
  onUpdateOption: (key: string, value: any) => void
}) {
  switch (type) {
    case "card_grid":
      return <CardGridFields options={options} onUpdate={onUpdateOption} />
    case "doc_list":
      return <DocListFields options={options} onUpdate={onUpdateOption} />
    case "article_list":
      return <ArticleListFields options={options} onUpdate={onUpdateOption} />
    case "featured_data":
      return <FeaturedDataFields options={options} onUpdate={onUpdateOption} />
    case "cta":
      return <CtaFields options={options} onUpdate={onUpdateOption} />
    case "contact_info":
      return <MaxColumnsField options={options} onUpdate={onUpdateOption} label="联系信息选项" />
    default:
      return null
  }
}

/** 最大列数选择器（复用） */
function MaxColumnsSelect({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-1.5">
      <Label>最大列数</Label>
      <Select
        value={String(options.maxColumns || 3)}
        onValueChange={(v) => onUpdate("maxColumns", Number(v))}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2">2 列</SelectItem>
          <SelectItem value="3">3 列</SelectItem>
          <SelectItem value="4">4 列</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

/** 仅 maxColumns 配置 */
function MaxColumnsField({ options, onUpdate, label }: FieldsProps & { label: string }) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <MaxColumnsSelect options={options} onUpdate={onUpdate} />
    </div>
  )
}

/** card_grid 类型配置 */
function CardGridFields({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">卡片网格选项</p>

      <div className="space-y-1.5">
        <Label>卡片类型</Label>
        <Select
          value={options.cardType || "guide"}
          onValueChange={(v) => onUpdate("cardType", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guide">指南卡片</SelectItem>
            <SelectItem value="timeline">时间线</SelectItem>
            <SelectItem value="city">城市指南</SelectItem>
            <SelectItem value="program">专业卡片</SelectItem>
            <SelectItem value="checklist">检查清单</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MaxColumnsSelect options={options} onUpdate={onUpdate} />
    </div>
  )
}

/** doc_list 类型配置 */
function DocListFields({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">文档清单选项</p>
      <div className="space-y-1.5">
        <Label htmlFor="block-icon-name">图标名称</Label>
        <Input
          id="block-icon-name"
          value={options.iconName || ""}
          onChange={(e) => onUpdate("iconName", e.target.value)}
          placeholder="如 FileText 或 file-text"
        />
        <p className="text-xs text-muted-foreground">
          图标名称参考 <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide 图标库</a>，支持 PascalCase 和 kebab-case
        </p>
      </div>
      <MaxColumnsSelect options={options} onUpdate={onUpdate} />
    </div>
  )
}

/** article_list 类型配置 */
function ArticleListFields({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">文章列表选项</p>
      <div className="space-y-1.5">
        <Label htmlFor="block-category-slug">分类标识</Label>
        <Input
          id="block-category-slug"
          value={options.categorySlug || ""}
          onChange={(e) => onUpdate("categorySlug", e.target.value)}
          placeholder="如 news"
        />
      </div>
    </div>
  )
}

/** featured_data 类型配置 */
function FeaturedDataFields({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">精选展示选项</p>

      <div className="space-y-1.5">
        <Label>数据类型</Label>
        <Select
          value={options.dataType || "universities"}
          onValueChange={(v) => onUpdate("dataType", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="universities">院校</SelectItem>
            <SelectItem value="cases">案例</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="block-max-items">最大数量</Label>
        <Input
          id="block-max-items"
          type="number"
          min={1}
          max={20}
          value={options.maxItems || 6}
          onChange={(e) => onUpdate("maxItems", Number(e.target.value))}
        />
      </div>

      <MaxColumnsSelect options={options} onUpdate={onUpdate} />
    </div>
  )
}

/** cta 类型配置 */
function CtaFields({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">行动号召选项</p>
      <div className="space-y-1.5">
        <Label>样式</Label>
        <Select
          value={options.variant || "border-t"}
          onValueChange={(v) => onUpdate("variant", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="border-t">顶部边框</SelectItem>
            <SelectItem value="bg-gray-50">灰色背景</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
