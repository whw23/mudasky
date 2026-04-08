/**
 * 页面横幅
 * 全宽背景（渐变或图片）+ 遮罩 + 居中标题
 * 移动端：缩小高度和字号，隐藏大尺寸装饰圆圈
 */

interface BannerProps {
  /** 中文标题 */
  title: string
  /** 英文副标题 */
  subtitle?: string
  /** 背景图片 URL */
  image?: string
  /** 是否使用大尺寸（首页用） */
  large?: boolean
}

/** 页面横幅组件 */
export function Banner({ title, subtitle, image, large = false }: BannerProps) {
  return (
    <div
      className={`relative flex items-center justify-center bg-cover bg-center ${
        large ? 'min-h-[280px] md:min-h-[420px]' : 'min-h-[160px] md:min-h-[240px]'
      }`}
      style={{
        backgroundImage: image
          ? `url(${image})`
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/40" />

      {/* 装饰线条（仅桌面端） */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      </div>

      {/* 标题内容 */}
      <div className="relative z-10 text-center text-white px-4">
        <h1
          className={`font-bold tracking-wide ${
            large ? 'text-2xl md:text-5xl' : 'text-xl md:text-4xl'
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
    </div>
  )
}
