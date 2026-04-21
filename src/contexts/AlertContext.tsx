import * as React from 'react'
import { useAPI } from './APIContext'
import { useRefresh } from './RefreshContext'
import { useLogs } from './LogsContext'
import { useChartSettings } from './ChartSettingsContext'
import {
  getAlerts,
  addAlert as addAlertToStorage,
  updateAlert as updateAlertInStorage,
  deleteAlert as deleteAlertFromStorage,
  getActiveAlerts as getActiveAlertsFromStorage,
  type Alert,
} from '@/lib/alert-storage'
import { ALERT_TRIGGER_THRESHOLD } from '@/lib/constants'
import { findPriceCrossBar } from '@/lib/alert-utils'
import { Interval, type StockData } from '@/integrations/aipriceaction/src/types'

interface AlertContextValue {
  alerts: Alert[]
  activeAlerts: Alert[]
  triggeredAlerts: Alert[]
  addAlert: (alert: Omit<Alert, 'id' | 'created_at' | 'triggered'>) => Alert
  updateAlert: (id: string, updates: Partial<Alert>) => void
  deleteAlert: (id: string) => void
  resetAlert: (id: string) => void
  getAlertsByTickerSymbol: (ticker: string) => Alert[]
  checkAlerts: () => void
  lastChecked: Date | null
  refreshAlerts: () => void
}

const AlertContext = React.createContext<AlertContextValue | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { allTickersLastData, allCryptoTickersLastData, getTickers, ema } = useAPI()
  const { lastRefresh } = useRefresh()
  const { info } = useLogs()
  const { endDate: globalEndDate } = useChartSettings()

  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null)

  // Merge VN stocks and crypto data into one lookup
  const allMarketsData = React.useMemo(() => {
    return { ...allTickersLastData, ...allCryptoTickersLastData }
  }, [allTickersLastData, allCryptoTickersLastData])

  // Load alerts from localStorage on mount
  const refreshAlerts = React.useCallback(() => {
    const loadedAlerts = getAlerts()
    setAlerts(loadedAlerts)
  }, [])

  React.useEffect(() => {
    refreshAlerts()
  }, [refreshAlerts])

  // Derived state
  const activeAlerts = React.useMemo(() => {
    return alerts.filter((a) => !a.triggered)
  }, [alerts])

  const triggeredAlerts = React.useMemo(() => {
    return alerts.filter((a) => a.triggered)
  }, [alerts])

  // Add alert
  const addAlert = React.useCallback(
    (alert: Omit<Alert, 'id' | 'created_at' | 'triggered'>) => {
      // Get current price from merged markets data (VN stocks + crypto)
      const tickerData = allMarketsData[alert.ticker]
      const currentPrice = tickerData && tickerData.length > 0
        ? tickerData[tickerData.length - 1].close
        : undefined

      const alertWithPrice = {
        ...alert,
        price_at_creation: currentPrice,
      }

      const newAlert = addAlertToStorage(alertWithPrice)
      setAlerts((prev) => [...prev, newAlert])
      info('Alerts', `Added alert for ${alert.ticker} at ${alert.target_price}`)
      return newAlert
    },
    [info, allMarketsData]
  )

  // Update alert
  const updateAlert = React.useCallback(
    (id: string, updates: Partial<Alert>) => {
      updateAlertInStorage(id, updates)
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      )
      info('Alerts', `Updated alert ${id}`)
    },
    [info]
  )

  // Delete alert
  const deleteAlert = React.useCallback(
    (id: string) => {
      deleteAlertFromStorage(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      info('Alerts', `Deleted alert ${id}`)
    },
    [info]
  )

  // Reset triggered alert
  const resetAlert = React.useCallback(
    (id: string) => {
      const alert = getAlerts().find((a) => a.id === id)
      if (!alert) return

      const tickerData = allMarketsData[alert.ticker]
      const currentPrice = tickerData && tickerData.length > 0
        ? tickerData[tickerData.length - 1].close
        : undefined

      const now = new Date().toISOString()
      const updates = {
        triggered: false,
        triggered_at: undefined,
        created_at: now,
        price_at_creation: currentPrice,
        last_checked_bar_time: now,
      }
      updateAlertInStorage(id, updates)
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      )
      info('Alerts', `Reset alert for ${alert.ticker} at ${alert.target_price}`)
    },
    [allMarketsData, info]
  )

  // Get alerts by ticker
  const getAlertsByTickerSymbol = React.useCallback(
    (ticker: string) => {
      return alerts.filter((a) => a.ticker === ticker)
    },
    [alerts]
  )

  // Check alerts against current prices
  const checkAlerts = React.useCallback(async () => {
    const activeAlertsList = getActiveAlertsFromStorage()
    if (activeAlertsList.length === 0) return

    const newlyTriggered: Alert[] = []
    let hasUpdates = false // Track if any updates were made

    info('Alerts', `🔍 Checking ${activeAlertsList.length} active alert(s)...`)

    // Pre-scan: find the max days since creation across all alerts for a single batch fetch
    const priceHitsAlerts = activeAlertsList.filter(a => a.alert_type === 'price_hits')
    if (priceHitsAlerts.length === 0) {
      setLastChecked(new Date())
      return
    }

    const maxDaysSinceCreation = Math.max(
      ...priceHitsAlerts.map(a =>
        Math.max(1, Math.min(100, Math.ceil(
          (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )))
      )
    )

    // Single batch fetch: all tickers, all modes, enough bars for the oldest alert + buffer
    const batchLimit = maxDaysSinceCreation + 10
    info('Alerts', `📊 Batch fetching ${batchLimit} daily bars (mode=all) for ${priceHitsAlerts.length} alert(s)...`)

    let batchData: Record<string, StockData[]> = {}
    try {
      batchData = await getTickers('AlertContext.batchCheck', {
        interval: Interval.Daily,
        limit: batchLimit,
        mode: 'all',
        ma: false,
      })
    } catch (error) {
      info('Alerts', `❌ Batch fetch failed: ${error}`)
      setLastChecked(new Date())
      return
    }

    const uniqueTickersInBatch = Object.keys(batchData).length
    info('Alerts', `📊 Batch fetched ${uniqueTickersInBatch} ticker(s)`)

    for (const alert of priceHitsAlerts) {
      info('Alerts', `→ ${alert.ticker} target=${alert.target_price} created=${alert.created_at.split('T')[0]} price_at_creation=${alert.price_at_creation ?? 'N/A'} last_checked=${alert.last_checked_bar_time?.split('T')[0] ?? 'never'}`)

      let creationPrice = alert.price_at_creation
      const createdDate = alert.created_at.split('T')[0]

      // If no creation price, estimate from batch data
      if (!creationPrice) {
        const bars = batchData[alert.ticker]
        if (bars && bars.length > 0) {
          // Find bar closest to (but not after) creation date
          const nearestBar = bars
            .filter(b => b.time.split('T')[0] <= createdDate)
            .pop()
          if (nearestBar) {
            creationPrice = nearestBar.close
            const updates = { price_at_creation: creationPrice }
            updateAlertInStorage(alert.id, updates)
            hasUpdates = true
            info('Alerts', `  ✅ Estimated creation price: ${creationPrice} (from ${nearestBar.time.split('T')[0]})`)
            info('Alerts', `  💾 Saved to localStorage: ${JSON.stringify(updates)}`)
          } else {
            info('Alerts', `  ⚠️  No bars before creation date in batch for ${alert.ticker}`)
          }
        } else {
          info('Alerts', `  ⚠️  No bars in batch for ${alert.ticker}`)
        }
      }

      // Check if ticker data is available for real-time checking
      const tickerData = allMarketsData[alert.ticker]
      if (!tickerData || tickerData.length === 0) {
        info('Alerts', `  ⏭️  No current market data for ${alert.ticker}, skipping...`)
        continue
      }

      const currentPrice = tickerData[tickerData.length - 1].close
      info('Alerts', `  💹 Current price: ${currentPrice}`)

      // If we still don't have creation price, fall back to threshold-based check
      if (!creationPrice) {
        const distance = Math.abs(
          ((currentPrice - alert.target_price) / alert.target_price) * 100
        )
        info('Alerts', `  🎯 Fallback: distance=${distance.toFixed(2)}% threshold=${ALERT_TRIGGER_THRESHOLD}%`)

        if (distance <= ALERT_TRIGGER_THRESHOLD) {
          const triggeredAt = new Date().toISOString()
          const updates = {
            triggered: true,
            triggered_at: triggeredAt,
          }
          updateAlertInStorage(alert.id, updates)

          newlyTriggered.push({
            ...alert,
            triggered: true,
            triggered_at: triggeredAt,
          })
          hasUpdates = true

          info(
            'Alerts',
            `🔔 Alert triggered (fallback): ${alert.ticker} reached ${currentPrice} (target: ${alert.target_price})`
          )
          info('Alerts', `  💾 Saved to localStorage: ${JSON.stringify(updates)}`)
        } else {
          info('Alerts', `  ⏸️  Not triggered (too far)`)
        }
        continue
      }

      // Use batch data for cross checking
      const allBars = batchData[alert.ticker]
      // Only check bars from creation date onwards
      const bars = allBars?.filter(b => b.time.split('T')[0] >= createdDate) ?? []
      if (bars.length > 0) {
        info('Alerts', `  📈 Got ${bars.length} bar(s), checking for cross from ${creationPrice} to ${alert.target_price}...`)

        // Find if price crossed target in any bar
        const crossedBar = findPriceCrossBar(creationPrice, alert.target_price, bars)

        if (crossedBar) {
          // Alert triggered! Use the bar's timestamp
          const triggeredAt = crossedBar.time
          const updates = {
            triggered: true,
            triggered_at: triggeredAt,
          }
          updateAlertInStorage(alert.id, updates)

          newlyTriggered.push({
            ...alert,
            triggered: true,
            triggered_at: triggeredAt,
          })
          hasUpdates = true

          info(
            'Alerts',
            `🔔 Alert triggered: ${alert.ticker} crossed ${alert.target_price} on ${triggeredAt.split('T')[0]} (from ${creationPrice})`
          )
          info('Alerts', `  💾 Saved to localStorage: ${JSON.stringify(updates)}`)
        } else {
          // No crossing found, update last_checked_bar_time to latest bar
          const latestBar = bars[bars.length - 1]
          const updates = { last_checked_bar_time: latestBar.time }
          updateAlertInStorage(alert.id, updates)
          hasUpdates = true
          info('Alerts', `  ✅ No cross found. Updated last_checked to ${latestBar.time.split('T')[0]}`)
          info('Alerts', `  💾 Saved to localStorage: ${JSON.stringify(updates)}`)
        }
      } else {
        info('Alerts', `  ⚠️  No bars returned for ${alert.ticker}`)
      }
    }

    // Refresh alerts state if any updates were made
    if (hasUpdates) {
      refreshAlerts()
    }

    setLastChecked(new Date())

    // Summary log
    if (newlyTriggered.length > 0) {
      info('Alerts', `✅ Check complete: ${newlyTriggered.length} alert(s) triggered`)
    } else {
      info('Alerts', `✅ Check complete: No alerts triggered`)
    }
  }, [allMarketsData, allTickersLastData, allCryptoTickersLastData, getTickers, info, refreshAlerts, ema])

  // Auto-check alerts when data refreshes OR on initial load
  React.useEffect(() => {
    // Only check alerts if using current data (no historical date filter)
    if (globalEndDate) {
      info('Alerts', `⏸️ Alert checking paused - viewing historical data (${globalEndDate})`)
      return
    }

    // Run check if we have data (either from refresh or initial load)
    if (Object.keys(allMarketsData).length > 0) {
      checkAlerts()
    }
  }, [lastRefresh, allMarketsData, checkAlerts, globalEndDate, info])

  const value: AlertContextValue = {
    alerts,
    activeAlerts,
    triggeredAlerts,
    addAlert,
    updateAlert,
    deleteAlert,
    resetAlert,
    getAlertsByTickerSymbol,
    checkAlerts,
    lastChecked,
    refreshAlerts,
  }

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
}

export function useAlert(): AlertContextValue {
  const context = React.useContext(AlertContext)
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}
