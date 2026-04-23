"use client"

/**
 * 添加区块弹窗。
 * 展示所有可用的区块类型，点击选择后触发 onSelect 回调。
 */

import {
  FileText, LayoutGrid, ListOrdered, FileCheck,
  Images, Newspaper, GraduationCap, Trophy, Star, Megaphone, Contact,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody,
} from "@/components/ui/dialog"
import type { BlockType } from "@/types/block"

/** 区块类型注册表 */
interface BlockRegistryItem {
  type: BlockType
  name: string
  desc: string
  icon: LucideIcon
}

const BLOCK_REGISTRY: BlockRegistryItem[] = [
  { type: "intro", name: "介绍", desc: "标题 + 描述段落", icon: FileText },
  { type: "card_grid", name: "卡片网格", desc: "图标卡片 / 时间线 / 城市指南", icon: LayoutGrid },
  { type: "step_list", name: "步骤列表", desc: "编号步骤纵向列表", icon: ListOrdered },
  { type: "doc_list", name: "文档清单", desc: "图标 + 文本列表", icon: FileCheck },
  { type: "gallery", name: "图片墙", desc: "水平滚动图片画廊", icon: Images },
  { type: "article_list", name: "文章列表", desc: "按分类的文章列表", icon: Newspaper },
  { type: "university_list", name: "院校列表", desc: "搜索筛选院校", icon: GraduationCap },
  { type: "case_grid", name: "案例网格", desc: "成功案例卡片", icon: Trophy },
  { type: "featured_data", name: "精选展示", desc: "精选院校或案例", icon: Star },
  { type: "cta", name: "行动号召", desc: "标题 + 描述 + 咨询按钮", icon: Megaphone },
  { type: "contact_info", name: "联系方式", desc: "联系信息卡片（数据来自全局配置）", icon: Contact },
]

interface AddBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: BlockType) => void
}

/** 添加区块弹窗 */
export function AddBlockDialog({ open, onOpenChange, onSelect }: AddBlockDialogProps) {
  /** 选择区块类型 */
  function handleSelect(type: BlockType): void {
    onSelect(type)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加区块</DialogTitle>
          <DialogDescription>选择要添加的区块类型</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            {BLOCK_REGISTRY.map((item) => (
              <div
                key={item.type}
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelect(item.type)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleSelect(item.type)
                  }
                }}
              >
                <item.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
