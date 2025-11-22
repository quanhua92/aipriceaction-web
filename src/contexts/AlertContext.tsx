import * as React from 'react'
import { useAPI } from './APIContext'
import { useRefresh } from './RefreshContext'
import { useLogs } from './LogsContext'
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
import { Interval } from '@/integrations/aipriceaction/src/types'

interface AlertContextValue {
  alerts: Alert[]
  activeAlerts: Alert[]
  triggeredAlerts: Alert[]
  addAlert: (alert: Omit<Alert, 'id' | 'created_at' | 'triggered'>) => Alert
  updateAlert: (id: string, updates: Partial<Alert>) => void
  deleteAlert: (id: string) => void
  getAlertsByTickerSymbol: (ticker: string) => Alert[]
  checkAlerts: () => void
  lastChecked: Date | null
  refreshAlerts: () => void
}

const AlertContext = React.createContext<AlertContextValue | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { allTickersLastData, allCryptoTickersLastData, getTickers } = useAPI()
  const { lastRefresh } = useRefresh()
  const { info } = useLogs()

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
    const newlyTriggered: Alert[] = []
    let hasUpdates = false // Track if any updates were made

    info('Alerts', `🔍 Checking ${activeAlertsList.length} active alert(s)...`)

    for (const alert of activeAlertsList) {
      info('Alerts', `→ ${alert.ticker} target=${alert.target_price} created=${alert.created_at.split('T')[0]} price_at_creation=${alert.price_at_creation ?? 'N/A'} last_checked=${alert.last_checked_bar_time?.split('T')[0] ?? 'never'}`)
      // Check if alert triggered based on alert type
      if (alert.alert_type === 'price_hits') {
        let creationPrice = alert.price_at_creation

        // If no creation price, try to estimate from earliest data
        if (!creationPrice) {
          // Detect mode based on whether ticker is in VN stocks or crypto
          const isInCrypto = allCryptoTickersLastData[alert.ticker] !== undefined
          const mode = isInCrypto ? 'crypto' : 'vn'

          const createdDate = alert.created_at.split('T')[0]

          info('Alerts', `  ⚠️  No creation price, estimating backwards from ${createdDate} (mode=${mode})...`)
          try {
            const historicalData = await getTickers('AlertContext.estimateCreationPrice', {
              symbol: alert.ticker,
              interval: Interval.Daily,
              end_date: createdDate, // Use end_date to look backwards from creation
              limit: 10, // Get 10 bars backwards to handle weekends/holidays
              mode,
            })

            const bars = historicalData[alert.ticker]
            if (bars && bars.length > 0) {
              // Pick the most recent bar (closest to creation date)
              const nearestBar = bars[bars.length - 1]
              creationPrice = nearestBar.close
              // Update alert with estimated creation price
              const updates = { price_at_creation: creationPrice }
              updateAlertInStorage(alert.id, updates)
              hasUpdates = true
              info('Alerts', `  ✅ Estimated creation price: ${creationPrice} (from ${nearestBar.time.split('T')[0]})`)
              info('Alerts', `  💾 Saved to localStorage: ${JSON.stringify(updates)}`)
            } else {
              info('Alerts', `  ❌ No bars returned for ${alert.ticker}`)
            }
          } catch (error) {
            info('Alerts', `  ❌ Failed to estimate: ${error}`)
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

        // Determine the date range to check
        // Use the most recent between created_at and last_checked_bar_time, subtract 2 days buffer
        const createdDate = new Date(alert.created_at)
        const lastCheckedDate = alert.last_checked_bar_time
          ? new Date(alert.last_checked_bar_time)
          : createdDate

        const mostRecentDate = lastCheckedDate > createdDate ? lastCheckedDate : createdDate

        // Subtract 2 days as buffer to avoid incomplete bars
        const checkDate = new Date(mostRecentDate)
        checkDate.setDate(checkDate.getDate() - 2)

        // Ensure not earlier than created_at
        const startDate = (checkDate >= createdDate ? checkDate : createdDate).toISOString().split('T')[0]

        // Detect mode based on whether ticker is in VN stocks or crypto
        const isInCrypto = allCryptoTickersLastData[alert.ticker] !== undefined
        const mode = isInCrypto ? 'crypto' : 'vn'

        info('Alerts', `  📊 Fetching historical 1D bars from ${startDate} onwards (mode=${mode}, -2d buffer)...`)

        try {
          // Fetch historical 1D data from last check (or creation) to now
          // Don't use end_date - if today is weekend, start=end=weekend returns 0 bars
          const historicalData = await getTickers('AlertContext.checkHistoricalCross', {
            symbol: alert.ticker,
            interval: Interval.Daily,
            start_date: startDate,
            // No end_date - get all available bars from start_date
            mode,
          })

          const bars = historicalData[alert.ticker]
          if (bars && bars.length > 0) {
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
        } catch (error) {
          info('Alerts', `  ❌ Failed to check historical data: ${error}`)
        }
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
  }, [allMarketsData, allTickersLastData, allCryptoTickersLastData, getTickers, info, refreshAlerts])

  // Auto-check alerts when data refreshes OR on initial load
  React.useEffect(() => {
    // Run check if we have data (either from refresh or initial load)
    if (Object.keys(allMarketsData).length > 0) {
      checkAlerts()
    }
  }, [lastRefresh, allMarketsData, checkAlerts])

  const value: AlertContextValue = {
    alerts,
    activeAlerts,
    triggeredAlerts,
    addAlert,
    updateAlert,
    deleteAlert,
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
