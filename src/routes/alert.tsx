import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useAlert } from '@/contexts/AlertContext'
import { useAPI } from '@/contexts/APIContext'
import { useTranslation } from '@/hooks/useTranslation'
import { BasicAlertWidget } from '@/components/widgets/BasicAlertWidget'
import { BasicTickerWidget } from '@/components/widgets/BasicTickerWidget'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { ALERT_DISTANCE_THRESHOLDS } from '@/lib/constants'

export const Route = createFileRoute('/alert')({
  component: AlertPage,
})

function AlertPage() {
  const { t } = useTranslation()
  const { alerts, activeAlerts, triggeredAlerts } = useAlert()
  const { allTickersLastData } = useAPI()

  // State for selected ticker (from clicking alert row)
  const [selectedTicker, setSelectedTicker] = React.useState<string | null>('VNINDEX')

  // Calculate closest alert
  const closestAlert = React.useMemo(() => {
    const active = activeAlerts.map((alert) => {
      const tickerData = allTickersLastData[alert.ticker]
      const currentPrice = tickerData?.[tickerData.length - 1]?.close ?? null

      if (currentPrice === null) {
        return { ...alert, distance: null }
      }

      const absoluteDistance = alert.target_price - currentPrice
      const percentDistance = (absoluteDistance / currentPrice) * 100

      return {
        ...alert,
        distance: Math.abs(percentDistance),
      }
    })

    // Filter out alerts without price data and sort by distance
    const withDistance = active.filter((a) => a.distance !== null)
    if (withDistance.length === 0) return null

    return withDistance.sort((a, b) => a.distance! - b.distance!)[0]
  }, [activeAlerts, allTickersLastData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold">{t('common.alerts.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('common.alerts.description')}
        </p>
      </div>

      {/* Statistics Panel */}
      <div className="p-4 md:p-6 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Alerts */}
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground mb-1">
              {t('widgets.basicAlert.stats.total')}
            </div>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </div>

          {/* Active Alerts */}
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground mb-1">
              {t('widgets.basicAlert.stats.active')}
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {activeAlerts.length}
            </div>
          </div>

          {/* Triggered Alerts */}
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground mb-1">
              {t('widgets.basicAlert.stats.triggered')}
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {triggeredAlerts.length}
            </div>
          </div>

          {/* Closest Alert */}
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground mb-1">
              {t('widgets.basicAlert.stats.closest')}
            </div>
            <div className="text-2xl font-bold">
              {closestAlert ? (
                <div className="flex flex-col">
                  <span className="text-base font-mono">{closestAlert.ticker}</span>
                  <span
                    className={`text-sm ${
                      closestAlert.distance! < ALERT_DISTANCE_THRESHOLDS.RED
                        ? 'text-red-600 dark:text-red-500'
                        : closestAlert.distance! < ALERT_DISTANCE_THRESHOLDS.ORANGE
                        ? 'text-orange-600 dark:text-orange-500'
                        : closestAlert.distance! < ALERT_DISTANCE_THRESHOLDS.YELLOW
                        ? 'text-yellow-600 dark:text-yellow-500'
                        : 'text-green-600 dark:text-green-500'
                    }`}
                  >
                    {closestAlert.distance!.toFixed(2)}% away
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-base">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Widget */}
      <div className="p-4 md:p-6 border-t">
        <BasicAlertWidget
          maxHeight="calc(100vh - 500px)"
          onSelectAlert={(alert) => setSelectedTicker(alert.ticker)}
        />
      </div>

      {/* Ticker Details + Chart Section - shown when alert selected */}
      {selectedTicker && (
        <div className="p-4 md:p-6 border-t">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: BasicTickerWidget */}
            <div>
              <BasicTickerWidget
                ticker={selectedTicker}
                onTickerChange={setSelectedTicker}
              />
            </div>

            {/* Right: TradingViewChart */}
            <div>
              <TradingViewChart
                ticker={selectedTicker}
                onTickerChange={setSelectedTicker}
                showControls={true}
                height={400}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
