import * as React from 'react'
import { Edit, RotateCcw, Trash2, Search, Bell, CircleDot } from 'lucide-react'
import { useAlert } from '@/contexts/AlertContext'
import { useAPI } from '@/contexts/APIContext'
import { useTranslation } from '@/hooks/useTranslation'
import { formatPrice, formatPercent, formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { ALERT_DISTANCE_THRESHOLDS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditAlertDialog } from '@/components/dialogs/EditAlertDialog'
import type { Alert } from '@/lib/alert-storage'

export type AlertSortBy = 'distance' | 'created' | 'ticker' | 'targetPrice'
export type AlertFilter = 'all' | 'active' | 'triggered'

export interface BasicAlertWidgetProps {
  maxHeight?: string
  className?: string
  onSelectAlert?: (alert: Alert) => void
}

export function BasicAlertWidget({
  maxHeight = '600px',
  className = '',
  onSelectAlert,
}: BasicAlertWidgetProps) {
  const { t } = useTranslation()
  const { alerts, deleteAlert, resetAlert, refreshAlerts } = useAlert()
  const { allTickersLastData } = useAPI()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState<AlertSortBy>('distance')
  const [filterBy, setFilterBy] = React.useState<AlertFilter>('all')
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [resetConfirmId, setResetConfirmId] = React.useState<string | null>(null)

  // Calculate distance for each alert
  const alertsWithDistance = React.useMemo(() => {
    return alerts.map((alert) => {
      const tickerData = allTickersLastData[alert.ticker]
      const currentPrice = tickerData?.[tickerData.length - 1]?.close ?? null

      if (currentPrice === null) {
        return {
          ...alert,
          currentPrice: null,
          distance: null,
          absDistance: null,
          tickerData: null,
        }
      }

      const absoluteDistance = alert.target_price - currentPrice
      const percentDistance = (absoluteDistance / currentPrice) * 100

      return {
        ...alert,
        currentPrice,
        distance: percentDistance,
        absDistance: Math.abs(percentDistance),
        tickerData: tickerData[tickerData.length - 1],
      }
    })
  }, [alerts, allTickersLastData])

  // Filter alerts
  const filteredAlerts = React.useMemo(() => {
    let filtered = alertsWithDistance

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((a) =>
        a.ticker.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (filterBy === 'active') {
      filtered = filtered.filter((a) => !a.triggered)
    } else if (filterBy === 'triggered') {
      filtered = filtered.filter((a) => a.triggered)
    }

    return filtered
  }, [alertsWithDistance, searchQuery, filterBy])

  // Sort alerts
  const sortedAlerts = React.useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          // Sort by absolute distance (closest first)
          // Nulls at the end
          if (a.absDistance === null) return 1
          if (b.absDistance === null) return -1
          return a.absDistance - b.absDistance

        case 'created':
          // Sort by created date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

        case 'ticker':
          // Sort alphabetically
          return a.ticker.localeCompare(b.ticker)

        case 'targetPrice':
          // Sort by target price (highest first)
          return b.target_price - a.target_price

        default:
          return 0
      }
    })
  }, [filteredAlerts, sortBy])

  // Get distance color
  const getDistanceColor = (absPercent: number | null) => {
    if (absPercent === null) return 'text-muted-foreground'
    if (absPercent < ALERT_DISTANCE_THRESHOLDS.RED) return 'text-red-600 dark:text-red-500'
    if (absPercent < ALERT_DISTANCE_THRESHOLDS.ORANGE) return 'text-orange-600 dark:text-orange-500'
    if (absPercent < ALERT_DISTANCE_THRESHOLDS.YELLOW) return 'text-yellow-600 dark:text-yellow-500'
    return 'text-green-600 dark:text-green-500'
  }

  // Get status indicator
  const getStatusIndicator = (triggered: boolean) => {
    if (triggered) {
      return <Bell className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
    }
    return <CircleDot className="h-4 w-4 text-muted-foreground" />
  }

  const handleDelete = (id: string) => {
    deleteAlert(id)
    setDeleteConfirmId(null)
  }

  const handleReset = (id: string) => {
    resetAlert(id)
    setResetConfirmId(null)
  }

  const handleAlertUpdated = () => {
    refreshAlerts()
  }

  const handleAlertDeleted = () => {
    refreshAlerts()
  }

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Search and Filter Controls */}
      <div className="space-y-3 mb-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('widgets.basicAlert.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filterBy === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('all')}
            className="flex-1"
          >
            {t('widgets.basicAlert.filters.all')}
          </Button>
          <Button
            variant={filterBy === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('active')}
            className="flex-1"
          >
            {t('widgets.basicAlert.filters.active')}
          </Button>
          <Button
            variant={filterBy === 'triggered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('triggered')}
            className="flex-1"
          >
            {t('widgets.basicAlert.filters.triggered')}
          </Button>
        </div>

        {/* Sort Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={sortBy === 'distance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('distance')}
          >
            {t('widgets.basicAlert.sortBy.distance')}
          </Button>
          <Button
            variant={sortBy === 'created' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('created')}
          >
            {t('widgets.basicAlert.sortBy.created')}
          </Button>
          <Button
            variant={sortBy === 'ticker' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('ticker')}
          >
            {t('widgets.basicAlert.sortBy.ticker')}
          </Button>
          <Button
            variant={sortBy === 'targetPrice' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('targetPrice')}
          >
            {t('widgets.basicAlert.sortBy.targetPrice')}
          </Button>
        </div>
      </div>

      {/* Alert Table */}
      <div className="overflow-auto flex-1 min-h-0" style={{ maxHeight }}>
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">{t('common.alerts.noAlerts')}</p>
            <p className="text-xs mt-1">{t('common.alerts.noAlertsDescription')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onSelectAlert?.(alert)}
              >
                {/* Header Row: Status, Ticker, Actions */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIndicator(alert.triggered)}
                    <span className="font-mono font-bold text-base">{alert.ticker}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <EditAlertDialog
                      alert={alert}
                      onAlertUpdated={handleAlertUpdated}
                      onAlertDeleted={handleAlertDeleted}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </EditAlertDialog>
                    {deleteConfirmId === alert.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDelete(alert.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(alert.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Price Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <span className="text-sm text-muted-foreground">{t('widgets.basicAlert.columns.current')}: </span>
                    <span className="text-sm font-semibold">
                      {alert.currentPrice !== null && alert.tickerData
                        ? formatPrice(alert.currentPrice, alert.tickerData)
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">{t('widgets.basicAlert.columns.target')}: </span>
                    <span className="text-sm font-semibold">
                      {alert.tickerData
                        ? formatPrice(alert.target_price, alert.tickerData)
                        : alert.target_price}
                    </span>
                  </div>
                </div>

                {/* Distance Display */}
                {alert.distance !== null && alert.tickerData && (
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">{t('widgets.basicAlert.columns.distance')}: </span>
                    <span className={`text-sm font-bold ${getDistanceColor(alert.absDistance)}`}>
                      {formatPercent(alert.distance)} ({alert.distance >= 0 ? '+' : ''}{formatPrice(alert.target_price - alert.currentPrice!, alert.tickerData)})
                    </span>
                  </div>
                )}

                {/* Note Display */}
                {alert.note && alert.note.trim() && (
                  <div className="mb-2">
                    <div className="text-xs text-muted-foreground italic line-clamp-2">
                      {alert.note}
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{getRelativeTime(alert.created_at)}</span>
                  <span>{t(`widgets.basicAlert.alertTypes.${alert.alert_type}`)}</span>
                  {alert.triggered && (
                    <span className="text-green-600 dark:text-green-500 font-medium">
                      {t('widgets.basicAlert.status.triggered')}
                    </span>
                  )}
                </div>

                {/* Reset Button - only for triggered alerts */}
                {alert.triggered && (
                  resetConfirmId === alert.id ? (
                    <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 px-2 text-xs"
                        onClick={() => setResetConfirmId(null)}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 h-7 px-2 text-xs"
                        onClick={() => handleReset(alert.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {t('common.alerts.resetAlert')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        setResetConfirmId(alert.id)
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t('common.alerts.resetAlert')}
                    </Button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
