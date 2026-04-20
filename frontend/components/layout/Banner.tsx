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
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#0a0a1a]" />
          <div
            className="absolute -inset-[50%] animate-aurora opacity-60"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 40%, #1a1a4e 0%, transparent 60%),
                radial-gradient(ellipse 60% 80% at 80% 20%, #0f3460 0%, transparent 50%),
                radial-gradient(ellipse 70% 50% at 50% 80%, #16213e 0%, transparent 55%),
                radial-gradient(ellipse 50% 70% at 70% 60%, #1a0a3e 0%, transparent 50%)
              `,
            }}
          />
          <div
            className="absolute -inset-[50%] animate-aurora-reverse opacity-40"
            style={{
              background: `
                radial-gradient(ellipse 60% 70% at 30% 70%, #0d1b3e 0%, transparent 55%),
                radial-gradient(ellipse 80% 50% at 70% 30%, #1a1040 0%, transparent 50%),
                radial-gradient(ellipse 50% 60% at 40% 20%, #0f2850 0%, transparent 60%)
              `,
            }}
          />
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
      <div className={`absolute inset-0 ${hasImages ? "bg-black/40" : "bg-black/20"}`} />

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
