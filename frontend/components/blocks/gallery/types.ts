/** 画廊布局组件共享类型。 */

import type { ReactNode } from "react"

export interface GalleryItemData {
  image_id: string
  caption: any
  width: number
  height: number
}

export type RenderItem = (item: GalleryItemData, index: number, className: string) => ReactNode
