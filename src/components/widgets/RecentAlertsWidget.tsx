import * as React from 'react'
import { Bell, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAlert } from '@/contexts/AlertContext'
import { useAPI } from '@/contexts/APIContext'
import { useTranslation } from '@/hooks/useTranslation'
import { formatPrice, parseUTCISOString } from '@/lib/format'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ALERTS = 5

export interface RecentAlertsWidgetProps {
  className?: string
  onFullscreenClick?: (ticker: string) => void
}

export function RecentAlertsWidget({ className = '', onFullscreenClick }: RecentAlertsWidgetProps) {
  const { t } = useTranslation()
  const { triggeredAlerts } = useAlert()
  const { allTickersLastData } = useAPI()

  // Filter to alerts triggered in the last 7 days, sort by most recent
  const { recentAlerts, totalRecent } = React.useMemo(() => {
    const now = Date.now()
    const filtered = triggeredAlerts
      .filter((alert) => {
        if (!alert.triggered_at) return false
        const triggeredTime = parseUTCISOString(alert.triggered_at).getTime()
        return now - triggeredTime <= SEVEN_DAYS_MS
      })
      .sort((a, b) => {
        const timeA = a.triggered_at ? parseUTCISOString(a.triggered_at).getTime() : 0
        const timeB = b.triggered_at ? parseUTCISOString(b.triggered_at).getTime() : 0
        return timeB - timeA
      })
    return { recentAlerts: filtered.slice(0, MAX_ALERTS), totalRecent: filtered.length }
  }, [triggeredAlerts])

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = parseUTCISOString(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Don't render if no recent alerts
  if (recentAlerts.length === 0 && totalRecent === 0) {
    return null
  }

  return (
    <div className={`p-4 md:p-6 border-b bg-muted/30 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-green-600 dark:text-green-500" />
        <span className="text-sm font-medium">{t('widgets.recentAlerts.title')}</span>
      </div>
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
        {recentAlerts.map((alert) => {
          const tickerData = allTickersLastData[alert.ticker]
          const lastBar = tickerData?.[tickerData.length - 1]

          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => onFullscreenClick?.(alert.ticker)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-muted/50 transition-colors text-sm"
            >
              <Bell className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400 shrink-0" />
              <span className="font-mono font-semibold">{alert.ticker}</span>
              <span className="text-muted-foreground">
                {formatPrice(alert.target_price, lastBar || { mode: 'vn' })}
              </span>
              {alert.triggered_at && (
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {getRelativeTime(alert.triggered_at)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {totalRecent > MAX_ALERTS && (
        <Link
          to="/alert"
          className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('widgets.recentAlerts.viewAll')} ({totalRecent})
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
