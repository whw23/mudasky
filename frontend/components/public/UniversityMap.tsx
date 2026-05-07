"use client"

/**
 * 院校位置地图组件。
 * 使用 next/dynamic 包装，仅在客户端加载 ECharts。
 */

import dynamic from "next/dynamic"

interface UniversityMapProps {
  latitude: number
  longitude: number
  name: string
  country: string
}

const MapInner = dynamic(() => import("./UniversityMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-lg bg-gray-200" />
  ),
})

/** ECharts 世界地图标记组件 */
export function UniversityMap(props: UniversityMapProps) {
  return <MapInner {...props} />
}
