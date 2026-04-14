'use client'

/**
 * 登录设备管理区块。
 * 显示用户的所有登录设备，支持踢出单个设备或所有其他设备。
 */

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getApiError } from '@/lib/api-error'

interface Session {
  id: string
  user_agent: string | null
  ip_address: string | null
  created_at: string
  is_current: boolean
}

/** 解析 user_agent 为可读文本 */
function parseUserAgent(ua: string | null, unknownDevice: string): string {
  if (!ua) return unknownDevice
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0]
    ?? ua.match(/(MSIE|Trident)\/[\d.]+/)?.[0]
    ?? unknownDevice
  const os = ua.match(/(Windows|Mac OS X|Linux|Android|iOS)[\s/]?[\d._]*/)?.[0]
    ?? ""
  return os ? `${browser} · ${os}` : browser
}

export function SessionManagement() {
  const t = useTranslations('Profile')
  const tErr = useTranslations('ApiErrors')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  /** 获取会话列表 */
  async function fetchSessions(): Promise<void> {
    setSessionsLoading(true)
    try {
      const res = await api.get<Session[]>('/portal/profile/sessions/list')
      setSessions(res.data)
    } catch (err) {
      toast.error(getApiError(err, tErr, t('saveFailed')))
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  /** 踢出单个设备 */
  async function revokeSession(tokenId: string): Promise<void> {
    setLoading(true)
    try {
      await api.post('/portal/profile/sessions/list/revoke', { token_id: tokenId })
      toast.success(t('sessionRevoked'))
      await fetchSessions()
    } catch (err) {
      toast.error(getApiError(err, tErr, t('saveFailed')))
    } finally {
      setLoading(false)
    }
  }

  /** 踢出所有其他设备 */
  async function revokeAllOthers(): Promise<void> {
    setLoading(true)
    try {
      await api.post('/portal/profile/sessions/list/revoke-all')
      toast.success(t('allSessionsRevoked'))
      await fetchSessions()
    } catch (err) {
      toast.error(getApiError(err, tErr, t('saveFailed')))
    } finally {
      setLoading(false)
    }
  }

  const otherSessions = sessions.filter((s) => !s.is_current)

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{t('sessions')}</Label>
          {otherSessions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive"
              onClick={revokeAllOthers}
              disabled={loading || sessionsLoading}
            >
              <LogOut className="mr-1 size-3" />
              {t('revokeAllOthers')}
            </Button>
          )}
        </div>
        {sessionsLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noOtherSessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between rounded-md border p-3 text-sm"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {parseUserAgent(session.user_agent, t('unknownDevice'))}
                    </span>
                    {session.is_current && (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {t('currentDevice')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.ip_address || 'N/A'} · {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {!session.is_current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => revokeSession(session.id)}
                    disabled={loading || sessionsLoading}
                  >
                    {t('revokeSession')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
