/**
 * 页面区块（Block）类型定义。
 * 每个页面由若干 Block 组成，Block.data 包含实际内容。
 */

import type { LocalizedField } from "@/lib/i18n-config"

/** 支持的区块类型 */
export type BlockType =
  | "intro"
  | "card_grid"
  | "step_list"
  | "doc_list"
  | "gallery"
  | "article_list"
  | "university_list"
  | "case_grid"
  | "featured_data"
  | "cta"
  | "contact_info"

/** 页面区块 */
export interface Block {
  id: string
  type: BlockType
  showTitle: boolean
  sectionTag: string
  sectionTitle: LocalizedField
  bgColor: "white" | "gray"
  options: Record<string, any>
  data: any
}

/** 所有页面的区块配置，key 为页面路径 */
export type PageBlocks = Record<string, Block[]>

/** 卡片子类型 */
export type CardType = "guide" | "timeline" | "city" | "program" | "checklist"

/** ContactInfo Block 条目引用（全局引用或自定义） */
export type ContactInfoBlockItem =
  | { type: "global"; id: string }
  | {
      type: "custom"
      icon: string
      label: LocalizedField
      content: LocalizedField
      image_id: string | null
      hover_zoom: boolean
    }
