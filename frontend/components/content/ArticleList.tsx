import { ArticleSidebar } from "./ArticleSidebar"

/**
 * 文章列表布局
 * 左侧文章列表 + 右侧 ArticleSidebar
 */

interface ArticleListProps {
  children: React.ReactNode
}

export function ArticleList({ children }: ArticleListProps) {
  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      {/* 文章列表区域 */}
      <div className="flex-1 space-y-4">{children}</div>

      {/* 侧边栏 */}
      <div className="hidden lg:block">
        <ArticleSidebar />
      </div>
    </div>
  )
}
