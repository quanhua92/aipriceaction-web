import * as React from 'react'
import { Trash2, Bell, RotateCcw } from 'lucide-react'
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
import { useTranslation } from '@/hooks/useTranslation'
import { formatPrice, formatPercent, formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { ALERT_TYPES } from '@/lib/constants'
import type { Alert } from '@/lib/alert-storage'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

export interface EditAlertDialogProps {
  children: React.ReactNode
  alert: Alert
  onAlertUpdated?: () => void
  onAlertDeleted?: () => void
}

export function EditAlertDialog({
  children,
  alert,
  onAlertUpdated,
  onAlertDeleted,
}: EditAlertDialogProps) {
  const { t } = useTranslation()
  const { updateAlert, deleteAlert, getAlertsByTickerSymbol } = useAlert()
  const { allTickersLastData } = useAPI()

  const [open, setOpen] = React.useState(false)
  const [targetPrice, setTargetPrice] = React.useState(String(alert.target_price))
  const [alertType, setAlertType] = React.useState<Alert['alert_type']>(alert.alert_type)
  const [note, setNote] = React.useState(alert.note || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [error, setError] = React.useState('')

  // Get current price for reference
  const currentPrice = React.useMemo(() => {
    const tickerData = allTickersLastData[alert.ticker]
    if (!tickerData || tickerData.length === 0) return null
    return tickerData[tickerData.length - 1].close
  }, [allTickersLastData, alert.ticker])

  // Get ticker data for formatting
  const tickerData = React.useMemo(() => {
    const data = allTickersLastData[alert.ticker]
    if (!data || data.length === 0) return null
    return data[data.length - 1]
  }, [allTickersLastData, alert.ticker])

  // Get existing alerts for this ticker
  const existingAlerts = React.useMemo(() => {
    return getAlertsByTickerSymbol(alert.ticker)
  }, [alert.ticker, getAlertsByTickerSymbol])

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

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setTargetPrice(String(alert.target_price))
      setAlertType(alert.alert_type)
      setNote(alert.note || '')
      setShowDeleteConfirm(false)
      setError('')
    }
  }, [open, alert])

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
      updateAlert(alert.id, {
        target_price: target,
        alert_type: alertType,
        note: note.trim() || undefined,
      })

      setOpen(false)
      if (onAlertUpdated) {
        onAlertUpdated()
      }
    } catch (err) {
      console.error('Failed to update alert:', err)
      setError('Failed to update alert')
    }
  }

  const handleDelete = () => {
    try {
      deleteAlert(alert.id)
      setOpen(false)
      if (onAlertDeleted) {
        onAlertDeleted()
      }
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  const handleReset = () => {
    if (!currentPrice) return

    try {
      updateAlert(alert.id, {
        triggered: false,
        triggered_at: undefined,
        created_at: new Date().toISOString(),
        price_at_creation: currentPrice,
        last_checked_bar_time: undefined,
      })

      setOpen(false)
      if (onAlertUpdated) {
        onAlertUpdated()
      }
    } catch (err) {
      console.error('Failed to reset alert:', err)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[90vw] h-[90vh] h-[90dvh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('dialogs.editAlert.title')}: {alert.ticker}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col gap-0 pt-6">
          <TabsList className="mx-6 mb-4 grid grid-cols-3">
            <TabsTrigger value="details">{t('dialogs.quickAddAlert.tabs.details')}</TabsTrigger>
            <TabsTrigger value="chart">{t('dialogs.quickAddAlert.tabs.chart')}</TabsTrigger>
            <TabsTrigger value="existing">
              {t('dialogs.quickAddAlert.tabs.existing')} ({existingAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 pb-4">
            {/* Ticker Display - Centered at Top */}
            <div className="text-center mb-2">
              <div className="font-mono font-bold text-2xl">{alert.ticker}</div>
            </div>

            {/* Created Date & Status - 2 Column Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Created Date (Read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('dialogs.editAlert.created')}
                </label>
                <div className="px-3 py-2 rounded-md border bg-muted/30 text-xs">
                  {formatToVietnamDate(parseUTCISOString(alert.created_at))}
                </div>
              </div>

              {/* Status (Read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('dialogs.editAlert.status')}
                </label>
                <div className="px-3 py-2 rounded-md border bg-muted/30 text-xs">
                  {alert.triggered ? (
                    <span className="font-medium text-green-600 dark:text-green-500">
                      ✓ {t('widgets.basicAlert.status.triggered')}
                    </span>
                  ) : (
                    <span className="font-medium">
                      🔔 {t('widgets.basicAlert.status.active')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Triggered Info */}
            {alert.triggered && alert.triggered_at && (
              <div className="p-3 rounded-md border border-green-500/30 bg-green-500/10 space-y-1">
                <div className="text-xs text-green-700 dark:text-green-400">
                  ✓ {t('dialogs.editAlert.triggeredAt')}: {formatToVietnamDate(parseUTCISOString(alert.triggered_at))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('dialogs.editAlert.triggeredReason')} {tickerData ? formatPrice(alert.target_price, tickerData) : alert.target_price}
                </div>
              </div>
            )}

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
                <label htmlFor="edit-target-price" className="text-sm font-medium">
                  {t('dialogs.quickAddAlert.targetPrice')} *
                </label>
                <Input
                  id="edit-target-price"
                  type="number"
                  value={targetPrice}
                  onChange={(e) => {
                    setTargetPrice(e.target.value)
                    setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 25000"
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
              <label htmlFor="edit-alert-type" className="text-sm font-medium">
                {t('dialogs.quickAddAlert.alertType')}
              </label>
              <Select value={alertType} onValueChange={(value) => setAlertType(value as Alert['alert_type'])}>
                <SelectTrigger id="edit-alert-type">
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
              <label htmlFor="edit-note" className="text-sm font-medium text-muted-foreground">
                {t('dialogs.quickAddAlert.note.label')}
              </label>
              <Textarea
                id="edit-note"
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
                {existingAlerts.map((existingAlert) => {
                  const alertCurrentPrice = allTickersLastData[alert.ticker]?.[allTickersLastData[alert.ticker].length - 1]?.close
                  const alertDistance = alertCurrentPrice
                    ? ((existingAlert.target_price - alertCurrentPrice) / alertCurrentPrice) * 100
                    : null

                  return (
                    <div
                      key={existingAlert.id}
                      className="p-3 rounded-md border bg-muted/30 text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {existingAlert.triggered ? (
                            <span className="text-green-600 dark:text-green-500">✓</span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-500">🔔</span>
                          )}
                          <span className="font-semibold">
                            {tickerData ? formatPrice(existingAlert.target_price, tickerData) : existingAlert.target_price}
                          </span>
                          {alertDistance !== null && !existingAlert.triggered && (
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
                        <div className="text-xs text-muted-foreground">
                          {existingAlert.triggered ? t('dialogs.quickAddAlert.existingAlerts.triggered') : t('dialogs.quickAddAlert.existingAlerts.active')}
                        </div>
                      </div>
                      {existingAlert.note && existingAlert.note.trim() && (
                        <div className="text-xs text-muted-foreground italic">
                          {existingAlert.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chart" className="flex-1 min-h-0 overflow-hidden px-6 pb-4">
            <TradingViewChart
              title={alert.ticker}
              initialTicker={alert.ticker}
              height={400}
              showControls={false}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-col gap-2 border-t pt-4 px-6 pb-6">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t('dialogs.quickAddAlert.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t('dialogs.quickAddAlert.save')}
            </Button>
          </div>

          {/* Reset & Delete Alert Section */}
          <div className="w-full border-t pt-4">
            {!showDeleteConfirm ? (
              <div className="flex gap-2">
                {/* Reset Alert - only show for triggered alerts */}
                {alert.triggered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    disabled={!currentPrice}
                    className="flex-1 text-blue-600 hover:text-blue-600 hover:bg-blue-600/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    {t('common.alerts.resetAlert')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`${alert.triggered ? 'flex-1' : 'w-full'} text-destructive hover:text-destructive hover:bg-destructive/10`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {t('common.alerts.deleteAlert')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  {t('dialogs.editAlert.deleteConfirm')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    {t('dialogs.quickAddAlert.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
