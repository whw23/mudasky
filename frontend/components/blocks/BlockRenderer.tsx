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
}

/** Block 列表渲染器 */
export function BlockRenderer({ blocks, editable, onEditBlock, onEditData, onEditConfig }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <Fragment key={block.id}>
          {renderBlock(block, editable, onEditData, onEditConfig)}
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
): ReactNode {
  const header = block.showTitle
    ? <SectionHeader tag={block.sectionTag} title={block.sectionTitle} />
    : null
  const bg = block.bgColor === "gray" ? "bg-gray-50" : ""
  const props = { block, header, bg, editable, onEdit: onEditData }

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
