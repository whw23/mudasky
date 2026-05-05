/**
 * Block 类型中文标签。
 * 统一的类型名称映射，供工具栏、编辑弹窗等多处复用。
 */

import type { Block } from "@/types/block"

/** 区块类型中文名 */
export const BLOCK_TYPE_NAMES: Record<string, string> = {
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

/** 卡片子类型中文名 */
export const CARD_TYPE_LABELS: Record<string, string> = {
  guide: "指南卡片",
  timeline: "时间线",
  city: "城市指南",
  program: "专业卡片",
  checklist: "检查清单",
}

/** 精选展示数据类型中文名 */
export const DATA_TYPE_LABELS: Record<string, string> = {
  universities: "院校",
  cases: "案例",
}

/** 画廊布局类型中文名 */
export const GALLERY_TYPE_LABELS: Record<string, string> = {
  grid: "等高网格",
  masonry: "瀑布流",
  rows: "行排列",
  carousel: "轮播",
}

/** 获取 Block 的完整显示标签（含子类型） */
export function getBlockLabel(block: Block): string {
  const base = BLOCK_TYPE_NAMES[block.type] ?? block.type
  if (block.type === "card_grid" && block.options?.cardType) {
    const sub = CARD_TYPE_LABELS[block.options.cardType]
    if (sub) return `${base} · ${sub}`
  }
  if (block.type === "featured_data" && block.options?.dataType) {
    const sub = DATA_TYPE_LABELS[block.options.dataType]
    if (sub) return `${base} · ${sub}`
  }
  if (block.type === "gallery" && block.options?.galleryType) {
    const sub = GALLERY_TYPE_LABELS[block.options.galleryType]
    if (sub) return `${base} · ${sub}`
  }
  return base
}
