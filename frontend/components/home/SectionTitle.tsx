/**
 * 通用节标题组件。
 * @deprecated 将在后续任务中删除，请勿新增使用。
 */

interface SectionTitleProps {
  /** @deprecated SectionTitle 将在后续任务中删除 */
  configKey?: string
  fallback: string
  className?: string
}

/** 从配置读取的节标题（翻译兜底） */
export function SectionTitle({ fallback, className }: SectionTitleProps) {
  return <h3 className={className}>{fallback}</h3>
}
