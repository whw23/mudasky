"use client"

/**
 * 页面横幅
 * 全宽背景（弥漫渐变动画或图片轮播）+ 遮罩 + 居中标题
 * 支持多图轮播（5秒间隔，淡入淡出）
 * 无图片时显示流动渐变动画背景
 */

import { useEffect, useState } from "react"

interface BannerProps {
  /** 中文标题 */
  title: string
  /** 英文副标题 */
  subtitle?: string
  /** 背景图片 ID 数组 */
  imageIds?: string[]
  /** 是否使用大尺寸（首页用） */
  large?: boolean
  /** 子元素（如首页搜索框） */
  children?: React.ReactNode
}

/** 页面横幅组件（支持多图轮播 + 弥漫渐变动画） */
export function Banner({ title, subtitle, imageIds = [], large = false, children }: BannerProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (imageIds.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % imageIds.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [imageIds.length])

  const hasImages = imageIds.length > 0

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden ${
        large ? "min-h-screen" : "min-h-[160px] md:min-h-[240px]"
      }`}
    >
      {/* 弥漫渐变动画背景（无图片时） */}
      {!hasImages && (
        <div className="absolute inset-0 overflow-hidden bg-[#a8d4f0]">
          {/* 弥散渐变色块 */}
          <div className="absolute inset-0 blur-[120px]">
            <div className="absolute h-[60%] w-[50%] rounded-full bg-[#89c4e8] animate-blob-1" style={{ top: "10%", left: "15%" }} />
            <div className="absolute h-[50%] w-[45%] rounded-full bg-[#c9a0dc] animate-blob-2" style={{ top: "30%", left: "55%" }} />
            <div className="absolute h-[55%] w-[40%] rounded-full bg-[#7eb8e0] animate-blob-3" style={{ top: "50%", left: "25%" }} />
            <div className="absolute h-[45%] w-[50%] rounded-full bg-[#d4a5d8] animate-blob-4" style={{ top: "5%", left: "60%" }} />
            <div className="absolute h-[40%] w-[35%] rounded-full bg-[#96c8ea] animate-blob-5" style={{ top: "60%", left: "65%" }} />
          </div>
        </div>
      )}

      {/* 背景图片轮播 */}
      {hasImages &&
        imageIds.map((id, i) => (
          <div
            key={id}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(/api/public/images/detail?id=${id})`,
              opacity: i === activeIndex ? 1 : 0,
            }}
          />
        ))}

      {/* 遮罩层 */}
      <div className={`absolute inset-0 ${hasImages ? "bg-black/40" : "bg-black/30"}`} />

      {/* 装饰圆环（桌面端） */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />
      </div>

      {/* 标题 */}
      <div className="relative z-10 text-center text-white px-4">
        <h1
          className={`font-bold tracking-wide ${
            large ? "text-2xl md:text-5xl" : "text-xl md:text-4xl"
          }`}
        >
          【{title}】
        </h1>
        {subtitle && (
          <p className="mt-2 md:mt-3 text-xs md:text-sm tracking-[0.3em] uppercase text-white/70">
            {subtitle}
          </p>
        )}
      </div>

      {/* 子元素（首页搜索框等） */}
      {children && <div className="relative z-10 w-full px-4">{children}</div>}
    </div>
  )
}
