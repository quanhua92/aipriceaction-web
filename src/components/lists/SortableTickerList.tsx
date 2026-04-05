import * as React from 'react'
import { Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MARKET_INDICES, MAJOR_CRYPTO, MAJOR_GLOBAL, TICKER_LIST_SECTION_FILTER_STORAGE_KEY, TICKER_LIST_SORT_BY_STORAGE_KEY } from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { SafeLocalStorage } from '@/lib/localStorage'
import { getPriceChangeColor } from '@/lib/colors'
import { getSectorDisplayName } from '@/lib/sector-names'
import { useTranslation } from '@/hooks/useTranslation'
import { SortButtons } from '@/components/SortButtons'
import type { StockData } from '@/lib/api-client'

export interface Ticker {
  symbol: string
  sector: string
}

export type SortBy = 'gainers' | 'losers' | 'volume' | 'ma10' | 'ma20' | 'ma50' | 'ma100' | 'ma200' | 'value' | 'az'
export type SectionFilter = 'stocks' | 'crypto' | 'global'

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
  // Global (Yahoo) support
  globalTickers?: Ticker[]
  allGlobalTickersLastData?: Record<string, StockData[]>
  // Default filter override (e.g., for custom watchlists)
  defaultSectionFilter?: SectionFilter | null
}

export interface SortableTickerListRef {
  selectFirstVisible: () => void
}

export const SortableTickerList = React.forwardRef<SortableTickerListRef, SortableTickerListProps>(({
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
  globalTickers = [],
  allGlobalTickersLastData = {},
  defaultSectionFilter = 'stocks'
}, ref) => {
  // Initialize from localStorage, fall back to prop default
  const [sortBy, setSortBy] = React.useState<SortBy>(() => {
    const saved = SafeLocalStorage.getItem(TICKER_LIST_SORT_BY_STORAGE_KEY)
    if (saved) return saved as SortBy
    return 'value'
  })
  const [sectionFilter, setSectionFilter] = React.useState<SectionFilter>(() => {
    const saved = SafeLocalStorage.getItem(TICKER_LIST_SECTION_FILTER_STORAGE_KEY)
    if (saved && saved !== 'all') return saved as SectionFilter
    return defaultSectionFilter ?? 'stocks'
  })
  const [showAll, setShowAll] = React.useState(false)
  const MAX_VISIBLE = 100
  const { t, language } = useTranslation()

  // Persist sort and section filter to localStorage
  React.useEffect(() => {
    SafeLocalStorage.setItem(TICKER_LIST_SORT_BY_STORAGE_KEY, sortBy)
  }, [sortBy])
  React.useEffect(() => {
    SafeLocalStorage.setItem(TICKER_LIST_SECTION_FILTER_STORAGE_KEY, sectionFilter)
  }, [sectionFilter])

  // No effect for defaultSectionFilter — localStorage is the source of truth.
  // Consumers that need to force a section (e.g. BasicWatchList switching watchlists)
  // should pass a `key` prop to force remount.
  React.useEffect(() => {
    setShowAll(false)
  }, [searchQuery, sortBy, sectionFilter])

  const getLatestData = (symbol: string, mode: 'stock' | 'crypto' | 'global' = 'stock'): StockData | undefined => {
    const dataSource = mode === 'crypto' ? allCryptoTickersLastData : mode === 'global' ? allGlobalTickersLastData : allTickersLastData
    const data = dataSource[symbol]
    return data?.[data.length - 1]
  }

  const { filteredMarketIndices, filteredTickers, filteredMajorCrypto, filteredCryptoTickers, filteredMajorGlobal, filteredGlobalTickers } = React.useMemo(() => {
    const searchLower = searchQuery.toLowerCase()

    // Filter market indices
    const indices = showMarketIndices
      ? marketIndices.filter(index =>
          index.toLowerCase().includes(searchLower)
        )
      : []

    // Filter major crypto (BTCUSDT, ETHUSDT, XRPUSDT, TONUSDT)
    const majorCrypto = cryptoTickers.filter(
      (ticker) =>
        MAJOR_CRYPTO.includes(ticker.symbol as any) &&
        ticker.symbol.toLowerCase().includes(searchLower)
    )

    // Filter major global tickers
    const majorGlobal = globalTickers.filter(
      (ticker) =>
        MAJOR_GLOBAL.includes(ticker.symbol as any) &&
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

        case 'ma10':
          // Sort by MA10 score descending (highest/most bullish first)
          const aMA10 = aData?.ma10_score ?? -Infinity
          const bMA10 = bData?.ma10_score ?? -Infinity
          return bMA10 - aMA10

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

        case 'ma100':
          // Sort by MA100 score descending (highest/most bullish first)
          const aMA100 = aData?.ma100_score ?? -Infinity
          const bMA100 = bData?.ma100_score ?? -Infinity
          return bMA100 - aMA100

        case 'ma200':
          // Sort by MA200 score descending (highest/most bullish first)
          const aMA200 = aData?.ma200_score ?? -Infinity
          const bMA200 = bData?.ma200_score ?? -Infinity
          return bMA200 - aMA200

        case 'value':
          // Sort by value descending (highest traded value first)
          const aValue = (aData?.close ?? 0) * (aData?.volume ?? 0)
          const bValue = (bData?.close ?? 0) * (bData?.volume ?? 0)
          return bValue - aValue

        case 'az':
          // Sort alphabetically by symbol
          return a.symbol.localeCompare(b.symbol)

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
      const aData = getLatestData(a.symbol, 'crypto')
      const bData = getLatestData(b.symbol, 'crypto')

      switch (sortBy) {
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

        case 'ma10':
          const aMA10 = aData?.ma10_score ?? -Infinity
          const bMA10 = bData?.ma10_score ?? -Infinity
          return bMA10 - aMA10

        case 'ma20':
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        case 'ma100':
          const aMA100 = aData?.ma100_score ?? -Infinity
          const bMA100 = bData?.ma100_score ?? -Infinity
          return bMA100 - aMA100

        case 'ma200':
          const aMA200 = aData?.ma200_score ?? -Infinity
          const bMA200 = bData?.ma200_score ?? -Infinity
          return bMA200 - aMA200

        case 'value':
          // Sort by value descending (highest traded value first)
          const aValue = (aData?.close ?? 0) * (aData?.volume ?? 0)
          const bValue = (bData?.close ?? 0) * (bData?.volume ?? 0)
          return bValue - aValue

        case 'az':
          // Sort alphabetically by symbol
          return a.symbol.localeCompare(b.symbol)

        default:
          return 0
      }
    })

    // Sort major crypto (same logic as regular crypto)
    const sortedMajorCrypto = [...majorCrypto].sort((a, b) => {
      const aData = getLatestData(a.symbol, 'crypto')
      const bData = getLatestData(b.symbol, 'crypto')

      switch (sortBy) {
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

        case 'ma10':
          const aMA10 = aData?.ma10_score ?? -Infinity
          const bMA10 = bData?.ma10_score ?? -Infinity
          return bMA10 - aMA10

        case 'ma20':
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        case 'value':
          // Sort by value descending (highest traded value first)
          const aValue = (aData?.close ?? 0) * (aData?.volume ?? 0)
          const bValue = (bData?.close ?? 0) * (bData?.volume ?? 0)
          return bValue - aValue

        case 'az':
          // Sort alphabetically by symbol
          return a.symbol.localeCompare(b.symbol)

        default:
          return 0
      }
    })

    // Filter and sort global tickers (excluding major global)
    const filteredGlobal = globalTickers.filter(
      (ticker) =>
        !MAJOR_GLOBAL.includes(ticker.symbol as any) &&
        ticker.symbol.toLowerCase().includes(searchLower)
    )

    const sortedGlobal = [...filteredGlobal].sort((a, b) => {
      const aData = getLatestData(a.symbol, 'global')
      const bData = getLatestData(b.symbol, 'global')

      switch (sortBy) {
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

        case 'ma10':
          const aMA10 = aData?.ma10_score ?? -Infinity
          const bMA10 = bData?.ma10_score ?? -Infinity
          return bMA10 - aMA10

        case 'ma20':
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        case 'ma100':
          const aMA100 = aData?.ma100_score ?? -Infinity
          const bMA100 = bData?.ma100_score ?? -Infinity
          return bMA100 - aMA100

        case 'ma200':
          const aMA200 = aData?.ma200_score ?? -Infinity
          const bMA200 = bData?.ma200_score ?? -Infinity
          return bMA200 - aMA200

        case 'value':
          // Sort by value descending (highest traded value first)
          const aValue = (aData?.close ?? 0) * (aData?.volume ?? 0)
          const bValue = (bData?.close ?? 0) * (bData?.volume ?? 0)
          return bValue - aValue

        case 'az':
          // Sort alphabetically by symbol
          return a.symbol.localeCompare(b.symbol)

        default:
          return 0
      }
    })

    // Sort major global (same logic as major crypto)
    const sortedMajorGlobal = [...majorGlobal].sort((a, b) => {
      const aData = getLatestData(a.symbol, 'global')
      const bData = getLatestData(b.symbol, 'global')

      switch (sortBy) {
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

        case 'ma10':
          const aMA10 = aData?.ma10_score ?? -Infinity
          const bMA10 = bData?.ma10_score ?? -Infinity
          return bMA10 - aMA10

        case 'ma20':
          const aMA20 = aData?.ma20_score ?? -Infinity
          const bMA20 = bData?.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          const aMA50 = aData?.ma50_score ?? -Infinity
          const bMA50 = bData?.ma50_score ?? -Infinity
          return bMA50 - aMA50

        case 'value':
          // Sort by value descending (highest traded value first)
          const aValue = (aData?.close ?? 0) * (aData?.volume ?? 0)
          const bValue = (bData?.close ?? 0) * (bData?.volume ?? 0)
          return bValue - aValue

        case 'az':
          // Sort alphabetically by symbol
          return a.symbol.localeCompare(b.symbol)

        default:
          return 0
      }
    })

    return {
      filteredMarketIndices: indices,
      filteredTickers: sortedTickers,
      filteredMajorCrypto: sortedMajorCrypto,
      filteredCryptoTickers: sortedCrypto,
      filteredMajorGlobal: sortedMajorGlobal,
      filteredGlobalTickers: sortedGlobal
    }
  }, [searchQuery, tickers, marketIndices, showMarketIndices, sortBy, allTickersLastData, cryptoTickers, allCryptoTickersLastData, allGlobalTickersLastData, globalTickers])

  // Build array matching the exact visual rendering order
  // This ensures navigation order matches what user sees on screen
  const visuallyOrderedTickers = React.useMemo(() => {
    const ordered: Ticker[] = []
    const seenSymbols = new Set<string>()

    // Helper function to add unique tickers (O(1) check)
    const addUnique = (ticker: Ticker) => {
      if (!seenSymbols.has(ticker.symbol)) {
        seenSymbols.add(ticker.symbol)
        ordered.push(ticker)
      }
    }

    // 1. Market Indices (shown in stocks filter)
    if (filteredMarketIndices.length > 0 && (sectionFilter === 'stocks')) {
      // Convert market indices strings to Ticker objects
      filteredMarketIndices.forEach(symbol => {
        addUnique({ symbol, sector: 'Market Indices' })
      })
    }

    // 2. Major Global (shown in global filter)
    if (filteredMajorGlobal.length > 0 && sectionFilter === 'global') {
      filteredMajorGlobal.forEach(ticker => {
        addUnique(ticker)
      })
    }

    // 3. Major Crypto (shown in crypto filter)
    if (filteredMajorCrypto.length > 0 && sectionFilter === 'crypto') {
      filteredMajorCrypto.forEach(ticker => {
        addUnique(ticker)
      })
    }

    // 4. Regular Stocks (shown in stocks filter)
    if (filteredTickers.length > 0 && sectionFilter === 'stocks') {
      filteredTickers.forEach(ticker => {
        addUnique(ticker)
      })
    }

    // 5. Minor Crypto (shown in crypto filter)
    if (filteredCryptoTickers.length > 0 && sectionFilter === 'crypto') {
      filteredCryptoTickers.forEach(ticker => {
        addUnique(ticker)
      })
    }

    // 6. Global Tickers (shown in global filter)
    if (filteredGlobalTickers.length > 0 && sectionFilter === 'global') {
      filteredGlobalTickers.forEach(ticker => {
        addUnique(ticker)
      })
    }

    return ordered
  }, [filteredMarketIndices, filteredMajorCrypto, filteredTickers, filteredCryptoTickers, filteredMajorGlobal, filteredGlobalTickers, sectionFilter])

  // Expose selectFirstVisible method via ref
  React.useImperativeHandle(ref, () => ({
    selectFirstVisible: () => {
      const firstTicker = visuallyOrderedTickers[0]
      if (firstTicker) {
        onSelectTicker(firstTicker.symbol)
      }
    }
  }), [visuallyOrderedTickers, onSelectTicker])

  // Calculate visible vs hidden items for each section
  const { visibleMarketIndices, visibleMajorCrypto, visibleTickers, visibleCrypto, visibleMajorGlobal, visibleGlobal, hasMore } = React.useMemo(() => {
    if (showAll) {
      return {
        visibleMarketIndices: filteredMarketIndices,
        visibleMajorCrypto: filteredMajorCrypto,
        visibleTickers: filteredTickers,
        visibleCrypto: filteredCryptoTickers,
        visibleMajorGlobal: filteredMajorGlobal,
        visibleGlobal: filteredGlobalTickers,
        hasMore: false
      }
    }

    let remaining = MAX_VISIBLE
    const takeVisible = <T,>(items: T[]): T[] => {
      if (remaining <= 0) return []
      const take = Math.min(items.length, remaining)
      remaining -= take
      return items.slice(0, take)
    }

    const totalItems = filteredMarketIndices.length + filteredMajorGlobal.length + filteredMajorCrypto.length +
                      filteredTickers.length + filteredCryptoTickers.length + filteredGlobalTickers.length

    return {
      visibleMarketIndices: takeVisible(filteredMarketIndices),
      visibleMajorGlobal: takeVisible(filteredMajorGlobal),
      visibleMajorCrypto: takeVisible(filteredMajorCrypto),
      visibleTickers: takeVisible(filteredTickers),
      visibleCrypto: takeVisible(filteredCryptoTickers),
      visibleGlobal: takeVisible(filteredGlobalTickers),
      hasMore: totalItems > MAX_VISIBLE
    }
  }, [showAll, filteredMarketIndices, filteredMajorCrypto, filteredTickers, filteredCryptoTickers, filteredMajorGlobal, filteredGlobalTickers, sectionFilter])

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
        <button
          onClick={() => setSectionFilter('global')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            sectionFilter === 'global'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('dialogs.selectTicker.filters.global')}
        </button>
      </div>

      {/* Sort Buttons */}
      <SortButtons
        value={sortBy}
        onChange={setSortBy}
        margin="bottom"
      />

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
              {visibleMarketIndices.length > 0 && sectionFilter === 'stocks' && (
                <div className="mb-2">
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.marketIndices')}
                    </div>
                  )}
                  {visibleMarketIndices.map((index) => {
                    const latestData = getLatestData(index)
                    return (
                      <button
                        key={index}
                        onClick={() => onSelectTicker(index)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer"
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

              {/* Major Global */}
              {visibleMajorGlobal.length > 0 && sectionFilter === 'global' && (
                <div className="mb-2">
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.majorGlobal')}
                    </div>
                  )}
                  {visibleMajorGlobal.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol, 'global')
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer"
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

              {/* Major Crypto */}
              {visibleMajorCrypto.length > 0 && sectionFilter === 'crypto' && (
                <div className="mb-2">
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.majorCrypto')}
                    </div>
                  )}
                  {visibleMajorCrypto.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol, 'crypto')
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer"
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
              {visibleTickers.length > 0 && sectionFilter === 'stocks' && (
                <div>
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.stocks')}
                    </div>
                  )}
                  {visibleTickers.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol)
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer"
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
              {visibleCrypto.length > 0 && sectionFilter === 'crypto' && (
                <div>
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.crypto')}
                    </div>
                  )}
                  {visibleCrypto.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol, 'crypto')
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer"
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

              {/* Global Tickers */}
              {visibleGlobal.length > 0 && sectionFilter === 'global' && (
                <div>
                  {showSections && (
                    <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('dialogs.selectTicker.sections.global')}
                    </div>
                  )}
                  {visibleGlobal.map((ticker) => {
                    const latestData = getLatestData(ticker.symbol, 'global')
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onSelectTicker(ticker.symbol)}
                        className="w-full flex items-center justify-between gap-4 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left cursor-pointer"
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

              {/* Show All / Show Less Button */}
              {hasMore && !showAll && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(true)}
                    className="w-full gap-1"
                  >
                    <ChevronDown className="h-4 w-4 animate-bounce" />
                    {t('common.sortableTickerList.showAll')}
                  </Button>
                </div>
              )}

              {showAll && hasMore && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(false)}
                    className="w-full"
                  >
                    {t('common.sortableTickerList.showLess')}
                  </Button>
                </div>
              )}

              {/* No results message - check visible sections only */}
              {(
                (sectionFilter === 'stocks' && filteredMarketIndices.length === 0 && filteredTickers.length === 0) ||
                (sectionFilter === 'crypto' && filteredMajorCrypto.length === 0 && filteredCryptoTickers.length === 0) ||
                (sectionFilter === 'global' && filteredMajorGlobal.length === 0 && filteredGlobalTickers.length === 0)
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
})

SortableTickerList.displayName = 'SortableTickerList'