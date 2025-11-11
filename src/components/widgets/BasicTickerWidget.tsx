import type { StockData } from '@/lib/api-client'
import { TrendingUp, TrendingDown, ChevronDown, Star } from 'lucide-react'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getPriceChangeColor, getVolumeChangeColor } from '@/lib/colors'
import { useTranslation } from '@/hooks/useTranslation'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { QuickAddWatchListDialog } from '@/components/dialogs/QuickAddWatchListDialog'
import { TickerProvider } from '@/contexts/TickerContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import * as React from 'react'

interface BasicTickerWidgetProps {
  initialTicker?: string
  ticker?: string
  onTickerChange?: (ticker: string) => void
}

export function BasicTickerWidget({ initialTicker = 'VNINDEX', ticker, onTickerChange }: BasicTickerWidgetProps) {
  const { t } = useTranslation()

  
  return (
    <TickerProvider initialTicker={initialTicker} limit={1} enableFetching={true}>
      {({ selectedTicker, setSelectedTicker, loading, chartData }) => {
        
        // Get the latest data (last day)
        const data = chartData[chartData.length - 1] || null

        // Sync with external ticker prop changes
        React.useEffect(() => {
                    if (ticker !== undefined && ticker !== selectedTicker) {
                        setSelectedTicker(ticker)
            onTickerChange?.(ticker)
          }
        }, [ticker, selectedTicker, setSelectedTicker, onTickerChange])

        const handleSelectTicker = (newTicker: string) => {
                    setSelectedTicker(newTicker)
          onTickerChange?.(newTicker)
        }

        // Show loading skeleton while loading
        if (loading) {
          return (
            <div className="border rounded-lg p-4 bg-card">
              {/* Loading Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Skeleton className="h-6 w-20 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-8 w-24 mb-2 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>

              {/* Loading OHLCV Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-2">
                  <Skeleton className="h-3 w-12" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            </div>
          )
        }

        // Show no data message when no data is available
        if (!data) {
          return (
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No data available</p>
              </div>
            </div>
          )
        }

        const priceChange = data.close_changed ?? 0
        const volumeChange = data.volume_changed ?? 0
        const isPricePositive = priceChange >= 0
        const isVolumePositive = volumeChange >= 0

        return (
        <div className="border rounded-lg p-4 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <SelectTickerDialog onSelectTicker={handleSelectTicker}>
                <div className="text-lg font-bold hover:bg-muted/50 transition-colors duration-200 inline-flex items-center cursor-pointer px-1 -ml-1">
                  {selectedTicker}
                  <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
                </div>
              </SelectTickerDialog>
              <p className="text-xs text-muted-foreground">{data.time.split(' ')[0]}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <QuickAddWatchListDialog ticker={selectedTicker}>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50">
                    <Star className="h-3.5 w-3.5" />
                    <span className="sr-only">Add to watchlist</span>
                  </Button>
                </QuickAddWatchListDialog>
                <div className="text-2xl font-bold">{formatPrice(data.close)}</div>
              </div>
              {data.close_changed !== null && data.close_changed !== undefined && (
                <div
                  className={`flex items-center justify-end gap-1 text-sm font-medium ${getPriceChangeColor(priceChange)}`}
                >
                  {isPricePositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {formatPercent(priceChange)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* OHLCV and MA Grid Container */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* OHLCV Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.open')}</p>
                  <p className="text-sm font-semibold">{formatPrice(data.open)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.high')}</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-500">{formatPrice(data.high)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.low')}</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-500">{formatPrice(data.low)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.close')}</p>
                  <p className="text-sm font-semibold">{formatPrice(data.close)}</p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.volume')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{formatVolume(data.volume)}</p>
                    {data.volume_changed !== null && data.volume_changed !== undefined && (
                      <span className={`text-xs font-medium ${getVolumeChangeColor(volumeChange)}`}>
                        {formatPercent(volumeChange)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Moving Averages Grid */}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">{t('common.ticker.movingAverages')}</p>
              <div className="grid grid-cols-2 gap-3">
                {/* MA10 */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.ma10')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {data.ma10 !== null && data.ma10 !== undefined ? formatPrice(data.ma10) : '-'}
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      {t('common.ticker.score')}:{' '}
                      <span className={`font-medium ${data.ma10_score !== null && data.ma10_score !== undefined ? getPriceChangeColor(data.ma10_score) : ''}`}>
                        {data.ma10_score !== null && data.ma10_score !== undefined ? formatPercent(data.ma10_score) : '-'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* MA20 */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.ma20')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {data.ma20 !== null && data.ma20 !== undefined ? formatPrice(data.ma20) : '-'}
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      {t('common.ticker.score')}:{' '}
                      <span className={`font-medium ${data.ma20_score !== null && data.ma20_score !== undefined ? getPriceChangeColor(data.ma20_score) : ''}`}>
                        {data.ma20_score !== null && data.ma20_score !== undefined ? formatPercent(data.ma20_score) : '-'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* MA50 */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.ma50')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {data.ma50 !== null && data.ma50 !== undefined ? formatPrice(data.ma50) : '-'}
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      {t('common.ticker.score')}:{' '}
                      <span className={`font-medium ${data.ma50_score !== null && data.ma50_score !== undefined ? getPriceChangeColor(data.ma50_score) : ''}`}>
                        {data.ma50_score !== null && data.ma50_score !== undefined ? formatPercent(data.ma50_score) : '-'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* MA100 */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.ma100')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {data.ma100 !== null && data.ma100 !== undefined ? formatPrice(data.ma100) : '-'}
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      {t('common.ticker.score')}:{' '}
                      <span className={`font-medium ${data.ma100_score !== null && data.ma100_score !== undefined ? getPriceChangeColor(data.ma100_score) : ''}`}>
                        {data.ma100_score !== null && data.ma100_score !== undefined ? formatPercent(data.ma100_score) : '-'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
      }}
    </TickerProvider>
  )
}