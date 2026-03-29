import { useState } from 'react'
import { useHealthStatus } from '@/hooks/useHealthStatus'
import { useTranslation } from '@/hooks/useTranslation'
import { useRefresh } from '@/contexts/RefreshContext'
import { parseUTCISOString, formatToVietnamTime } from '@/lib/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, RotateCcw } from 'lucide-react'

/**
 * Format milliseconds to human-readable time ago
 * @param ms - Milliseconds since last sync
 * @returns Formatted string like "2d", "3h", "15m", "30s"
 */
function formatTimeAgo(ms: number | null): string {
  if (ms === null) return 'N/A'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}


/**
 * Status bar component showing API health and data freshness
 * Displays at bottom of page, polls health endpoint every 30s when refresh enabled
 */
export function StatusBar() {
  const { t } = useTranslation()
  const { triggerRefresh } = useRefresh()
  const { health, isLoading, error, dataAge, colorStatus } = useHealthStatus()
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleRefresh = () => {
    triggerRefresh()
  }

  const handleReload = () => {
    window.location.reload()
  }

  // Color mapping
  const dotColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  }

  return (
    <div className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-1">
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <div className="flex items-center justify-center gap-3 cursor-pointer hover:opacity-80 transition-opacity text-xs">
              {/* Health Indicator Dot - replaces market status */}
              <div
                className={`w-2 h-2 rounded-full ${dotColors[colorStatus]} ${colorStatus !== 'gray' ? 'animate-pulse' : ''}`}
                title={
                  isLoading
                    ? t('common.statusBar.loading')
                    : error
                    ? t('common.statusBar.error')
                    : health?.is_trading_hours
                    ? t('common.statusBar.marketOpen')
                    : t('common.statusBar.marketClosed')
                }
              />

              {/* Data Age - Compact */}
              <div className="flex items-center gap-2 text-muted-foreground font-mono">
                <span title={t('common.statusBar.dailyDataAge')}>D:{formatTimeAgo(dataAge.daily)}</span>
                <span title={t('common.statusBar.hourlyDataAge')}>H:{formatTimeAgo(dataAge.hourly)}</span>
                <span title={t('common.statusBar.minuteDataAge')}>M:{formatTimeAgo(dataAge.minute)}</span>
              </div>

              {/* Ticker Stats - Compact */}
              {health && (
                <div className="text-muted-foreground font-mono hidden sm:block">
                  {(health.active_tickers_count ?? 0).toLocaleString()}/{(health.total_tickers_count ?? 0).toLocaleString()}
                </div>
              )}
            </div>
          </DialogTrigger>

          {/* Detailed Health Modal */}
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('common.statusBar.healthDetails')}</DialogTitle>
            </DialogHeader>

            {isLoading && (
              <div className="text-center p-4 text-muted-foreground">
                {t('common.statusBar.loading')}
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                {t('common.statusBar.errorMessage')}: {error.message}
              </div>
            )}

            {!isLoading && !error && !health && (
              <div className="text-center p-4 text-muted-foreground">
                No health data available
              </div>
            )}

            {!isLoading && health && (
              <div className="space-y-6">
                {/* Health Status Indicator */}
                <section className="bg-muted/50 p-3 rounded-lg -ml-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${dotColors[colorStatus]} ${colorStatus !== 'gray' ? 'animate-pulse' : ''}`} />
                      <span className="font-semibold text-sm">
                        {colorStatus === 'green' && '✓ Data Fresh (< 5 minutes)'}
                        {colorStatus === 'yellow' && '⚠ Data Aging (5-15 minutes)'}
                        {colorStatus === 'red' && '✗ Data Stale (> 15 minutes)'}
                        {colorStatus === 'gray' && '? No Minute Data'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      M: {formatTimeAgo(dataAge.minute)}
                    </div>
                  </div>

                  {/* Action Buttons - Show when data is not fresh */}
                  {colorStatus !== 'green' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="flex-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Trigger Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReload}
                        className="flex-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Reload Page
                      </Button>
                    </div>
                  )}
                </section>

                {/* Trading Status */}
                <section>
                  <h3 className="font-semibold mb-2">{t('common.statusBar.tradingStatus')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('common.statusBar.marketStatus')}:</span>{' '}
                      <Badge variant={health.is_trading_hours ? 'default' : 'outline'}>
                        {health.is_trading_hours ? t('common.statusBar.open') : t('common.statusBar.closed')}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('common.statusBar.timezone')}:</span>{' '}
                      {health.trading_hours_timezone}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t('common.statusBar.serverTime')}:</span>{' '}
                      <span className="font-mono">{formatToVietnamTime(parseUTCISOString(health.current_system_time))}</span>
                    </div>
                  </div>
                </section>

                {/* Data Sync Status */}
                <section>
                  <h3 className="font-semibold mb-2">{t('common.statusBar.dataSyncStatus')}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.dailySync')}:</span>
                      <span className="font-mono">
                        {health.daily_last_sync ? formatToVietnamTime(parseUTCISOString(health.daily_last_sync)) : 'N/A'} ({formatTimeAgo(dataAge.daily)} {t('common.statusBar.ago')})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.hourlySync')}:</span>
                      <span className="font-mono">
                        {health.hourly_last_sync ? formatToVietnamTime(parseUTCISOString(health.hourly_last_sync)) : 'N/A'} ({formatTimeAgo(dataAge.hourly)} {t('common.statusBar.ago')})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.minuteSync')}:</span>
                      <span className="font-mono">
                        {health.minute_last_sync ? formatToVietnamTime(parseUTCISOString(health.minute_last_sync)) : 'N/A'} ({formatTimeAgo(dataAge.minute)} {t('common.statusBar.ago')})
                      </span>
                    </div>
                  </div>
                </section>

                {/* Ticker Statistics */}
                <section>
                  <h3 className="font-semibold mb-2">{t('common.statusBar.tickerStatistics')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.totalTickers')}:</span>
                      <span className="font-mono">{(health.total_tickers_count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.activeTickers')}:</span>
                      <span className="font-mono">{(health.active_tickers_count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.dailyRecords')}:</span>
                      <span className="font-mono">{(health.daily_records_count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.hourlyRecords')}:</span>
                      <span className="font-mono">{(health.hourly_records_count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.minuteRecords')}:</span>
                      <span className="font-mono">{(health.minute_records_count ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </section>

                {/* Worker Statistics - only show if data available */}
                {health.daily_iteration_count != null && (
                <section>
                  <h3 className="font-semibold mb-2">{t('common.statusBar.workerStatistics')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.dailyIterations')}:</span>
                      <span className="font-mono">{health.daily_iteration_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.statusBar.slowIterations')}:</span>
                      <span className="font-mono">{(health.slow_iteration_count ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </section>
                )}

                {/* Uptime */}
                <section>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('common.statusBar.uptime')}:</span>
                    <span className="font-mono">
                      {Math.floor((health.uptime_secs ?? 0) / 86400)}d {Math.floor(((health.uptime_secs ?? 0) % 86400) / 3600)}h{' '}
                      {Math.floor(((health.uptime_secs ?? 0) % 3600) / 60)}m
                    </span>
                  </div>
                </section>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
