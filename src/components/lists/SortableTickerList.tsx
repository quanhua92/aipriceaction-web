import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { MARKET_INDICES, MAJOR_CRYPTO } from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getPriceChangeColor } from '@/lib/colors'
import { getSectorDisplayName } from '@/lib/sector-names'
import { useTranslation } from '@/hooks/useTranslation'
import type { StockData } from '@/lib/api-client'

export interface Ticker {
  symbol: string
  sector: string
}

export type SortBy = 'az' | 'gainers' | 'losers' | 'volume' | 'ma20' | 'ma50'
export type SectionFilter = 'all' | 'stocks' | 'crypto'

export interface SortableTickerListProps {
  tickers: Ticker[]
  allTickersLastData: Record<string, StockData[]>
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
  // Crypto support (optional for backward compatibility)
  cryptoTickers?: Ticker[]
  allCryptoTickersLastData?: Record<string, StockData[]>
  // Default filter override (e.g., for custom watchlists)
  defaultSectionFilter?: SectionFilter
}

export function SortableTickerList({
  tickers,
  allTickersLastData,
  searchQuery = '',
  marketIndices = [...MARKET_INDICES],
  showMarketIndices = true,
  showSections = true,
  onSelectTicker,
  loading = false,
  error = null,
  maxHeight = '400px',
  className = '',
  onSortedTickersChange,
  cryptoTickers = [],
  allCryptoTickersLastData = {},
  defaultSectionFilter = 'stocks'
}: SortableTickerListProps) {
  const [sortBy, setSortBy] = React.useState<SortBy>('volume')
  const [sectionFilter, setSectionFilter] = React.useState<SectionFilter>(defaultSectionFilter)
  const { t, language } = useTranslation()

  // Reset filter when defaultSectionFilter changes (e.g., switching between watchlists)
  React.useEffect(() => {
    setSectionFilter(defaultSectionFilter)
  }, [defaultSectionFilter])

  const getLatestData = (symbol: string, isCrypto = false): StockData | undefined => {
    const dataSource = isCrypto ? allCryptoTickersLastData : allTickersLastData
    const data = dataSource[symbol]
    return data?.[data.length - 1]
  }

  const { filteredMarketIndices, filteredTickers, filteredMajorCrypto, filteredCryptoTickers } = React.useMemo(() => {
    const searchLower = searchQuery.toLowerCase()

    // Filter market indices
    const indices = showMarketIndices
      ? marketIndices.filter(index =>
          index.toLowerCase().includes(searchLower)
        )
      : []

    // Filter major crypto (BTC, ETH, XRP, TON)
    const majorCrypto = cryptoTickers.filter(
      (ticker) =>
        MAJOR_CRYPTO.includes(ticker.symbol as any) &&
        ticker.symbol.toLowerCase().includes(searchLower)
    )

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

        case 'ma20':
          // Sort by MA20 score descending (highest/most bullish first)
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          // Sort by MA50 score descending (highest/most bullish first)
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        default:
          return 0
      }
    })

    // Filter and sort crypto tickers (excluding major crypto)
    const filteredCrypto = cryptoTickers.filter(
      (ticker) =>
        !MAJOR_CRYPTO.includes(ticker.symbol as any) &&
        ticker.symbol.toLowerCase().includes(searchLower)
    )

    const sortedCrypto = [...filteredCrypto].sort((a, b) => {
      const aData = getLatestData(a.symbol, true)
      const bData = getLatestData(b.symbol, true)

      switch (sortBy) {
        case 'az':
          return a.symbol.localeCompare(b.symbol)

        case 'gainers':
          const aChange = aData?.close_changed ?? -Infinity
          const bChange = bData?.close_changed ?? -Infinity
          return bChange - aChange

        case 'losers':
          const aLoss = aData?.close_changed ?? Infinity
          const bLoss = bData?.close_changed ?? Infinity
          return aLoss - bLoss

        case 'volume':
          const aVol = aData?.volume ?? 0
          const bVol = bData?.volume ?? 0
          return bVol - aVol

        case 'ma20':
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        default:
          return 0
      }
    })

    // Sort major crypto (same logic as regular crypto)
    const sortedMajorCrypto = [...majorCrypto].sort((a, b) => {
      const aData = getLatestData(a.symbol, true)
      const bData = getLatestData(b.symbol, true)

      switch (sortBy) {
        case 'az':
          return a.symbol.localeCompare(b.symbol)

        case 'gainers':
          const aChange = aData?.close_changed ?? -Infinity
          const bChange = bData?.close_changed ?? -Infinity
          return bChange - aChange

        case 'losers':
          const aLoss = aData?.close_changed ?? Infinity
          const bLoss = bData?.close_changed ?? Infinity
          return aLoss - bLoss

        case 'volume':
          const aVol = aData?.volume ?? 0
          const bVol = bData?.volume ?? 0
          return bVol - aVol

        case 'ma20':
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        default:
          return 0
      }
    })

    return {
      filteredMarketIndices: indices,
      filteredTickers: sortedTickers,
      filteredMajorCrypto: sortedMajorCrypto,
      filteredCryptoTickers: sortedCrypto
    }
  }, [searchQuery, tickers, marketIndices, showMarketIndices, sortBy, allTickersLastData, cryptoTickers, allCryptoTickersLastData])

  // Build array matching the exact visual rendering order
  // This ensures navigation order matches what user sees on screen
  const visuallyOrderedTickers = React.useMemo(() => {
    const ordered: Ticker[] = []

    // 1. Market Indices (if shown and not filtered out)
    if (filteredMarketIndices.length > 0 && sectionFilter !== 'crypto') {
      // Convert market indices strings to Ticker objects
      ordered.push(...filteredMarketIndices.map(symbol => ({ symbol, sector: 'Market Indices' })))
    }

    // 2. Major Crypto (if shown and not filtered out)
    if (filteredMajorCrypto.length > 0 && sectionFilter !== 'stocks') {
      ordered.push(...filteredMajorCrypto)
    }

    // 3. Regular Stocks (if shown and not filtered out)
    if (filteredTickers.length > 0 && sectionFilter !== 'crypto') {
      ordered.push(...filteredTickers)
    }

    // 4. Minor Crypto (if shown and not filtered out)
    if (filteredCryptoTickers.length > 0 && sectionFilter !== 'stocks') {
      ordered.push(...filteredCryptoTickers)
    }

    return ordered
  }, [filteredMarketIndices, filteredMajorCrypto, filteredTickers, filteredCryptoTickers, sectionFilter])

  // Notify parent component when sorted tickers change
  // Pass the visually ordered list so navigation matches what user sees
  React.useEffect(() => {
    if (onSortedTickersChange) {
      onSortedTickersChange(visuallyOrderedTickers)
    }
  }, [visuallyOrderedTickers, onSortedTickersChange])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Section Filter Buttons */}
      <div className="grid grid-cols-3 gap-1.5 mb-2 shrink-0">
        <button
          onClick={() => setSectionFilter('all')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sectionFilter === 'all'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.filters.all')}
        </button>
        <button
          onClick={() => setSectionFilter('stocks')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sectionFilter === 'stocks'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.filters.stocks')}
        </button>
        <button
          onClick={() => setSectionFilter('crypto')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sectionFilter === 'crypto'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.filters.crypto')}
        </button>
      </div>

      {/* Sort Buttons */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 shrink-0">
        {/* Row 1 */}
        <button
          onClick={() => setSortBy('volume')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'volume'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.volume')}
        </button>
        <button
          onClick={() => setSortBy('gainers')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'gainers'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.gainers')}
        </button>
        <button
          onClick={() => setSortBy('losers')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'losers'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.losers')}
        </button>
        {/* Row 2 */}
        <button
          onClick={() => setSortBy('ma20')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'ma20'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.ma20')}
        </button>
        <button
          onClick={() => setSortBy('ma50')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'ma50'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.ma50')}
        </button>
        <button
          onClick={() => setSortBy('az')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'az'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.sortBy.az')}
        </button>
      </div>

      {/* Ticker List */}
      <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight }}>
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
              {filteredMarketIndices.length > 0 && sectionFilter !== 'crypto' && (
                <div className="mb-2">
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.marketIndices')}
                    </div>
                  )}
                  {filteredMarketIndices.map((index) => {
                    const latestData = getLatestData(index)
                    return (
                      <button
                        key={index}
                        onClick={() => onSelectTicker(index)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0 flex-shrink">
                          <span className="font-extrabold">{index}</span>
                          <span className="text-xs text-muted-foreground/70 truncate">{t('dialogs.selectTicker.labels.marketIndex')}</span>
                        </div>
                        {latestData && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {/* Price Row */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatPrice(latestData.close, latestData)}</span>
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
                                <span className={`tabular-nums opacity-70 ${latestData.volume_changed > 150 ? 'text-purple-600 dark:text-purple-500' : ''}`}>
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

              {/* Major Crypto */}
              {filteredMajorCrypto.length > 0 && sectionFilter !== 'stocks' && (
                <div className="mb-2">
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.majorCrypto')}
                    </div>
                  )}
                  {filteredMajorCrypto.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol, true)
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0 flex-shrink">
                          <span className="font-extrabold">{ticker.symbol}</span>
                          <span className="text-xs text-muted-foreground/70 truncate">{getSectorDisplayName(ticker.sector, language)}</span>
                        </div>
                        {latestData && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {/* Price Row */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatPrice(latestData.close, latestData)}</span>
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
                                <span className={`tabular-nums opacity-70 ${latestData.volume_changed > 150 ? 'text-purple-600 dark:text-purple-500' : ''}`}>
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
              {filteredTickers.length > 0 && sectionFilter !== 'crypto' && (
                <div>
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.stocks')}
                    </div>
                  )}
                  {filteredTickers.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol)
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0 flex-shrink">
                          <span className="font-extrabold">{ticker.symbol}</span>
                          <span className="text-xs text-muted-foreground/70 truncate">{getSectorDisplayName(ticker.sector, language)}</span>
                        </div>
                        {latestData && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {/* Price Row */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatPrice(latestData.close, latestData)}</span>
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
                                <span className={`tabular-nums opacity-70 ${latestData.volume_changed > 150 ? 'text-purple-600 dark:text-purple-500' : ''}`}>
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

              {/* Crypto Tickers */}
              {filteredCryptoTickers.length > 0 && sectionFilter !== 'stocks' && (
                <div>
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.crypto')}
                    </div>
                  )}
                  {filteredCryptoTickers.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol, true)
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0 flex-shrink">
                          <span className="font-extrabold">{ticker.symbol}</span>
                          <span className="text-xs text-muted-foreground/70 truncate">{getSectorDisplayName(ticker.sector, language)}</span>
                        </div>
                        {latestData && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {/* Price Row */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatPrice(latestData.close, latestData)}</span>
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
                                <span className={`tabular-nums opacity-70 ${latestData.volume_changed > 150 ? 'text-purple-600 dark:text-purple-500' : ''}`}>
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

              {/* No results message - check visible sections only */}
              {(
                (sectionFilter === 'all' && filteredMarketIndices.length === 0 && filteredTickers.length === 0 && filteredMajorCrypto.length === 0 && filteredCryptoTickers.length === 0) ||
                (sectionFilter === 'stocks' && filteredMarketIndices.length === 0 && filteredTickers.length === 0) ||
                (sectionFilter === 'crypto' && filteredMajorCrypto.length === 0 && filteredCryptoTickers.length === 0)
              ) && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dialogs.selectTicker.states.noTickersFound')}
                </div>
              )}
            </>
          )}
      </div>
    </div>
  )
}