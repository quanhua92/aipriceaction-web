import * as React from 'react'
import { Trash2, Bell } from 'lucide-react'
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
import { useAlert } from '@/contexts/AlertContext'
import { useAPI } from '@/contexts/APIContext'
import { useTranslation } from '@/hooks/useTranslation'
import { formatPrice, formatPercent, formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { ALERT_TYPES } from '@/lib/constants'
import type { Alert } from '@/lib/alert-storage'

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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('dialogs.editAlert.title')}: {alert.ticker}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
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
              <div className="px-3 py-2 rounded-md border bg-muted/30">
                {alert.triggered ? (
                  <span className="text-xs font-medium text-green-600 dark:text-green-500">
                    ✓ {t('widgets.basicAlert.status.triggered')}
                    {alert.triggered_at && (
                      <span className="text-xs text-muted-foreground block mt-1">
                        ({formatToVietnamDate(parseUTCISOString(alert.triggered_at))})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-xs font-medium">
                    🔔 {t('widgets.basicAlert.status.active')}
                  </span>
                )}
              </div>
            </div>
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
              Note (optional)
            </label>
            <Textarea
              id="edit-note"
              value={note}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setNote(e.target.value)
                }
              }}
              placeholder="Add a note for this alert..."
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
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-col gap-2 border-t pt-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t('dialogs.quickAddAlert.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t('dialogs.quickAddAlert.save')}
            </Button>
          </div>

          {/* Delete Alert Section */}
          <div className="w-full border-t pt-2">
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t('common.alerts.deleteAlert')}
              </Button>
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

          {/* Existing Alerts Section */}
          {existingAlerts.length > 0 && (
            <div className="w-full border-t pt-2 mt-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Existing Alerts ({existingAlerts.length})
              </div>
              <div className="max-h-[120px] overflow-y-auto space-y-1">
                {existingAlerts.map((existingAlert) => {
                  const alertCurrentPrice = allTickersLastData[alert.ticker]?.[allTickersLastData[alert.ticker].length - 1]?.close
                  const alertDistance = alertCurrentPrice
                    ? ((existingAlert.target_price - alertCurrentPrice) / alertCurrentPrice) * 100
                    : null

                  return (
                    <div
                      key={existingAlert.id}
                      className="p-2 rounded-md border bg-muted/30 text-xs flex items-center justify-between"
                    >
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
                      <div className="text-muted-foreground">
                        {existingAlert.triggered ? 'Triggered' : 'Active'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
