import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { MARKET_INDICES } from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getPriceChangeColor, getVolumeChangeColor } from '@/lib/colors'
import { useTranslation } from '@/hooks/useTranslation'
import type { StockData } from '@/lib/api-client'

export interface Ticker {
  symbol: string
  sector: string
}

export type SortBy = 'az' | 'gainers' | 'losers' | 'volume'

export interface SortableTickerListProps {
  tickers: Ticker[]
  allTickersData: Record<string, StockData[]>
  searchQuery: string
  marketIndices?: string[]
  showMarketIndices?: boolean
  showSections?: boolean
  onSelectTicker: (symbol: string) => void
  loading?: boolean
  error?: string | null
  maxHeight?: string
  className?: string
  onSortedTickersChange?: (tickers: Ticker[]) => void
}

export function SortableTickerList({
  tickers,
  allTickersData,
  searchQuery = '',
  marketIndices = [...MARKET_INDICES],
  showMarketIndices = true,
  showSections = true,
  onSelectTicker,
  loading = false,
  error = null,
  maxHeight = '400px',
  className = '',
  onSortedTickersChange
}: SortableTickerListProps) {
  const [sortBy, setSortBy] = React.useState<SortBy>('volume')
  const { t } = useTranslation()

  const getLatestData = (symbol: string): StockData | undefined => {
    const data = allTickersData[symbol]
    return data?.[data.length - 1]
  }

  const { filteredMarketIndices, filteredTickers } = React.useMemo(() => {
    const searchLower = searchQuery.toLowerCase()

    // Filter market indices
    const indices = showMarketIndices
      ? marketIndices.filter(index =>
          index.toLowerCase().includes(searchLower)
        )
      : []

    // Filter regular tickers (excluding market indices)
    const regularTickers = tickers.filter(
      (ticker) =>
        !marketIndices.includes(ticker.symbol as any) &&
        ticker.symbol.toLowerCase().includes(searchLower)
    )

    // Sort tickers based on selected sort option
    const sortedTickers = [...regularTickers].sort((a, b) => {
      const aData = getLatestData(a.symbol)
      const bData = getLatestData(b.symbol)

      switch (sortBy) {
        case 'az':
          return a.symbol.localeCompare(b.symbol)

        case 'gainers':
          // Sort by price change descending (highest gain first)
          const aChange = aData?.close_changed ?? -Infinity
          const bChange = bData?.close_changed ?? -Infinity
          return bChange - aChange

        case 'losers':
          // Sort by price change ascending (lowest/most negative first)
          const aLoss = aData?.close_changed ?? Infinity
          const bLoss = bData?.close_changed ?? Infinity
          return aLoss - bLoss

        case 'volume':
          // Sort by volume descending (highest volume first)
          const aVol = aData?.volume ?? 0
          const bVol = bData?.volume ?? 0
          return bVol - aVol

        default:
          return 0
      }
    })

    return {
      filteredMarketIndices: indices,
      filteredTickers: sortedTickers
    }
  }, [searchQuery, tickers, marketIndices, showMarketIndices, sortBy, allTickersData])

  // Notify parent component when sorted tickers change
  React.useEffect(() => {
    if (onSortedTickersChange) {
      onSortedTickersChange(filteredTickers)
    }
  }, [filteredTickers, onSortedTickersChange])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Sort Buttons */}
      <div className="flex gap-1.5 mb-3 shrink-0">
        <button
          onClick={() => setSortBy('volume')}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'volume'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.volume')}
        </button>
        <button
          onClick={() => setSortBy('gainers')}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'gainers'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.gainers')}
        </button>
        <button
          onClick={() => setSortBy('losers')}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'losers'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.losers')}
        </button>
        <button
          onClick={() => setSortBy('az')}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'az'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.az')}
        </button>
      </div>

      {/* Ticker List */}
      <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight }}>
        <div className="p-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              {t('dialogs.selectTicker.states.error')}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Market Indices */}
              {filteredMarketIndices.length > 0 && (
                <div className="mb-2">
                  {showSections && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.marketIndices')}
                    </div>
                  )}
                  {filteredMarketIndices.map((index) => {
                    const latestData = getLatestData(index)
                    return (
                      <button
                        key={index}
                        onClick={() => onSelectTicker(index)}
                        className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0 flex-shrink">
                          <span className="font-extrabold">{index}</span>
                          <span className="text-xs text-muted-foreground/70 truncate">{t('dialogs.selectTicker.labels.marketIndex')}</span>
                        </div>
                        {latestData && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {/* Price Row */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatPrice(latestData.close)}</span>
                              {latestData.close_changed !== null && latestData.close_changed !== undefined && (
                                <span className={`text-xs tabular-nums ${getPriceChangeColor(latestData.close_changed)}`}>
                                  {latestData.close_changed >= 0 ? '↑' : '↓'} {formatPercent(latestData.close_changed)}
                                </span>
                              )}
                            </div>
                            {/* Volume Row */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                              <span className="tabular-nums">{t('dialogs.selectTicker.labels.volume')}: {formatVolume(latestData.volume)}</span>
                              {latestData.volume_changed !== null && latestData.volume_changed !== undefined && (
                                <span className={`tabular-nums opacity-70 ${getVolumeChangeColor(latestData.volume_changed)}`}>
                                  {latestData.volume_changed >= 0 ? '↑' : '↓'} {formatPercent(latestData.volume_changed)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Regular Tickers */}
              {filteredTickers.length > 0 && (
                <div>
                  {showSections && filteredMarketIndices.length > 0 && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.stocks')}
                    </div>
                  )}
                  {filteredTickers.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol)
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0 flex-shrink">
                          <span className="font-extrabold">{ticker.symbol}</span>
                          <span className="text-xs text-muted-foreground/70 truncate">{ticker.sector}</span>
                        </div>
                        {latestData && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {/* Price Row */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatPrice(latestData.close)}</span>
                              {latestData.close_changed !== null && latestData.close_changed !== undefined && (
                                <span className={`text-xs tabular-nums ${getPriceChangeColor(latestData.close_changed)}`}>
                                  {latestData.close_changed >= 0 ? '↑' : '↓'} {formatPercent(latestData.close_changed)}
                                </span>
                              )}
                            </div>
                            {/* Volume Row */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                              <span className="tabular-nums">{t('dialogs.selectTicker.labels.volume')}: {formatVolume(latestData.volume)}</span>
                              {latestData.volume_changed !== null && latestData.volume_changed !== undefined && (
                                <span className={`tabular-nums opacity-70 ${getVolumeChangeColor(latestData.volume_changed)}`}>
                                  {latestData.volume_changed >= 0 ? '↑' : '↓'} {formatPercent(latestData.volume_changed)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {filteredMarketIndices.length === 0 && filteredTickers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dialogs.selectTicker.states.noTickersFound')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}