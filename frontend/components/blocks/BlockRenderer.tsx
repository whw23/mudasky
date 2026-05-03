"use client"

/**
 * Block 渲染器。
 * 遍历 Block 数组，按 type 分发到对应组件。
 */

import { Fragment, type ReactNode } from "react"
import type { Block } from "@/types/block"
import { SectionHeader } from "./SectionHeader"
import { IntroBlock } from "./IntroBlock"
import { CardGridBlock } from "./CardGridBlock"
import { StepListBlock } from "./StepListBlock"
import { DocListBlock } from "./DocListBlock"
import { GalleryBlock } from "./GalleryBlock"
import { CtaBlock } from "./CtaBlock"
import { FeaturedDataBlock } from "./FeaturedDataBlock"
import { ArticleListBlock } from "./ArticleListBlock"
import { UniversityListBlock } from "./UniversityListBlock"
import { CaseGridBlock } from "./CaseGridBlock"
import { ContactInfoBlock } from "./ContactInfoBlock"

interface BlockRendererProps {
  blocks: Block[]
  editable?: boolean
  onEditBlock?: (block: Block) => void
  onEditData?: (block: Block) => void
  /** 字段级配置编辑回调（contact_info 等全局配置字段） */
  onEditConfig?: (section: string) => void
  /** 字段级编辑回调 */
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
}

/** Block 类型中文名映射 */
const TYPE_NAMES: Record<string, string> = {
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

/** 卡片类型中文名映射 */
const CARD_TYPE_LABELS: Record<string, string> = {
  guide: "指南卡片",
  timeline: "时间线",
  city: "城市指南",
  program: "专业卡片",
  checklist: "检查清单",
}

/**
 * 生成 Block 的中文显示标签。
 * 对于 card_grid，格式为 "卡片网格 · 指南卡片"。
 */
function getBlockLabel(block: Block): string {
  const baseName = TYPE_NAMES[block.type] || block.type
  if (block.type === "card_grid" && block.options?.cardType) {
    const cardLabel = CARD_TYPE_LABELS[block.options.cardType] || block.options.cardType
    return `${baseName} · ${cardLabel}`
  }
  return baseName
}

/** Block 列表渲染器 */
export function BlockRenderer({ blocks, editable, onEditBlock, onEditData, onEditConfig, onFieldEdit }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <Fragment key={block.id}>
          {renderBlock(block, editable, onEditData, onEditConfig, onFieldEdit)}
        </Fragment>
      ))}
    </>
  )
}

/** 单个 Block 渲染 */
function renderBlock(
  block: Block,
  editable?: boolean,
  onEditData?: (b: Block) => void,
  onEditConfig?: (section: string) => void,
  onFieldEdit?: (b: Block, fieldKey: string, fieldIndex?: number) => void,
): ReactNode {
  const header = block.showTitle
    ? <SectionHeader tag={block.sectionTag} title={block.sectionTitle} />
    : null
  const bg = block.bgColor === "gray" ? "bg-gray-50" : ""
  const blockLabel = getBlockLabel(block)
  const props = { block, header, bg, editable, onEdit: onEditData, onFieldEdit, blockLabel }

  switch (block.type) {
    case "intro":
      return <IntroBlock {...props} />
    case "card_grid":
      return <CardGridBlock {...props} />
    case "step_list":
      return <StepListBlock {...props} />
    case "doc_list":
      return <DocListBlock {...props} />
    case "gallery":
      return <GalleryBlock {...props} />
    case "article_list":
      return <ArticleListBlock {...props} />
    case "university_list":
      return <UniversityListBlock {...props} />
    case "case_grid":
      return <CaseGridBlock {...props} />
    case "featured_data":
      return <FeaturedDataBlock {...props} />
    case "cta":
      return <CtaBlock {...props} />
    case "contact_info":
      return <ContactInfoBlock {...props} onEditConfig={onEditConfig} />
    default:
      return null
  }
}
