"use client"

/**
 * 页面横幅
 * 全宽背景（渐变或图片）+ 遮罩 + 居中标题
 * 支持多图轮播（5秒间隔，淡入淡出）
 * 移动端：缩小高度和字号，隐藏大尺寸装饰圆圈
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

/** 页面横幅组件（支持多图轮播） */
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
      className={`relative flex flex-col items-center justify-center ${
        large ? "min-h-screen" : "min-h-[160px] md:min-h-[240px]"
      }`}
      style={
        !hasImages
          ? { backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }
          : undefined
      }
    >
      {/* Background images with fade transition */}
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

      {/* Overlay mask */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Decorative circles (desktop only) */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      </div>

      {/* Title content */}
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

      {/* Children (e.g. search box on homepage) */}
      {children && <div className="relative z-10 w-full px-4">{children}</div>}
    </div>
  )
}
