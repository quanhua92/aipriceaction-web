import * as React from 'react'
import { Bell, Download, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAlert } from '@/contexts/AlertContext'
import { useAPI } from '@/contexts/APIContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { formatPrice, formatPercent } from '@/lib/format'
import { ALERT_TYPES, ALERTS_STORAGE_KEY } from '@/lib/constants'
import { getAlerts, type Alert } from '@/lib/alert-storage'
import { SafeLocalStorage } from '@/lib/localStorage'

export interface QuickAddAlertDialogProps {
  children: React.ReactNode
  ticker: string
  currentPrice?: number
}

export function QuickAddAlertDialog({
  children,
  ticker,
  currentPrice: currentPriceProp,
}: QuickAddAlertDialogProps) {
  const { t } = useTranslation()
  const { addAlert, deleteAlert, getAlertsByTickerSymbol, refreshAlerts } = useAlert()
  const { allTickersLastData } = useAPI()
  const { info, error: logError } = useLogs()

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [open, setOpen] = React.useState(false)
  const [targetPrice, setTargetPrice] = React.useState('')
  const [alertType, setAlertType] = React.useState<Alert['alert_type']>(ALERT_TYPES.PRICE_HITS)
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState('')
  const [settingsStatus, setSettingsStatus] = React.useState<{ message: string; isError: boolean } | null>(null)
  const settingsStatusTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const showSettingsStatus = (message: string, isError: boolean) => {
    if (settingsStatusTimer.current) clearTimeout(settingsStatusTimer.current)
    setSettingsStatus({ message, isError })
    settingsStatusTimer.current = setTimeout(() => setSettingsStatus(null), 4000)
  }

  // Use prop-provided price (from chart's last candle) or fall back to API data
  const apiPrice = React.useMemo(() => {
    const tickerData = allTickersLastData[ticker]
    if (!tickerData || tickerData.length === 0) return null
    return tickerData[tickerData.length - 1].close
  }, [allTickersLastData, ticker])
  const currentPrice = currentPriceProp ?? apiPrice

  // Get ticker data for formatting
  const tickerData = React.useMemo(() => {
    const data = allTickersLastData[ticker]
    if (!data || data.length === 0) return null
    return data[data.length - 1]
  }, [allTickersLastData, ticker])

  // Get existing alerts for this ticker
  const existingAlerts = React.useMemo(() => {
    return getAlertsByTickerSymbol(ticker)
  }, [ticker, getAlertsByTickerSymbol])

  // Calculate distance
  const distance = React.useMemo(() => {
    if (!currentPrice || !targetPrice) return null
    const target = Number(targetPrice)
    if (isNaN(target) || target <= 0) return null

    const absoluteDistance = target - currentPrice
    const percentDistance = (absoluteDistance / currentPrice) * 100

    return {
      absolute: absoluteDistance,
      percent: percentDistance,
    }
  }, [currentPrice, targetPrice])

  // Get distance color
  const getDistanceColor = (percent: number | null) => {
    if (percent === null) return 'text-muted-foreground'
    const absPercent = Math.abs(percent)
    if (absPercent < 2) return 'text-red-600 dark:text-red-500'
    if (absPercent < 5) return 'text-orange-600 dark:text-orange-500'
    if (absPercent < 10) return 'text-yellow-600 dark:text-yellow-500'
    return 'text-green-600 dark:text-green-500'
  }

  const handleSave = () => {
    // Validate
    const target = Number(targetPrice)
    if (!targetPrice || isNaN(target)) {
      setError(t('dialogs.quickAddAlert.validation.required'))
      return
    }

    if (target <= 0) {
      setError(t('dialogs.quickAddAlert.validation.positive'))
      return
    }

    try {
      addAlert({
        ticker,
        target_price: target,
        alert_type: alertType,
        note: note.trim() || undefined,
      })

      // Reset and close
      setTargetPrice('')
      setNote('')
      setError('')
      setOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to create alert: ${errorMessage}`)
      console.error('Failed to create alert:', err)
    }
  }

  const handleCancel = () => {
    setTargetPrice('')
    setNote('')
    setError('')
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state when dialog closes
      setTargetPrice('')
      setNote('')
      setError('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

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
      showSettingsStatus(`Exported ${allAlerts.length} alerts`, false)
    } catch (err) {
      console.error('Export failed:', err)
      logError('Alerts', 'Failed to export alerts')
      showSettingsStatus('Export failed', true)
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
      const importedAlerts = JSON.parse(text) as unknown[]

      // Validate structure
      if (!Array.isArray(importedAlerts)) {
        throw new Error('Invalid file format: expected array of alerts')
      }

      // Validate each item has required fields
      const validAlerts = importedAlerts.filter(
        (a): a is Alert =>
          typeof a === 'object' && a !== null &&
          typeof (a as Record<string, unknown>).id === 'string' &&
          typeof (a as Record<string, unknown>).ticker === 'string' &&
          typeof (a as Record<string, unknown>).target_price === 'number' &&
          typeof (a as Record<string, unknown>).alert_type === 'string',
      )
      const invalidCount = importedAlerts.length - validAlerts.length
      if (invalidCount === importedAlerts.length) {
        throw new Error('No valid alerts found in file')
      }

      // Get existing alerts
      const existingAlertsList = getAlerts()
      const importedIds = new Set(validAlerts.map(a => a.id))
      const existingIds = new Set(existingAlertsList.map(a => a.id))

      // Track new vs overwritten counts
      const overwrittenCount = validAlerts.filter(alert => existingIds.has(alert.id)).length
      const newCount = validAlerts.length - overwrittenCount

      // Filter out existing alerts that will be overwritten
      const nonDuplicateExisting = existingAlertsList.filter(alert => !importedIds.has(alert.id))

      // Merge with all imported alerts (includes both new and overwrites)
      const merged = [...nonDuplicateExisting, ...validAlerts]
      SafeLocalStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(merged))

      // Refresh UI
      refreshAlerts()

      info('Alerts', `Imported ${validAlerts.length} alerts (${newCount} new, ${overwrittenCount} overwritten${invalidCount > 0 ? `, ${invalidCount} invalid` : ''})`)
      showSettingsStatus(`Imported ${validAlerts.length} alerts (${newCount} new, ${overwrittenCount} overwritten)`, false)
    } catch (err) {
      console.error('Import failed:', err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      logError('Alerts', `Failed to import alerts: ${msg}`)
      showSettingsStatus(`Import failed: ${msg}`, true)
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[90vw] h-[90vh] h-[90dvh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('dialogs.quickAddAlert.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col gap-0">
          <TabsList className="mx-6 mb-4 grid grid-cols-3">
            <TabsTrigger value="details">{t('dialogs.quickAddAlert.tabs.details')}</TabsTrigger>
            <TabsTrigger value="existing">
              {t('dialogs.quickAddAlert.tabs.existing')} ({existingAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="settings">{t('dialogs.quickAddAlert.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 pb-4">
            {/* Ticker Display - Centered at Top */}
            <div className="text-center mb-2">
              <div className="font-mono font-bold text-2xl">{ticker}</div>
            </div>

            {/* Price Fields - 2 Column Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Current Price - Left Column */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('dialogs.quickAddAlert.currentPrice')}
                </label>
                <div className="px-3 py-2 rounded-md border bg-muted/30 h-10 flex items-center">
                  <span className="font-bold tabular-nums text-sm">
                    {currentPrice !== null && tickerData ? formatPrice(currentPrice, tickerData) : '-'}
                  </span>
                </div>
              </div>

              {/* Target Price - Right Column */}
              <div className="space-y-2">
                <label htmlFor="target-price" className="text-sm font-medium">
                  {t('dialogs.quickAddAlert.targetPrice')} *
                </label>
                <Input
                  id="target-price"
                  type="number"
                  value={targetPrice}
                  onChange={(e) => {
                    setTargetPrice(e.target.value)
                    setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 25000"
                  autoFocus
                  step="any"
                  className="h-10"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Alert Type Selector */}
            <div className="space-y-2">
              <label htmlFor="alert-type" className="text-sm font-medium">
                {t('dialogs.quickAddAlert.alertType')}
              </label>
              <Select value={alertType} onValueChange={(value) => setAlertType(value as Alert['alert_type'])}>
                <SelectTrigger id="alert-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALERT_TYPES.PRICE_HITS}>
                    {t('widgets.basicAlert.alertTypes.price_hits')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note Input */}
            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium text-muted-foreground">
                {t('dialogs.quickAddAlert.note.label')}
              </label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setNote(e.target.value)
                  }
                }}
                placeholder={t('dialogs.quickAddAlert.note.placeholder')}
                rows={3}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {note.length}/500
              </div>
            </div>

            {/* Distance Display */}
            {distance && tickerData && (
              <div className="p-3 rounded-md border bg-muted/30 space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('dialogs.quickAddAlert.distance')}
                </div>
                <div className={`text-sm font-bold ${getDistanceColor(distance.percent)}`}>
                  {formatPercent(distance.percent)} ({distance.absolute >= 0 ? '+' : ''}{formatPrice(distance.absolute, tickerData)})
                </div>
                <div className="text-xs text-muted-foreground">
                  ⚠️ {t('dialogs.quickAddAlert.triggerMessage')} {formatPrice(Number(targetPrice), tickerData)}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="existing" className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            {existingAlerts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {t('dialogs.quickAddAlert.existingAlerts.empty')}
              </div>
            ) : (
              <div className="space-y-2">
                {existingAlerts.map((alert) => {
                  const alertCurrentPrice = allTickersLastData[ticker]?.[allTickersLastData[ticker].length - 1]?.close
                  const alertDistance = alertCurrentPrice
                    ? ((alert.target_price - alertCurrentPrice) / alertCurrentPrice) * 100
                    : null

                  return (
                    <div
                      key={alert.id}
                      className="p-3 rounded-md border bg-muted/30 text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {alert.triggered ? (
                            <span className="text-green-600 dark:text-green-500">✓</span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-500">🔔</span>
                          )}
                          <span className="font-semibold">
                            {formatPrice(alert.target_price, tickerData || { mode: 'vn' })}
                          </span>
                          {alertDistance !== null && !alert.triggered && (
                            <span className={`${
                              Math.abs(alertDistance) < 2 ? 'text-red-600 dark:text-red-500' :
                              Math.abs(alertDistance) < 5 ? 'text-orange-600 dark:text-orange-500' :
                              Math.abs(alertDistance) < 10 ? 'text-yellow-600 dark:text-yellow-500' :
                              'text-green-600 dark:text-green-500'
                            }`}>
                              {formatPercent(alertDistance)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">
                            {alert.triggered ? t('dialogs.quickAddAlert.existingAlerts.triggered') : t('dialogs.quickAddAlert.existingAlerts.active')}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteAlert(alert.id)}
                            title={t('dialogs.quickAddAlert.existingAlerts.delete')}
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                      {alert.note && alert.note.trim() && (
                        <div className="text-xs text-muted-foreground italic">
                          {alert.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 pb-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full flex items-center gap-2 justify-center"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                {t('dialogs.quickAddAlert.export')}
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center gap-2 justify-center"
                onClick={handleImport}
              >
                <Upload className="h-4 w-4" />
                {t('dialogs.quickAddAlert.import')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dialogs.quickAddAlert.settingsDescription')}
            </p>
            {settingsStatus && (
              <p className={`text-xs ${settingsStatus.isError ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
                {settingsStatus.message}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 border-t pt-4 px-6 pb-6">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t('dialogs.quickAddAlert.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t('dialogs.quickAddAlert.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
