/**
 * 文章侧边栏
 * 包含"最新文章"和"精彩专题"两个区块
 */

export function ArticleSidebar() {
  return (
    <aside className="w-72 shrink-0 space-y-6">
      {/* 最新文章 */}
      <div>
        <h3 className="mb-3 border-l-4 border-primary pl-3 text-base font-bold">
          最新文章
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="truncate">文章占位 1</li>
          <li className="truncate">文章占位 2</li>
          <li className="truncate">文章占位 3</li>
          <li className="truncate">文章占位 4</li>
          <li className="truncate">文章占位 5</li>
        </ul>
      </div>

      {/* 精彩专题 */}
      <div>
        <h3 className="mb-3 border-l-4 border-primary pl-3 text-base font-bold">
          精彩专题
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="truncate">专题占位 1</li>
          <li className="truncate">专题占位 2</li>
          <li className="truncate">专题占位 3</li>
        </ul>
      </div>
    </aside>
  )
}
