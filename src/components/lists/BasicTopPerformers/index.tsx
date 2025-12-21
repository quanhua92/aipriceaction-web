import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { useLogs } from '@/contexts/LogsContext'
import { getWatchlistNames, getCustomWatchlists } from '@/lib/watchlist-storage'
import { isPredefinedWatchlist } from '@/lib/predefined-watchlists'
import { ALL_WATCHLIST_NAME } from '@/lib/constants'
import { SortButtons } from '@/components/SortButtons'
import type { SortBy } from '@/components/SortButtons'
import { TickerGroupSelector } from '@/components/TickerGroupSelector'
import { TopPerformerCard } from './TopPerformerCard'
import { SectionFilter } from './SectionFilter'
import { IntervalButtons } from './IntervalButtons'
import type {
  BasicTopPerformersProps,
  SectionFilter as SectionFilterType,
  IntervalType,
  TopPerformer,
  TickerWithData
} from './types'
import {
  enrichTickerWithData,
  filterBySection,
  filterByGroup,
  applySorting,
  calculateTopPerformers
} from './utils'

export function BasicTopPerformers({
  defaultGroup = '',
  defaultSectionFilter = 'stocks',
  defaultInterval = '1D',
  defaultSortBy = 'gainers',
  maxItems = 10,
  showControls = true,
  className = '',
  onTickerSelect
}: BasicTopPerformersProps) {
  const {
    tickerGroups,
    cryptoTickerGroups,
    allTickersLastData,
    allCryptoTickersLastData,
    loading: apiLoading,
    cryptoLoading,
    tickers: stockTickers,
    cryptoTickers,
    getTickers
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

  
  // State for custom watchlists
  const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([])
  const [refreshKey, setRefreshKey] = React.useState(0)

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

    // Remove duplicates
    const uniqueTickers = Array.from(
      new Map(tickers.map(t => [t.symbol, t])).values()
    )

    return uniqueTickers
  }, [tickerGroups, cryptoTickerGroups])

  // Fetch data when interval, refresh, or section filter changes - like TrendSignalTable
  React.useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const apiCalls: Promise<any>[] = []

        // Fetch stocks data if needed - like TrendSignalTable does
        if (sectionFilter !== 'crypto') {
          apiCalls.push(
            getTickers('BasicTopPerformers.stocks', {
              symbol: undefined, // Fetch all for cache efficiency (like TrendSignalTable)
              interval: selectedInterval, // Use selected interval (1H, 1D, 1W)
              limit: 1, // Only need latest bar for current performance
              end_date: globalEndDate,
              mode: 'vn'
            }).catch(err => {
              console.warn('Stocks API call failed:', err)
              return {}
            })
          )
        }

        // Fetch crypto data if needed - like TrendSignalTable
        if (sectionFilter !== 'stocks') {
          apiCalls.push(
            getTickers('BasicTopPerformers.crypto', {
              symbol: undefined, // Fetch all for cache efficiency
              interval: selectedInterval, // Use selected interval (1H, 1D, 1W)
              limit: 1, // Only need latest bar for current performance
              end_date: globalEndDate,
              mode: 'crypto'
            }).catch(err => {
              console.warn('Crypto API call failed:', err)
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
  }, [selectedInterval, lastRefresh, sectionFilter, globalEndDate, getTickers, info, logError])

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
        cryptoTickers
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

      // 4. Apply sorting
      const sortedTickers = applySorting(groupFiltered, selectedSort)

      // 5. Calculate top winners and losers
      const { winners: topWinners, losers: topLosers } = calculateTopPerformers(
        sortedTickers,
        maxItems,
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
    stockTickers,
    cryptoTickers,
    sectionFilter,
    selectedGroup,
    selectedSort,
    maxItems,
    tickerGroups,
    customWatchlists
  ])

  const handleTickerSelect = (symbol: string) => {
    // Only call parent's onTickerSelect, no internal dialog
    if (onTickerSelect) {
      onTickerSelect(symbol)
    }
  }

  if (apiLoading || cryptoLoading) {
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
          {/* Top 10 Winners */}
          <div>
            <h3 className="text-sm font-semibold text-green-600 mb-2">
              {t('common.topPerformers.topWinners', { count: maxItems })}
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

          {/* Top 10 Losers */}
          <div>
            <h3 className="text-sm font-semibold text-red-600 mb-2">
              {t('common.topPerformers.topLosers', { count: maxItems })}
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
        </div>
      )}

    </div>
  )
}