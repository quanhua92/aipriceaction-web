import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { useLogs } from '@/contexts/LogsContext'
import { ChartFullscreenDialog } from '@/components/ChartFullscreenDialog'
import { getWatchlistNames, getCustomWatchlists } from '@/lib/watchlist-storage'
import { isPredefinedWatchlist } from '@/lib/predefined-watchlists'
import { ALL_WATCHLIST_NAME } from '@/lib/constants'
import { SortButtons } from '@/components/SortButtons'
import type { SortBy } from '@/components/SortButtons'
import { TickerGroupSelector } from '@/components/TickerGroupSelector'
import { TopPerformerCard } from './TopPerformerCard'
import { TopPerformerTable } from './TopPerformerTable'
import { ViewModeToggle } from './ViewModeToggle'
import { TopCountToggle } from './TopCountToggle'
import { SectionFilter } from './SectionFilter'
import { IntervalButtons } from './IntervalButtons'
import { BASIC_TOP_PERFORMERS_VIEW_MODE_STORAGE_KEY } from '@/lib/constants'
import { SafeLocalStorage } from '@/lib/localStorage'
import type {
  BasicTopPerformersProps,
  SectionFilter as SectionFilterType,
  IntervalType,
  TopPerformer,
  TickerWithData,
  ViewMode,
  TopCount
} from './types'
import {
  enrichTickerWithData,
  filterBySection,
  filterByGroup,
  filterNonTradingTickers,
  applySorting,
  calculateTopPerformers
} from './utils'

export function BasicTopPerformers({
  defaultGroup = '',
  defaultSectionFilter = 'stocks',
  defaultInterval = '1D',
  defaultSortBy = 'gainers',
  defaultTopCount = 20,
  showControls = true,
  className = '',
  onTickerSelect
}: BasicTopPerformersProps) {
  const {
    tickerGroups,
    cryptoTickerGroups,
    globalTickerGroups,
    allTickersLastData,
    allCryptoTickersLastData,
    allGlobalTickersLastData,
    loading: apiLoading,
    cryptoLoading,
    globalLoading,
    tickers: stockTickers,
    cryptoTickers,
    globalTickers,
    getTickers,
    ema
  } = useAPI()

  const { lastRefresh } = useRefresh()
  const { endDate: globalEndDate } = useChartSettings()
  const { t, language } = useTranslation()
  const { info, error: logError } = useLogs()

  // State management
  const [selectedGroup, setSelectedGroup] = React.useState<string>(defaultGroup || ALL_WATCHLIST_NAME)
  const [sectionFilter, setSectionFilter] = React.useState<SectionFilterType>(defaultSectionFilter)
  const [selectedInterval, setSelectedInterval] = React.useState<IntervalType>(defaultInterval)
  const [selectedSort, setSelectedSort] = React.useState<SortBy>(defaultSortBy)
  const [winners, setWinners] = React.useState<TopPerformer[]>([])
  const [losers, setLosers] = React.useState<TopPerformer[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [apiData, setApiData] = React.useState<Record<string, any[]>>({})

  // State for view mode (cards vs table)
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    // Load from localStorage or default to 'table'
    const saved = SafeLocalStorage.getItem(BASIC_TOP_PERFORMERS_VIEW_MODE_STORAGE_KEY)
    return saved === 'cards' ? 'cards' : 'table'
  })

  // State for top count (10, 20, 30)
  const [topCount, setTopCount] = React.useState<TopCount>(defaultTopCount)

  // State for internal ChartFullscreenDialog
  const [internalDialogTicker, setInternalDialogTicker] = React.useState<string | null>(null)

  // Get tickers for dialog navigation - include all winners and losers (e.g., 20 + 20 = 40 items)
  const navigationTickers = React.useMemo(() => {
    // Combine winners and losers, unique by symbol
    const combined = [...winners, ...losers]
    const uniqueTickers = Array.from(new Map(combined.map(t => [t.symbol, t])).values())
    return uniqueTickers.map(t => t.symbol)
  }, [winners, losers])

  // Get current index for internal dialog
  const navigationIndex = React.useMemo(() => {
    if (!internalDialogTicker) return 0
    const index = navigationTickers.indexOf(internalDialogTicker)
    return index !== -1 ? index : 0
  }, [internalDialogTicker, navigationTickers])

  // Custom title generator for internal dialog
  const generateCustomTitle = React.useCallback((ticker: string): string => {
    const performer = [...winners, ...losers].find(p => p.symbol === ticker)
    if (!performer) return ticker

    const changeText = performer.change >= 0 ? `+${performer.change.toFixed(1)}%` : `${performer.change.toFixed(1)}%`
    const formattedPrice = performer.price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    return `${ticker} • ${formattedPrice} • ${changeText} • ${performer.volume >= 1000000 ?
      `${(performer.volume / 1000000).toFixed(1)}M vol` :
      `${(performer.volume / 1000).toFixed(0)}K vol`
    }`
  }, [winners, losers])

  // State for custom watchlists
  const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([])
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Save view mode to localStorage when it changes
  React.useEffect(() => {
    SafeLocalStorage.setItem(BASIC_TOP_PERFORMERS_VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Load custom watchlists
  React.useEffect(() => {
    const names = getWatchlistNames()
    setCustomWatchlists(names)
  }, [refreshKey])

  // Build comprehensive ticker list
  const allTickers = React.useMemo(() => {
    const tickers: Array<{ symbol: string; sector: string }> = []

    // Add stock tickers
    if (tickerGroups) {
      Object.entries(tickerGroups).forEach(([sector, symbols]) => {
        symbols.forEach(symbol => {
          tickers.push({ symbol, sector })
        })
      })
    }

    // Add crypto tickers
    if (cryptoTickerGroups) {
      Object.entries(cryptoTickerGroups).forEach(([sector, symbols]) => {
        symbols.forEach(symbol => {
          tickers.push({ symbol, sector })
        })
      })
    }

    // Add global tickers
    if (globalTickerGroups) {
      Object.entries(globalTickerGroups).forEach(([sector, symbols]) => {
        symbols.forEach(symbol => {
          tickers.push({ symbol, sector })
        })
      })
    }

    // Remove duplicates
    const uniqueTickers = Array.from(
      new Map(tickers.map(t => [t.symbol, t])).values()
    )

    return uniqueTickers
  }, [tickerGroups, cryptoTickerGroups, globalTickerGroups])

  // Fetch data when interval, refresh, or section filter changes - like TrendSignalTable
  React.useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const apiCalls: Promise<any>[] = []

        // Fetch stocks data if needed - like TrendSignalTable does
        if (sectionFilter === 'stocks') {
          apiCalls.push(
            getTickers('BasicTopPerformers.stocks', {
              symbol: undefined, // Fetch all for cache efficiency (like TrendSignalTable)
              interval: selectedInterval, // Use selected interval (1H, 1D, 1W)
              limit: 1, // Only need latest bar for current performance
              end_date: globalEndDate,
              mode: 'vn',
              ema: ema || undefined,
            }).catch(err => {
              console.warn('Stocks API call failed:', err)
              return {}
            })
          )
        }

        // Fetch crypto data if needed - like TrendSignalTable
        if (sectionFilter === 'crypto') {
          apiCalls.push(
            getTickers('BasicTopPerformers.crypto', {
              symbol: undefined, // Fetch all for cache efficiency
              interval: selectedInterval, // Use selected interval (1H, 1D, 1W)
              limit: 1, // Only need latest bar for current performance
              end_date: globalEndDate,
              mode: 'crypto',
              ema: ema || undefined,
            }).catch(err => {
              console.warn('Crypto API call failed:', err)
              return {}
            })
          )
        }

        // Fetch global (yahoo) data if needed
        if (sectionFilter === 'global') {
          apiCalls.push(
            getTickers('BasicTopPerformers.global', {
              symbol: undefined, // Fetch all for cache efficiency
              interval: selectedInterval, // Use selected interval (1H, 1D, 1W)
              limit: 1, // Only need latest bar for current performance
              end_date: globalEndDate,
              mode: 'yahoo',
              ema: ema || undefined,
            }).catch(err => {
              console.warn('Global API call failed:', err)
              return {}
            })
          )
        }

        if (apiCalls.length === 0) {
          if (isMounted) {
            setApiData({})
            setWinners([])
            setLosers([])
          }
          return
        }

        // Make parallel API calls - like TrendSignalTable
        const responses = await Promise.allSettled(apiCalls)

        if (!isMounted) return

        // Merge responses - like TrendSignalTable
        let combinedData: Record<string, any[]> = {}
        responses.forEach((response) => {
          if (response.status === 'fulfilled') {
            combinedData = { ...combinedData, ...response.value }
          } else {
            console.warn('API call failed:', response.reason)
          }
        })

        setApiData(combinedData)

        info(`BasicTopPerformers`, `Fetched ${Object.keys(combinedData).length} tickers for ${selectedInterval} interval`)
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch top performers data:', err)
          setError('Failed to load market data')
          logError('BasicTopPerformers', 'Failed to fetch data')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [selectedInterval, lastRefresh, sectionFilter, globalEndDate, getTickers, info, logError, ema])

  // Process data and calculate top performers
  React.useEffect(() => {
    if (Object.keys(apiData).length === 0) {
      setWinners([])
      setLosers([])
      return
    }

    try {
      
      // 1. Enrich tickers with fresh interval-specific data from this component's API fetch
      const enrichedTickers = enrichTickerWithData(
        allTickers,
        apiData, // Use fresh stock data for the selected interval
        apiData, // Use fresh crypto data for the selected interval
        stockTickers,
        cryptoTickers,
        globalTickers
      )

      
      // 2. Filter by section (ALL/VN/Crypto)
      const sectionFiltered = filterBySection(enrichedTickers, sectionFilter)

      // 3. Filter by group (if selected)
      const groupFiltered = selectedGroup
        ? filterByGroup(
            sectionFiltered.map(t => ({ symbol: t.symbol, sector: t.sector })),
            selectedGroup,
            tickerGroups,
            customWatchlists
          ).map(filteredTicker =>
            sectionFiltered.find(t => t.symbol === filteredTicker.symbol)
          ).filter(Boolean) as TickerWithData[]
        : sectionFiltered

      // 4. Filter out non-trading tickers (those with stale data)
      const tradingFiltered = filterNonTradingTickers(groupFiltered, apiData, sectionFilter)

      // 5. Apply sorting
      const sortedTickers = applySorting(tradingFiltered, selectedSort)

      // 6. Calculate top winners and losers
      const { winners: topWinners, losers: topLosers } = calculateTopPerformers(
        sortedTickers,
        topCount,
        selectedSort
      )

      
      setWinners(topWinners)
      setLosers(topLosers)
    } catch (err) {
      console.error('Error processing top performers data:', err)
      console.error('Error details:', {
        apiDataKeys: Object.keys(apiData),
        apiDataSample: apiData[Object.keys(apiData)[0]]?.[0],
        allTickersCount: allTickers.length,
        sectionFilter,
        selectedGroup,
        errorMessage: err instanceof Error ? err.message : String(err)
      })
      setError(`Error processing market data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [
    apiData,
    allTickers,
    allTickersLastData,
    allCryptoTickersLastData,
    allGlobalTickersLastData,
    stockTickers,
    cryptoTickers,
    globalTickers,
    sectionFilter,
    selectedGroup,
    selectedSort,
    topCount,
    tickerGroups,
    customWatchlists
  ])

  const handleTickerSelect = (symbol: string) => {
    // If onTickerSelect is provided, forward to it and do nothing else
    if (onTickerSelect) {
      onTickerSelect(symbol)
      return
    }

    // If no onTickerSelect provided, open internal ChartFullscreenDialog
    setInternalDialogTicker(symbol)
  }

  if (apiLoading || cryptoLoading || globalLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Title Header */}
      <div className="flex items-center mb-3 shrink-0">
        <h3 className="text-lg font-semibold">
          {t('common.topPerformers.title')}
        </h3>
      </div>

      {/* Group Selector and Interval Buttons - matching BasicWatchList style */}
      {showControls && (
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <TickerGroupSelector
            value={selectedGroup}
            onValueChange={setSelectedGroup}
            showAll={true}
            showCrypto={true}
            showPredefined={true}
            showCustom={true}
            showSectors={true}
            placeholder="Select group"
            className="w-36 h-8 text-sm font-bold hover:bg-muted/50 transition-colors duration-200"
            refreshKey={refreshKey}
          />

          {/* Spacer to push interval buttons to the right */}
          <div className="flex-1"></div>

          {/* Interval Buttons: 1H | 1D | 1W */}
          <IntervalButtons value={selectedInterval} onChange={setSelectedInterval} />
        </div>
      )}

      {/* Section Filter Buttons - matching SortableTickerList style */}
      <div>
        <SectionFilter value={sectionFilter} onChange={setSectionFilter} />
      </div>

      {/* Sort Buttons - 4 rows like BasicWatchList */}
      <div className="mb-3">
        <SortButtons
          value={selectedSort}
          onChange={setSelectedSort}
          margin="bottom"
        />
      </div>

      {/* View Mode Toggle and Top Count Toggle */}
      {showControls && (
        <div className="flex items-center justify-between mb-3">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <TopCountToggle value={topCount} onChange={setTopCount} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.topPerformers.loadingPerformers')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Top Performers Sections */}
      {!loading && !error && (
        <div className="flex-1 space-y-4">
          {viewMode === 'cards' ? (
            <>
              {/* Top Winners - Cards View */}
              <div>
                <h3 className="text-sm font-semibold text-green-600 mb-2">
                  {t('common.topPerformers.topWinners', { count: topCount })}
                </h3>
                {winners.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {t('common.topPerformers.noWinnersFound')}
                  </div>
                ) : (
                  <div className="space-y-0">
                    {winners.map((winner) => (
                      <TopPerformerCard
                        key={`winner-${winner.symbol}`}
                        performer={winner}
                        onClick={() => handleTickerSelect(winner.symbol)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Top Losers - Cards View */}
              <div>
                <h3 className="text-sm font-semibold text-red-600 mb-2">
                  {t('common.topPerformers.topLosers', { count: topCount })}
                </h3>
                {losers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {t('common.topPerformers.noLosersFound')}
                  </div>
                ) : (
                  <div className="space-y-0">
                    {losers.map((loser) => (
                      <TopPerformerCard
                        key={`loser-${loser.symbol}`}
                        performer={loser}
                        onClick={() => handleTickerSelect(loser.symbol)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Top Winners - Table View */}
              <TopPerformerTable
                performers={winners}
                title={t('common.topPerformers.topWinners', { count: topCount })}
                onTickerSelect={handleTickerSelect}
                emptyMessage={t('common.topPerformers.noWinnersFound')}
              />

              {/* Top Losers - Table View */}
              <TopPerformerTable
                performers={losers}
                title={t('common.topPerformers.topLosers', { count: topCount })}
                onTickerSelect={handleTickerSelect}
                emptyMessage={t('common.topPerformers.noLosersFound')}
              />
            </>
          )}
        </div>
      )}

      {/* Internal ChartFullscreenDialog - only show when no onTickerSelect prop provided */}
      {!onTickerSelect && (
        <ChartFullscreenDialog
          ticker={internalDialogTicker}
          onClose={() => setInternalDialogTicker(null)}
          tickerList={navigationTickers}
          currentIndex={navigationIndex}
          getTitle={generateCustomTitle}
        />
      )}

    </div>
  )
}