import { useEffect, useState } from 'react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import type { HealthResponse } from '@/lib/api-client'

export interface HealthStatus {
  health: HealthResponse | null
  isLoading: boolean
  error: Error | null
  dataAge: {
    daily: number | null  // milliseconds since last sync
    hourly: number | null
    minute: number | null
  }
  colorStatus: 'green' | 'yellow' | 'red' | 'gray'
}

/**
 * Hook to fetch and monitor API health status
 * Polls every 30 seconds when auto-refresh is enabled
 */
export function useHealthStatus(): HealthStatus {
  const { getHealth } = useAPI()
  const { isRefreshEnabled, lastRefresh } = useRefresh()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchHealth = async () => {
    try {
      setIsLoading(true)
      const healthData = await getHealth('StatusBar')
      console.log('[StatusBar] Health data received:', healthData)
      setHealth(healthData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch health'))
      console.error('[StatusBar] Health check failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch on mount and when lastRefresh changes
  useEffect(() => {
    fetchHealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh])

  // Poll every 30 seconds when refresh is enabled
  useEffect(() => {
    if (!isRefreshEnabled) return

    const intervalId = setInterval(fetchHealth, 30000) // 30 seconds
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshEnabled])

  // Calculate data age from sync timestamps
  const dataAge = {
    daily: health?.daily_last_sync
      ? Date.now() - new Date(health.daily_last_sync).getTime()
      : null,
    hourly: health?.hourly_last_sync
      ? Date.now() - new Date(health.hourly_last_sync).getTime()
      : null,
    minute: health?.minute_last_sync
      ? Date.now() - new Date(health.minute_last_sync).getTime()
      : null,
  }

  // Determine color status based on most critical (minute) data age
  let colorStatus: 'green' | 'yellow' | 'red' | 'gray' = 'gray'

  if (error || !health) {
    colorStatus = 'red'
  } else {
    // Use minute data age as primary indicator (most time-sensitive)
    const minuteAge = dataAge.minute

    if (minuteAge === null) {
      colorStatus = 'gray' // No minute data available
    } else if (minuteAge < 5 * 60 * 1000) { // < 5 minutes
      colorStatus = 'green'
    } else if (minuteAge < 15 * 60 * 1000) { // < 15 minutes
      colorStatus = 'yellow'
    } else {
      colorStatus = 'red' // > 15 minutes (stale)
    }
  }

  return {
    health,
    isLoading,
    error,
    dataAge,
    colorStatus,
  }
}
