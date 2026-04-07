/**
 * 文章侧边栏
 * 包含"最新文章"和"精彩专题"两个区块
 */

import { useTranslations } from "next-intl"

export function ArticleSidebar() {
  const t = useTranslations("Sidebar")

  return (
    <aside className="w-72 shrink-0 space-y-6">
      {/* 最新文章 */}
      <div>
        <h3 className="mb-3 border-l-4 border-primary pl-3 text-base font-bold">
          {t("latestArticles")}
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="truncate">
              {t("articlePlaceholder", { index: i })}
            </li>
          ))}
        </ul>
      </div>

      {/* 精彩专题 */}
      <div>
        <h3 className="mb-3 border-l-4 border-primary pl-3 text-base font-bold">
          {t("featuredTopics")}
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[1, 2, 3].map((i) => (
            <li key={i} className="truncate">
              {t("topicPlaceholder", { index: i })}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
