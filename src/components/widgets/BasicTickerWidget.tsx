import { TrendingUp, TrendingDown, ChevronDown, Maximize2 } from 'lucide-react'
import { formatPrice, formatPercent, formatVolume, parseUTCISOString, formatToVietnamDate } from '@/lib/format'
import { getPriceChangeColor, getVolumeChangeColor } from '@/lib/colors'
import { useTranslation } from '@/hooks/useTranslation'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { getTickerMode } from '@/lib/ticker-utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FreshnessIndicator } from './FreshnessIndicator'
import { useState, useEffect } from 'react'
import type { StockData } from '@/integrations/aipriceaction/src/types'

interface BasicTickerWidgetProps {
  initialTicker?: string
  ticker?: string
  onTickerChange?: (ticker: string) => void
  onFullscreenClick?: () => void
}

export function BasicTickerWidget({ initialTicker = 'VNINDEX', ticker, onTickerChange, onFullscreenClick }: BasicTickerWidgetProps) {
  const { t } = useTranslation()
  const { getTickers, ema, tickers, globalTickers, cryptoTickers } = useAPI()
  const { lastRefresh } = useRefresh()
  const { endDate } = useChartSettings()
  const maPrefix = ema ? 'EMA' : 'MA'

  const effectiveInitialTicker = ticker ?? initialTicker
  const [selectedTicker, setSelectedTicker] = useState(effectiveInitialTicker)
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)

  // Sync with external ticker prop changes
  useEffect(() => {
    if (ticker !== undefined && ticker !== selectedTicker) {
      setSelectedTicker(ticker)
    }
  }, [ticker, selectedTicker])

  // Fetch latest 1D data
  useEffect(() => {
    if (tickers.length === 0 && globalTickers.length === 0 && cryptoTickers.length === 0) {
      return
    }

    let cancelled = false

    async function fetch() {
      setLoading(true)
      try {
        const mode = getTickerMode(selectedTicker, tickers, globalTickers, cryptoTickers)
        const response = await getTickers('BasicTickerWidget', {
          symbol: selectedTicker,
          interval: '1D',
          mode,
          limit: 1,
          ...(endDate ? { end_date: endDate } : {}),
          ...(ema ? { ema: true } : {}),
        })
        if (!cancelled) {
          const arr = response[selectedTicker]
          setData(arr?.[arr.length - 1] ?? null)
        }
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [selectedTicker, lastRefresh, getTickers, ema, endDate, tickers.length, globalTickers.length, cryptoTickers.length])

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

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1">
            <SelectTickerDialog onSelectTicker={handleSelectTicker}>
              <div className="text-lg font-bold hover:bg-muted/50 transition-colors duration-200 inline-flex items-center cursor-pointer px-1 -ml-1">
                {selectedTicker}
                <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
              </div>
            </SelectTickerDialog>
            {onFullscreenClick && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted/50"
                onClick={onFullscreenClick}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="sr-only">Fullscreen</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FreshnessIndicator dataDate={data.time} />
            <p className="text-xs text-muted-foreground">{formatToVietnamDate(parseUTCISOString(data.time))}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatPrice(data.close, data)}</div>
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
                {priceChange !== 0 && data.close != null && priceChange !== -100 && (
                  <>
                    <span>{`${priceChange >= 0 ? "+" : ""}${formatPrice(data.close - (data.close / (1 + priceChange / 100)), data)}`}</span>
                    <span className="mx-1 opacity-40">|</span>
                  </>
                )}
                <span>{formatPercent(priceChange)}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* OHLCV and MA Grid Container */}
      <div className="flex flex-col gap-4">
        {/* OHLCV Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.open')}</p>
              <p className="text-sm font-semibold">{formatPrice(data.open, data)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.high')}</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-500">{formatPrice(data.high, data)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.low')}</p>
              <p className="text-sm font-semibold text-red-600 dark:text-red-500">{formatPrice(data.low, data)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.ticker.close')}</p>
              <p className="text-sm font-semibold">{formatPrice(data.close, data)}</p>
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{maPrefix}10</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {data.ma10 !== null && data.ma10 !== undefined ? formatPrice(data.ma10, data) : '-'}
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{maPrefix}20</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {data.ma20 !== null && data.ma20 !== undefined ? formatPrice(data.ma20, data) : '-'}
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{maPrefix}50</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {data.ma50 !== null && data.ma50 !== undefined ? formatPrice(data.ma50, data) : '-'}
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{maPrefix}100</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {data.ma100 !== null && data.ma100 !== undefined ? formatPrice(data.ma100, data) : '-'}
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
}