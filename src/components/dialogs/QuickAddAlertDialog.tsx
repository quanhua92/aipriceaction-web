import * as React from 'react'
import { Bell } from 'lucide-react'
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
import { formatPrice, formatPercent } from '@/lib/format'
import { ALERT_TYPES } from '@/lib/constants'
import type { Alert } from '@/lib/alert-storage'

export interface QuickAddAlertDialogProps {
  children: React.ReactNode
  ticker: string
}

export function QuickAddAlertDialog({
  children,
  ticker,
}: QuickAddAlertDialogProps) {
  const { t } = useTranslation()
  const { addAlert, getAlertsByTickerSymbol } = useAlert()
  const { allTickersLastData } = useAPI()

  const [open, setOpen] = React.useState(false)
  const [targetPrice, setTargetPrice] = React.useState('')
  const [alertType, setAlertType] = React.useState<Alert['alert_type']>(ALERT_TYPES.PRICE_HITS)
  const [error, setError] = React.useState('')

  // Get current price for reference
  const currentPrice = React.useMemo(() => {
    const tickerData = allTickersLastData[ticker]
    if (!tickerData || tickerData.length === 0) return null
    return tickerData[tickerData.length - 1].close
  }, [allTickersLastData, ticker])

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
      })

      // Reset and close
      setTargetPrice('')
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
    setError('')
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state when dialog closes
      setTargetPrice('')
      setError('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('dialogs.quickAddAlert.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Distance Display */}
          {distance && tickerData && (
            <div className="p-3 rounded-md border bg-muted/30 space-y-1">
              <div className="text-sm font-medium text-muted-foreground">
                {t('dialogs.quickAddAlert.distance')}
              </div>
              <div className={`text-sm font-bold ${getDistanceColor(distance.percent)}`}>
                {distance.percent >= 0 ? '+' : ''}{formatPercent(distance.percent)} ({distance.absolute >= 0 ? '+' : ''}{formatPrice(Math.abs(distance.absolute), tickerData)})
              </div>
              <div className="text-xs text-muted-foreground">
                ⚠️ {t('dialogs.quickAddAlert.triggerMessage')} {formatPrice(Number(targetPrice), tickerData)}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {/* Action Buttons */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t('dialogs.quickAddAlert.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t('dialogs.quickAddAlert.save')}
            </Button>
          </div>

          {/* Existing Alerts Section */}
          {existingAlerts.length > 0 && (
            <div className="w-full border-t pt-2 mt-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Existing Alerts ({existingAlerts.length})
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-1">
                {existingAlerts.map((alert) => {
                  const alertCurrentPrice = allTickersLastData[ticker]?.[allTickersLastData[ticker].length - 1]?.close
                  const alertDistance = alertCurrentPrice
                    ? ((alert.target_price - alertCurrentPrice) / alertCurrentPrice) * 100
                    : null

                  return (
                    <div
                      key={alert.id}
                      className="p-2 rounded-md border bg-muted/30 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {alert.triggered ? (
                          <span className="text-green-600 dark:text-green-500">✓</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-500">🔔</span>
                        )}
                        <span className="font-semibold">
                          {tickerData ? formatPrice(alert.target_price, tickerData) : alert.target_price}
                        </span>
                        {alertDistance !== null && !alert.triggered && (
                          <span className={`${
                            Math.abs(alertDistance) < 2 ? 'text-red-600 dark:text-red-500' :
                            Math.abs(alertDistance) < 5 ? 'text-orange-600 dark:text-orange-500' :
                            Math.abs(alertDistance) < 10 ? 'text-yellow-600 dark:text-yellow-500' :
                            'text-green-600 dark:text-green-500'
                          }`}>
                            {alertDistance >= 0 ? '+' : ''}{formatPercent(alertDistance)}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {alert.triggered ? 'Triggered' : 'Active'}
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
