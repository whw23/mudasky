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

interface PartnershipProps {
  editable?: boolean
  onEdit?: () => void
  withWrapper?: boolean
}

/** 公司历史区块 */
export function HistorySection({ editable, onEdit }: EditableProps) {
  const t = useTranslations('About')
  const { aboutInfo } = useLocalizedConfig()

  const content = (
    <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
      {aboutInfo.history || t('historyContent')}
    </p>
  )

  if (editable) {
    return (
      <EditableOverlay onClick={() => onEdit?.()} label="编辑公司历史">
        {content}
      </EditableOverlay>
    )
  }

  return content
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

/** 合作介绍区块 */
export function PartnershipSection({ editable, onEdit, withWrapper }: PartnershipProps) {
  const t = useTranslations('About')
  const { aboutInfo } = useLocalizedConfig()

  const innerContent = (
    <p className="leading-relaxed text-muted-foreground">
      {aboutInfo.partnership || t('partnershipContent')}
    </p>
  )

  const editableContent = editable ? (
    <EditableOverlay onClick={() => onEdit?.()} label="编辑合作介绍">
      {innerContent}
    </EditableOverlay>
  ) : innerContent

  if (!withWrapper) return editableContent

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Partnership</h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t('partnershipTitle')}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mx-auto mt-8 max-w-4xl rounded-lg border bg-gray-50 p-8 md:p-12">
        {editableContent}
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{t('partnerBadge1')}</span>
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{t('partnerBadge2')}</span>
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{t('partnerBadge3')}</span>
        </div>
      </div>
    </section>
  )
}

/** 关于页面统计区块 */
export function AboutStatsSection() {
  const { homepageStats } = useLocalizedConfig()

  return (
    <section className="border-y bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-10 md:grid-cols-4 md:py-14">
        {homepageStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">
              {stat.value}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
