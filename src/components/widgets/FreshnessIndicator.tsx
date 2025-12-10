import { useHealthStatus } from '@/hooks/useHealthStatus'
import { useTranslation } from '@/hooks/useTranslation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEffect, useState, useCallback, useRef } from 'react'

interface FreshnessIndicatorProps {
  dataDate?: string // Optional - only for tooltip display
  className?: string
}

export function FreshnessIndicator({ dataDate, className = '' }: FreshnessIndicatorProps) {
  const { t } = useTranslation()
  const { health } = useHealthStatus()
  const [currentAge, setCurrentAge] = useState<number | null>(null)
  const syncTimeRef = useRef<string | null>(null)

  // Memoize the update function to prevent recreation
  const updateAge = useCallback(() => {
    if (health?.daily_last_sync) {
      const now = Date.now()
      const syncTime = new Date(health.daily_last_sync).getTime()
      const age = now - syncTime
      setCurrentAge(age)
      syncTimeRef.current = health.daily_last_sync
    } else {
      setCurrentAge(null)
      syncTimeRef.current = null
    }
  }, [health?.daily_last_sync])

  // Set up interval with stable dependencies
  useEffect(() => {
    updateAge()
    const interval = setInterval(updateAge, 1000)
    return () => clearInterval(interval)
  }, [updateAge])

  // Determine freshness based on current daily data sync age
  let freshness: 'fresh' | 'aging' | 'stale' | 'unknown' = 'unknown'

  if (currentAge === null) {
    freshness = 'unknown'
  } else {
    const minutes = currentAge / (1000 * 60) // Convert milliseconds to minutes
    if (minutes < 1) {
      freshness = 'fresh' // < 1 minute
    } else if (minutes < 5) {
      freshness = 'aging' // 1-5 minutes
    } else {
      freshness = 'stale' // > 5 minutes
    }
  }

  const dotColors = {
    fresh: 'bg-green-500',
    aging: 'bg-yellow-500',
    stale: 'bg-red-500',
    unknown: 'bg-gray-400'
  }

  const getTooltipContent = () => {
    if (currentAge === null) {
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {t('common.freshness.unknown')}
          </div>
          <div className="text-muted-foreground text-xs">
            No health data available
          </div>
        </div>
      )
    }

    const minutes = Math.floor(currentAge / (1000 * 60))
    const seconds = Math.floor((currentAge % (1000 * 60)) / 1000)
    const timeAgo = minutes > 0 ? `${minutes}m ${seconds}s ago` : `${seconds}s ago`

    return (
      <div className="space-y-1">
        <div className="font-medium">
          {freshness === 'fresh' ? '✓ ' : freshness === 'aging' ? '⚠ ' : '✗ '}
          {t(`common.freshness.${freshness}`)}
        </div>
        <div className="text-muted-foreground text-xs">
          {t('common.freshness.dailySyncAge')}: {timeAgo}
        </div>
        {dataDate && (
          <div className="text-muted-foreground text-xs">
            {t('common.freshness.widgetData')}: {new Date(dataDate).toLocaleDateString('vi-VN')}
          </div>
        )}
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={`w-2 h-2 rounded-full cursor-help transition-colors hover:scale-110 ${freshness !== 'unknown' ? 'animate-pulse' : ''} ${dotColors[freshness]} ${className}`}
          title={t(`common.freshness.${freshness}`)}
          aria-label={t(`common.freshness.${freshness}`)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 text-xs" align="start" side="top">
        {getTooltipContent()}
      </PopoverContent>
    </Popover>
  )
}