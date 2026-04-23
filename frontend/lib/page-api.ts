/**
 * 服务端 page_blocks 数据预取。
 * 在 Server Component 中调用，用于 SSR。
 */

import type { Block } from "@/types/block"

const INTERNAL_API = process.env.INTERNAL_API_URL || "http://api:8000"

/** 获取指定页面的 Block 列表 */
export async function fetchPageBlocks(slug: string): Promise<Block[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/public/config/page_blocks`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.value?.[slug] ?? []
  } catch {
    return []
  }
}
