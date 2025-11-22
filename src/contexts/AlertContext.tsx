import * as React from 'react'
import { useAPI } from './APIContext'
import { useRefresh } from './RefreshContext'
import { useLogs } from './LogsContext'
import {
  getAlerts,
  addAlert as addAlertToStorage,
  updateAlert as updateAlertInStorage,
  deleteAlert as deleteAlertFromStorage,
  getAlertsByTicker,
  getActiveAlerts as getActiveAlertsFromStorage,
  getTriggeredAlerts as getTriggeredAlertsFromStorage,
  type Alert,
} from '@/lib/alert-storage'
import { ALERT_TRIGGER_THRESHOLD } from '@/lib/constants'

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
  const { allTickersLastData } = useAPI()
  const { lastRefresh } = useRefresh()
  const { info } = useLogs()

  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null)

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
      const newAlert = addAlertToStorage(alert)
      setAlerts((prev) => [...prev, newAlert])
      info('Alerts', `Added alert for ${alert.ticker} at ${alert.target_price}`)
      return newAlert
    },
    [info]
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
  const checkAlerts = React.useCallback(() => {
    const activeAlertsList = getActiveAlertsFromStorage()
    const newlyTriggered: Alert[] = []

    activeAlertsList.forEach((alert) => {
      const tickerData = allTickersLastData[alert.ticker]
      if (!tickerData || tickerData.length === 0) return

      const currentPrice = tickerData[tickerData.length - 1].close

      // Check if alert triggered based on alert type
      if (alert.alert_type === 'price_hits') {
        // Calculate distance as percentage
        const distance = Math.abs(
          ((currentPrice - alert.target_price) / alert.target_price) * 100
        )

        // Trigger if within threshold
        if (distance <= ALERT_TRIGGER_THRESHOLD) {
          const triggeredAt = new Date().toISOString()
          updateAlertInStorage(alert.id, {
            triggered: true,
            triggered_at: triggeredAt,
          })

          newlyTriggered.push({
            ...alert,
            triggered: true,
            triggered_at: triggeredAt,
          })

          info(
            'Alerts',
            `🔔 Alert triggered: ${alert.ticker} reached ${currentPrice} (target: ${alert.target_price})`
          )
        }
      }
    })

    // Refresh alerts state if any were triggered
    if (newlyTriggered.length > 0) {
      refreshAlerts()
    }

    setLastChecked(new Date())
  }, [allTickersLastData, info, refreshAlerts])

  // Auto-check alerts when data refreshes
  React.useEffect(() => {
    if (lastRefresh && Object.keys(allTickersLastData).length > 0) {
      checkAlerts()
    }
  }, [lastRefresh, allTickersLastData, checkAlerts])

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
