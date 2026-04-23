'use client'

/**
 * 关于页面动态内容区块。
 * 从系统配置获取公司历史、使命、愿景和合作内容。
 * 编辑模式下支持点击编辑各区块。
 */

import { useTranslations } from 'next-intl'
import { Award, Globe } from 'lucide-react'
import { useLocalizedConfig } from '@/contexts/ConfigContext'
import { EditableOverlay } from '@/components/admin/EditableOverlay'

interface EditableProps {
  editable?: boolean
  onEdit?: () => void
}

interface MissionVisionProps {
  editable?: boolean
  onEditMission?: () => void
  onEditVision?: () => void
}

/** 公司历史区块 */
export function HistorySection({ editable, onEdit, onEditTitle }: EditableProps & { onEditTitle?: () => void }) {
  const t = useTranslations('About')
  const { aboutInfo } = useLocalizedConfig()

  const title = aboutInfo.history_title || t('historyTitle')
  const titleEl = <h3 className="mt-2 text-2xl md:text-3xl font-bold">{title}</h3>

  const content = (
    <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
      {aboutInfo.history || t('historyContent')}
    </p>
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Our Story</h2>
        {editable && onEditTitle ? (
          <EditableOverlay onClick={onEditTitle} label="编辑标题">{titleEl}</EditableOverlay>
        ) : titleEl}
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      {editable ? (
        <EditableOverlay onClick={() => onEdit?.()} label="编辑公司历史">{content}</EditableOverlay>
      ) : content}
    </section>
  )
}

/** 使命愿景区块 */
export function MissionVisionSection({ editable, onEditMission, onEditVision }: MissionVisionProps) {
  const t = useTranslations('About')
  const { aboutInfo } = useLocalizedConfig()

  const missionContent = (
    <div className="rounded-lg border bg-white p-8">
      <Award className="h-10 w-10 text-primary" />
      <h3 className="mt-4 text-xl font-bold">{t('missionTitle')}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {aboutInfo.mission || t('missionContent')}
      </p>
    </div>
  )

  const visionContent = (
    <div className="rounded-lg border bg-white p-8">
      <Globe className="h-10 w-10 text-primary" />
      <h3 className="mt-4 text-xl font-bold">{t('visionTitle')}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {aboutInfo.vision || t('visionContent')}
      </p>
    </div>
  )

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {editable ? (
        <EditableOverlay onClick={() => onEditMission?.()} label="编辑使命">
          {missionContent}
        </EditableOverlay>
      ) : missionContent}
      {editable ? (
        <EditableOverlay onClick={() => onEditVision?.()} label="编辑愿景">
          {visionContent}
        </EditableOverlay>
      ) : visionContent}
    </div>
  )
}

