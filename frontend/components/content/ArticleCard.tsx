import Link from "next/link"

/**
 * 文章卡片
 * hover 时整张卡片变为品牌红底白字
 */

interface ArticleCardProps {
  id: number
  title: string
  summary: string
  date: string
  image?: string
}

/** 解析日期，返回 { day, monthYear } */
function formatDate(dateStr: string): { day: string; monthYear: string } {
  const d = new Date(dateStr)
  return {
    day: String(d.getDate()).padStart(2, "0"),
    monthYear: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
  }
}

export function ArticleCard({
  id,
  title,
  summary,
  date,
  image,
}: ArticleCardProps) {
  const { day, monthYear } = formatDate(date)

  return (
    <Link href={`/articles/${id}`} className="group block">
      <div className="flex gap-4 rounded-lg border p-4 transition-colors group-hover:bg-primary group-hover:text-white">
        {/* 日期显示 */}
        <div className="flex shrink-0 flex-col items-center justify-center">
          <span className="text-3xl font-bold leading-none">{day}</span>
          <span className="mt-1 text-xs text-muted-foreground group-hover:text-white/80">
            {monthYear}
          </span>
        </div>

        {/* 文章内容 */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground group-hover:text-white/80">
            {summary}
          </p>
        </div>

        {/* 封面图 */}
        {image && (
          <div className="hidden shrink-0 sm:block">
            <img
              src={image}
              alt={title}
              className="size-20 rounded object-cover"
            />
          </div>
        )}
      </div>
    </Link>
  )
}
