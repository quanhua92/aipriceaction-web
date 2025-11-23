import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { Download, Upload } from 'lucide-react'
import { useAlert } from '@/contexts/AlertContext'
import { useAPI } from '@/contexts/APIContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { BasicAlertWidget } from '@/components/widgets/BasicAlertWidget'
import { BasicTickerWidget } from '@/components/widgets/BasicTickerWidget'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { Button } from '@/components/ui/button'
import { ALERT_DISTANCE_THRESHOLDS, ALERTS_STORAGE_KEY } from '@/lib/constants'
import { getAlerts, type Alert } from '@/lib/alert-storage'

export const Route = createFileRoute('/alert')({
  component: AlertPage,
})

function AlertPage() {
  const { t } = useTranslation()
  const { alerts, activeAlerts, triggeredAlerts, refreshAlerts } = useAlert()
  const { allTickersLastData } = useAPI()
  const { info, error: logError } = useLogs()

  // State for selected ticker (from clicking alert row)
  const [selectedTicker, setSelectedTicker] = React.useState<string>('VNINDEX')

  // Responsive chart height: 600px desktop (lg+), 400px mobile
  const [chartHeight, setChartHeight] = React.useState<number>(
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 600 : 400
  )

  // File input ref for import
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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

  // Update chart height on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setChartHeight(window.innerWidth >= 1024 ? 600 : 400)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Export alerts to JSON file
  const handleExport = () => {
    try {
      const allAlerts = getAlerts()
      const dataStr = JSON.stringify(allAlerts, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
      link.download = `alerts-${timestamp}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      info('Alerts', `Exported ${allAlerts.length} alerts`)
    } catch (err) {
      console.error('Export failed:', err)
      logError('Alerts', 'Failed to export alerts')
    }
  }

  // Import alerts from JSON file
  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedAlerts = JSON.parse(text) as Alert[]

      // Validate structure
      if (!Array.isArray(importedAlerts)) {
        throw new Error('Invalid file format: expected array of alerts')
      }

      // Get existing alerts
      const existingAlerts = getAlerts()
      const importedIds = new Set(importedAlerts.map(a => a.id))
      const existingIds = new Set(existingAlerts.map(a => a.id))

      // Track new vs overwritten counts
      const overwrittenCount = importedAlerts.filter(alert => existingIds.has(alert.id)).length
      const newCount = importedAlerts.length - overwrittenCount

      // Filter out existing alerts that will be overwritten
      const nonDuplicateExisting = existingAlerts.filter(alert => !importedIds.has(alert.id))

      // Merge with all imported alerts (includes both new and overwrites)
      const merged = [...nonDuplicateExisting, ...importedAlerts]
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(merged))

      // Refresh UI
      refreshAlerts()

      info('Alerts', `Imported ${importedAlerts.length} alerts (${newCount} new, ${overwrittenCount} overwritten)`)
    } catch (err) {
      console.error('Import failed:', err)
      logError('Alerts', `Failed to import alerts: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{t('common.alerts.title')}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('common.alerts.description')}
        </p>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Main Content Grid - 3 columns on desktop, 1 column on mobile */}
      <div className="p-4 md:p-6 border-t">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Statistics + Alert Widget */}
          <div className="lg:col-span-1 space-y-6">
            {/* Statistics Panel */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Alert Widget */}
            <BasicAlertWidget
              maxHeight="calc(100vh - 500px)"
              onSelectAlert={(alert) => setSelectedTicker(alert.ticker)}
            />
          </div>

          {/* Right Columns: Ticker Details */}
          <div className="lg:col-span-2 space-y-6">
            <BasicTickerWidget
              ticker={selectedTicker}
              onTickerChange={setSelectedTicker}
            />
            <TradingViewChart
              ticker={selectedTicker}
              onTickerChange={setSelectedTicker}
              showControls={true}
              height={chartHeight}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
