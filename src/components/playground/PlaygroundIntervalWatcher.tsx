import * as React from 'react'
import { usePlayground } from './PlaygroundDataProvider'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useAPI } from '@/contexts/APIContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Interval } from '@/lib/api-client'

/**
 * Component that watches for interval changes and checks data availability.
 * Shows a message when switching to intraday intervals on dates where data is not available.
 */
export function PlaygroundIntervalWatcher() {
  const { playgroundData } = usePlayground()
  const { interval } = useChartSettings()
  const { getTickers } = useAPI()
  const { info } = useLogs()
  const { t } = useTranslation()

  // State to track if data is available
  const [isDataAvailable, setIsDataAvailable] = React.useState<boolean | null>(null)
  const [isChecking, setIsChecking] = React.useState(false)

  // Previous interval to detect changes
  const prevIntervalRef = React.useRef(interval)

  // Get current visible date (last item)
  const currentVisibleDate = playgroundData.allData.length > 0 && playgroundData.currentIndex >= 0
    ? playgroundData.allData[playgroundData.currentIndex]?.time?.split('T')[0]
    : null

  // Check data availability when interval changes
  React.useEffect(() => {
    // Only check if we have a visible date and interval actually changed
    if (!currentVisibleDate || interval === prevIntervalRef.current) {
      return
    }

    // Debug: log the interval value
    console.log('[PlaygroundIntervalWatcher] Checking interval:', interval, 'for date:', currentVisibleDate)

    // Only check for intraday intervals (not daily)
    const isIntraday = interval !== '1D'
    if (!isIntraday) {
      setIsDataAvailable(true) // Daily data is always available
      return
    }

    const checkDataAvailability = async () => {
      setIsChecking(true)
      prevIntervalRef.current = interval

      info(`[Playground] Checking data availability for ${interval} interval at ${currentVisibleDate}`)

      try {
        const response = await getTickers('PlaygroundIntervalWatcher.check', {
          symbol: playgroundData.ticker,
          interval,
          end_date: currentVisibleDate,
          limit: 1, // Just check if any data exists
          mode: 'vn'
        })

        const data = response[playgroundData.ticker] || []
        const hasData = data.length > 0

        setIsDataAvailable(hasData)

        if (hasData) {
          info(`[Playground] ✓ Data available for ${interval} at ${currentVisibleDate}`)
        } else {
          info(`[Playground] ⚠️ No data available for ${interval} at ${currentVisibleDate}`)
        }
      } catch (error) {
        console.warn('[Playground] Failed to check data availability:', error)
        setIsDataAvailable(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkDataAvailability()
  }, [currentVisibleDate, interval, playgroundData.ticker, getTickers, info])

  // Reset when switching back to daily
  React.useEffect(() => {
    if (interval === '1D') {
      setIsDataAvailable(true)
    }
  }, [interval])

  // Don't render anything if checking or data is available
  if (isChecking || isDataAvailable === null || isDataAvailable === true) {
    return null
  }

  // Show warning message when no intraday data is available
  const getWarningMessage = () => {
    if (interval === '1H') {
      return t('common.playground.intervalWarning.hourlyUnavailable', {
        date: currentVisibleDate
      })
    }

    if (interval === '15m' || interval === '5m' || interval === '1m' || interval === '30m') {
      return t('common.playground.intervalWarning.minuteUnavailable', {
        interval,
        date: currentVisibleDate
      })
    }

    return t('common.playground.intervalWarning.generalUnavailable', {
      interval,
      date: currentVisibleDate
    })
  }

  return (
    <div className="px-4 md:px-6 py-2">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">⚠️</span>
          <span className="text-amber-800">
            {getWarningMessage()}
          </span>
        </div>
      </div>
    </div>
  )
}