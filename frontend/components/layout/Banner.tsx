/**
 * 页面横幅
 * 全宽背景图 + 遮罩 + 居中标题
 */

interface BannerProps {
  title: string
  subtitle?: string
  image?: string
}

/** 页面横幅组件 */
export function Banner({ title, subtitle, image }: BannerProps) {
  return (
    <div
      className="relative flex min-h-48 items-center justify-center bg-gray-800 bg-cover bg-center"
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      {/* 遮罩层 */}
      {image && <div className="absolute inset-0 bg-black/50" />}

      {/* 标题内容 */}
      <div className="relative z-10 text-center text-white">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-lg text-white/80">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
