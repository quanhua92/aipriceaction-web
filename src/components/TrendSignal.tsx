import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { type StockData } from '@/lib/api-client'
import {
  ALL_WATCHLIST_NAME,
  CRYPTO_WATCHLIST_NAME,
  MATRIX_DAYS_PER_PAGE,
  PRIORITY_GROUPS,
  TRENDSIGNAL_OPEN_SECTORS_STORAGE_KEY,
} from '@/lib/constants'
import { formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TickerGroupSelector } from '@/components/TickerGroupSelector'
import { ChartFullscreenDialog, TitleGeneratorCallback } from './ChartFullscreenDialog'
import { getWatchlistNames } from '@/lib/watchlist-storage'
import { TrendSignalDistribution } from '@/components/TrendSignalDistribution'
import {
  getPredefinedWatchlistTickers,
  isPredefinedWatchlist
} from '@/lib/predefined-watchlists'
import { getSectorDisplayName } from '@/lib/sector-names'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import type { SortBy } from '@/components/lists/SortableTickerList'
import {
  detectSignal,
  getTickerSector,
  processTickerSignals,
  groupSignalsBySector,
  getWatchlistTickersByType,
  type TrendSignalData,
  type SignalType,
  type IntervalType
} from '@/lib/trendsignal-utils'

// Default sectors to show expanded (matches PRIORITY_GROUPS)
const DEFAULT_OPEN_SECTORS = ['NGAN_HANG', 'CHUNG_KHOAN', 'BAT_DONG_SAN', 'XAY_DUNG', 'TAI_NGUYEN_CO_BAN', 'BAN_LE']

// Auto-expand threshold: expand all sectors if total sectors is below this number
const AUTO_EXPAND_SECTOR_THRESHOLD = 3

interface TrendSignalProps {
  defaultWatchlist?: string
  defaultInterval?: IntervalType
  defaultBuyPeriod?: number
  defaultSellPeriod?: number
}


export function TrendSignal({
  defaultWatchlist = ALL_WATCHLIST_NAME,
  defaultInterval = '1D',
  defaultBuyPeriod = 20,
  defaultSellPeriod = 10
}: TrendSignalProps) {
  const { tickerGroups, loading: apiLoading, getTickers, cryptoTickerGroups, cryptoTickers } = useAPI()
  const { lastRefresh } = useRefresh()
  const { endDate: globalEndDate } = useChartSettings()
  const { t, language } = useTranslation()

  // State management
  const [selectedWatchlist, setSelectedWatchlist] = React.useState<string>(defaultWatchlist)
  const [interval, setInterval] = React.useState<IntervalType>(defaultInterval)
  const [buyPeriod, setBuyPeriod] = React.useState<number>(defaultBuyPeriod)
  const [sellPeriod, setSellPeriod] = React.useState<number>(defaultSellPeriod)
  const [showAll, setShowAll] = React.useState(false) // Default to hide non-signals
  const [sortBy, setSortBy] = React.useState<SortBy>('gainers')
  const [signals, setSignals] = React.useState<TrendSignalData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, _setRefreshKey] = React.useState(0)

  // Dialog state for chart viewing
  const [dialogTicker, setDialogTicker] = React.useState<string | null>(null)

  // Sector collapse state
  const [openSectors, setOpenSectors] = React.useState<Set<string>>(() => {
    // Try to load from localStorage (only on client)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(TRENDSIGNAL_OPEN_SECTORS_STORAGE_KEY)
        if (saved) {
          return new Set(JSON.parse(saved))
        }
      } catch (error) {
        console.error('Failed to load open sectors from localStorage:', error)
      }
    }
    // Initialize with only default sectors open (all others collapsed)
    return new Set(DEFAULT_OPEN_SECTORS)
  })

  // Load custom watchlists
  const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([])

  React.useEffect(() => {
    setCustomWatchlists(getWatchlistNames())
  }, [refreshKey])

  // Save open sectors to localStorage whenever they change (client-side only)
  // BUT: Don't save when viewing predefined watchlists OR small watchlists
  React.useEffect(() => {
    // Skip saving if viewing predefined watchlist (VN30, VINGROUP)
    if (isPredefinedWatchlist(selectedWatchlist)) {
      return
    }

    // Count unique sectors from signals (if available)
    // For small watchlists (< AUTO_EXPAND_SECTOR_THRESHOLD), don't persist to localStorage
    if (signals.length > 0) {
      const uniqueSectors = new Set(signals.map(s => s.sector))
      if (uniqueSectors.size < AUTO_EXPAND_SECTOR_THRESHOLD) {
        return
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TRENDSIGNAL_OPEN_SECTORS_STORAGE_KEY, JSON.stringify(Array.from(openSectors)))
      } catch (error) {
        console.error('Failed to save open sectors to localStorage:', error)
      }
    }
  }, [openSectors, selectedWatchlist, signals])

  // Get tickers for selected watchlist and determine type
  const { stockSymbols, cryptoSymbols, watchlistType } = React.useMemo(() => {
    return getWatchlistTickersByType(
      selectedWatchlist,
      tickerGroups,
      cryptoTickers,
      customWatchlists
    )
  }, [selectedWatchlist, tickerGroups, cryptoTickers, customWatchlists])

  const selectedTickers = React.useMemo(() => {
    return [...stockSymbols, ...cryptoSymbols]
  }, [stockSymbols, cryptoSymbols])

  // Fetch and process signals
  React.useEffect(() => {
    if (selectedTickers.length === 0) {
      setSignals([])
      return
    }

    const fetchSignals = async () => {
      setLoading(true)
      setError(null)

      try {
        // Always fetch 40 records for browser cache efficiency
        const endDate = globalEndDate || format(new Date(), 'yyyy-MM-dd')

        // Determine if this is a mixed, crypto-only, or stock-only watchlist
        const isMixed = watchlistType === 'mixed'
        const isCryptoOnly = watchlistType === 'crypto'
        const isStockOnly = watchlistType === 'stock'

        // Fetch ticker data
        let stockResponse: Record<string, StockData[]> = {}
        let cryptoResponse: Record<string, StockData[]> = []

        if (isMixed) {
          // Two parallel API calls for mixed watchlist
          const [stocks, crypto] = await Promise.all([
            stockSymbols.length > 0
              ? getTickers('TrendSignal.data.stocks', {
                  symbol: ['VNINDEX', ...stockSymbols],
                  interval: interval === '1H' ? '1H' : '1D',
                  end_date: endDate,
                  limit: MATRIX_DAYS_PER_PAGE,
                  mode: 'vn',
                })
              : Promise.resolve({}),
            cryptoSymbols.length > 0
              ? getTickers('TrendSignal.data.crypto', {
                  symbol: ['BTC', ...cryptoSymbols],
                  interval: interval === '1H' ? '1H' : '1D',
                  end_date: endDate,
                  limit: MATRIX_DAYS_PER_PAGE,
                  mode: 'crypto',
                })
              : Promise.resolve({}),
          ])
          stockResponse = stocks
          cryptoResponse = crypto
        } else if (isCryptoOnly) {
          // Single crypto call
          cryptoResponse = await getTickers('TrendSignal.data.crypto', {
            symbol: selectedTickers,
            interval: interval === '1H' ? '1H' : '1D',
            end_date: endDate,
            limit: MATRIX_DAYS_PER_PAGE,
            mode: 'crypto',
          })
        } else {
          // Single stock call
          stockResponse = await getTickers('TrendSignal.data.stocks', {
            symbol: selectedWatchlist === ALL_WATCHLIST_NAME
              ? undefined
              : ['VNINDEX', ...selectedTickers],
            interval: interval === '1H' ? '1H' : '1D',
            end_date: endDate,
            limit: MATRIX_DAYS_PER_PAGE,
            mode: 'vn',
          })
        }

        // Merge responses
        const response = { ...stockResponse, ...cryptoResponse }

        // Process signals using utility function
        let processedSignals = processTickerSignals(
          selectedTickers,
          response,
          tickerGroups,
          cryptoTickerGroups,
          buyPeriod,
          sellPeriod
        )

        // Add signalDate formatting
        processedSignals = processedSignals.map(signal => ({
          ...signal,
          signalDate: signal.signal ? formatToVietnamDate(parseUTCISOString(
            (response[signal.ticker]?.[response[signal.ticker].length - 1] as any)?.time
          )) : undefined
        }))

        // Sort: signals first, then by strength (absolute value)
        processedSignals.sort((a, b) => {
          // Both have signals
          if (a.signal && b.signal) {
            return Math.abs(b.strength || 0) - Math.abs(a.strength || 0)
          }
          // Only a has signal
          if (a.signal && !b.signal) {
            return -1
          }
          // Only b has signal
          if (!a.signal && b.signal) {
            return 1
          }
          // Neither has signal, sort alphabetically
          return a.ticker.localeCompare(b.ticker)
        })

        setSignals(processedSignals)
      } catch (err) {
        console.error('Failed to fetch trend signals:', err)
        setError('Failed to load trend signals')
      } finally {
        setLoading(false)
      }
    }

    fetchSignals()
  }, [selectedTickers, interval, buyPeriod, sellPeriod, lastRefresh, globalEndDate, watchlistType, stockSymbols, cryptoSymbols, tickerGroups, cryptoTickerGroups])

  // Filter signals based on showAll setting
  const filteredSignals = React.useMemo(() => {
    if (showAll) {
      return signals
    }
    // Only show tickers with signals (BUY or SELL)
    return signals.filter(signal => signal.signal !== null && signal.signal !== undefined)
  }, [signals, showAll])

  // Group signals by sector using utility function
  const signalsBySector = React.useMemo(() => {
    return groupSignalsBySector(filteredSignals, selectedWatchlist, sortBy)
  }, [filteredSignals, selectedWatchlist, sortBy])

  // Calculate signal distribution for TrendSignalDistribution
  const signalDistribution = React.useMemo(() => ({
    sell: signals.filter(s => s.signal === 'SELL').length,
    none: signals.filter(s => s.signal === null || s.signal === undefined).length,
    buy: signals.filter(s => s.signal === 'BUY').length
  }), [signals])

  // Get all tickers in current view for navigation
  const allTickersInView = React.useMemo(() => {
    const tickers: string[] = []
    // Sort sectors in the same order as displayed in TrendSignal
    const sortedSectors = Object.keys(signalsBySector).sort((a, b) => {
      // MAJOR_CRYPTO goes first for CRYPTO watchlist
      if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
        if (a === 'MAJOR_CRYPTO') return -1
        if (b === 'MAJOR_CRYPTO') return 1
      }

      const priorityA = PRIORITY_GROUPS.indexOf(a as any)
      const priorityB = PRIORITY_GROUPS.indexOf(b as any)

      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB
      }
      if (priorityA !== -1) return -1
      if (priorityB !== -1) return 1

      return a.localeCompare(b)
    })

    // Collect tickers from each sector
    sortedSectors.forEach(sector => {
      const sectorSignals = signalsBySector[sector]
      if (!openSectors.has(sector)) return // Skip collapsed sectors

      sectorSignals.forEach(signal => {
        tickers.push(signal.ticker)
      })
    })

    return tickers
  }, [signalsBySector, openSectors, selectedWatchlist])

  // Get all tickers for navigation (complete sorted list, not just expanded sectors)
  const allTickersForNavigation = React.useMemo(() => {
    const tickers: string[] = []
    // Sort sectors in the same order as displayed
    const sortedSectors = Object.keys(signalsBySector).sort((a, b) => {
      // MAJOR_CRYPTO goes first for CRYPTO watchlist
      if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
        if (a === 'MAJOR_CRYPTO') return -1
        if (b === 'MAJOR_CRYPTO') return 1
      }

      const priorityA = PRIORITY_GROUPS.indexOf(a as any)
      const priorityB = PRIORITY_GROUPS.indexOf(b as any)

      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB
      }
      if (priorityA !== -1) return -1
      if (priorityB !== -1) return 1

      return a.localeCompare(b)
    })

    // Collect tickers from each sector (including collapsed ones)
    sortedSectors.forEach(sector => {
      const sectorSignals = signalsBySector[sector]
      if (!sectorSignals) return

      sectorSignals.forEach(signal => {
        tickers.push(signal.ticker)
      })
    })

    return tickers
  }, [filteredSignals, selectedWatchlist])

  // Find current ticker index in the list
  const currentTickerIndex = React.useMemo(() => {
    if (!dialogTicker) return 0
    const index = allTickersForNavigation.indexOf(dialogTicker)
    return index !== -1 ? index : 0
  }, [dialogTicker, allTickersForNavigation])

  // Event handlers
  const handleWatchlistChange = (value: string) => {
    setSelectedWatchlist(value)
  }

  const handleSignalClick = (signal: TrendSignalData) => {
    setDialogTicker(signal.ticker)
    // Title generation now handled by callback
  }

  const handleCloseDialog = () => {
    setDialogTicker(null)
  }

  // getTitle callback for ChartFullscreenDialog
  const getChartTitle = React.useCallback((ticker: string): string => {
    // Find the signal data for this ticker
    const signal = signals.find(s => s.ticker === ticker)

    if (!signal) {
      // No signal data available, return just the ticker
      return ticker
    }

    // Create custom title with signal reason (similar to row display)
    let customTitle = signal.ticker
    if (signal.signal && signal.strength !== undefined && signal.strength !== null) {
      if (signal.signal === 'BUY' && signal.previousHigh) {
        customTitle += ` - ${t('common.trendSignal.above', {
          price: signal.previousHigh.toLocaleString()
        })} ${Math.abs(signal.strength).toFixed(1)}%`
      } else if (signal.signal === 'SELL' && signal.previousLow) {
        customTitle += ` - ${t('common.trendSignal.below', {
          price: signal.previousLow.toLocaleString()
        })} ${Math.abs(signal.strength).toFixed(1)}%`
      }
    }

    return customTitle
  }, [signals, t])

  // Auto-expand all sectors when:
  // 1. Viewing predefined watchlists (VN30, VINGROUP) OR
  // 2. There are fewer than AUTO_EXPAND_SECTOR_THRESHOLD sectors
  // This does NOT save to localStorage (handled in the save effect above)
  React.useEffect(() => {
    if (filteredSignals.length === 0) return

    const allSectorsInView = new Set(filteredSignals.map(s => s.sector))

    if (allSectorsInView.size > 0) {
      const shouldExpandAll =
        isPredefinedWatchlist(selectedWatchlist) ||
        allSectorsInView.size < AUTO_EXPAND_SECTOR_THRESHOLD

      if (shouldExpandAll) {
        setOpenSectors(new Set(allSectorsInView))
      }
    }
  }, [selectedWatchlist, filteredSignals])

  const toggleSector = (sector: string) => {
    setOpenSectors((prev) => {
      const next = new Set(prev)
      if (next.has(sector)) {
        next.delete(sector)
      } else {
        next.add(sector)
      }
      return next
    })
  }

  const expandAllSectors = () => {
    const allSectors = new Set(signals.map(s => s.sector))
    setOpenSectors(allSectors)
  }

  const collapseAllSectors = () => {
    setOpenSectors(new Set())
  }

  if (apiLoading) {
    return (
      <div className="p-8 text-center">
        <p>Loading market data...</p>
      </div>
    )
  }

  return (
    <>
      <div className="p-3 md:p-6">
        <Link to="/signals" className="inline-block">
          <h2 className="text-lg font-semibold hover:text-primary transition-colors cursor-pointer">
            {t('common.trendSignal.title')}
          </h2>
        </Link>

          {/* Control Bar - Row 1: Watchlist, Interval, and Actions */}
          <div className="flex items-center gap-2 mt-4">
            {/* Ticker Group Selector */}
            <TickerGroupSelector
              value={selectedWatchlist}
              onValueChange={handleWatchlistChange}
              className="w-36"
              refreshKey={refreshKey}
            />

            {/* Interval Selector */}
            <div className="flex gap-1">
              {(['1H', '1D'] as const).map((int) => (
                <Button
                  key={int}
                  variant={interval === int ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInterval(int)}
                  className={`h-8 px-3 ${
                    interval === int
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : ''
                  }`}
                >
                  {int}
                </Button>
              ))}
            </div>

            {/* Spacer to push actions to the right */}
            <div className="flex-1"></div>

            {/* Sector Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={expandAllSectors}>
                  {t('common.matrix.expandAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={collapseAllSectors}>
                  {t('common.matrix.collapseAll')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Control Bar - Row 2: Buy and Sell Period Selectors */}
          <div className="flex items-center gap-2 mt-2">
            {/* Buy Period Selector */}
            <Select value={buyPeriod.toString()} onValueChange={(v) => setBuyPeriod(parseInt(v))}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25, 30].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {t('common.trendSignal.buy')}: {t('common.trendSignal.peak')} {n} {interval === '1D' ? t('common.trendSignal.days') : t('common.trendSignal.hours')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sell Period Selector */}
            <Select value={sellPeriod.toString()} onValueChange={(v) => setSellPeriod(parseInt(v))}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {t('common.trendSignal.sell')}: {t('common.trendSignal.bottom')} {n} {interval === '1D' ? t('common.trendSignal.days') : t('common.trendSignal.hours')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Control Bar - Row 3: Show All checkbox */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-all"
                checked={showAll}
                onCheckedChange={(checked) => setShowAll(checked as boolean)}
              />
              <label
                htmlFor="show-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t('common.trendSignal.showAll')}
              </label>
            </div>
          </div>

          {/* Sort Buttons */}
          <div className="grid grid-cols-3 gap-1.5 mt-3 shrink-0">
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
              onClick={() => setSortBy('value')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'value'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('dialogs.selectTicker.sortBy.value')}
            </button>
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
        </div>

        <div className="px-3 md:px-6">
          {/* Signal Statistics Summary Cards */}
          {!loading && !error && signals.length > 0 && (
            <div className="mt-4 mb-4">
  
              {/* Signal Distribution Bar */}
              <TrendSignalDistribution
                distribution={signalDistribution}
                totalSignals={signals.length}
              />

                </div>
          )}
          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('common.trendSignal.loadingSignals')}</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">{t('common.trendSignal.failedToLoad')}</p>
            </div>
          )}

          {!loading && !error && (
            <div>
              {signals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.trendSignal.noTickers')}
                </div>
              )}

              {/* Group signals by sector */}
              {Object.entries(signalsBySector)
                .sort((a, b) => {
                  const [sectorA] = a
                  const [sectorB] = b

                  // MAJOR_CRYPTO goes first for CRYPTO watchlist
                  if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
                    if (sectorA === 'MAJOR_CRYPTO') return -1
                    if (sectorB === 'MAJOR_CRYPTO') return 1
                  }

                  const priorityA = PRIORITY_GROUPS.indexOf(sectorA as any)
                  const priorityB = PRIORITY_GROUPS.indexOf(sectorB as any)

                  if (priorityA !== -1 && priorityB !== -1) {
                    return priorityA - priorityB
                  }
                  if (priorityA !== -1) return -1
                  if (priorityB !== -1) return 1

                  return sectorA.localeCompare(sectorB)
                })
                .map(([sector, sectorSignals]) => {
                  const isCollapsed = !openSectors.has(sector)
                  return (
                    <div key={sector}>
                      {/* Sector Header */}
                      <div className="bg-primary/20 px-4 py-2 font-semibold text-primary text-xs flex items-center border-b border-primary/30">
                        <button
                          onClick={() => toggleSector(sector)}
                          className="flex items-center gap-1 hover:bg-primary/30 rounded px-1 transition-colors w-full"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate flex-1 text-left font-semibold text-sm">
                            {getSectorDisplayName(sector, language)}
                          </span>
                          <div className="flex items-center gap-3 font-mono text-xs">
                            {(() => {
                              const buyCount = sectorSignals.filter(s => s.signal === 'BUY').length
                              const sellCount = sectorSignals.filter(s => s.signal === 'SELL').length
                              return (
                                <>
                                  {buyCount > 0 && (
                                    <div className="flex items-center gap-1">
                                      <ChevronUp className="h-3 w-3 text-green-600" />
                                      <span className="w-2 text-right">{buyCount}</span>
                                    </div>
                                  )}
                                  {sellCount > 0 && (
                                    <div className="flex items-center gap-1">
                                      <ChevronDown className="h-3 w-3 text-red-600" />
                                      <span className="w-2 text-right">{sellCount}</span>
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </button>
                      </div>

                      {/* Signal rows for this sector */}
                      {!isCollapsed && sectorSignals.map((signal) => (
                      <div
                        key={signal.ticker}
                        onClick={() => handleSignalClick(signal)}
                        className="flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 cursor-pointer"
                      >
                        {/* Left side: Minimal ticker and signal */}
                        <div className="flex items-center gap-2 flex-shrink-0 w-24">
                          <span className="font-mono font-bold text-sm">{signal.ticker}</span>
                          {signal.signal && (
                            <span className={`px-1.5 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${
                              signal.signal === 'BUY'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {signal.signal === 'BUY' ? t('common.trendSignal.buy') : t('common.trendSignal.sell')}
                            </span>
                          )}
                          {!signal.signal && (
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 flex-shrink-0">
                              {t('common.trendSignal.none')}
                            </span>
                          )}
                        </div>

                        {/* Right side: Details using full remaining space */}
                        <div className="flex-1 pl-4">
                          {/* Line 1: Current record (last price and change) */}
                          <div className="flex items-baseline gap-3 text-sm">
                            <span className="font-mono font-medium">
                              {signal.currentPrice.toLocaleString()}
                            </span>
                            {signal.closeChange !== undefined && signal.closeChange !== null && (
                              <span className={`text-xs font-medium ${
                                signal.closeChange >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {signal.closeChange >= 0 ? '+' : ''}{signal.closeChange.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          {/* Line 2: High and Low reference levels */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            {signal.highest20 && (
                              <span className="text-green-700 dark:text-green-400">
                                {t('common.trendSignal.highest', { period: buyPeriod })}: {signal.highest20.toLocaleString()}
                                {signal.currentPrice > signal.highest20 && <span className="ml-1">▲</span>}
                              </span>
                            )}
                            {signal.lowest10 && (
                              <span className="text-red-700 dark:text-red-400">
                                {t('common.trendSignal.lowest', { period: sellPeriod })}: {signal.lowest10.toLocaleString()}
                                {signal.currentPrice < signal.lowest10 && <span className="ml-1">▼</span>}
                              </span>
                            )}
                          </div>

                          {/* Line 3: Signal reason */}
                          {signal.signal && signal.strength !== undefined && signal.strength !== null && (
                            <div className={`text-xs mt-1 ${
                              signal.signal === 'BUY' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {t(`common.trendSignal.${signal.signal === 'BUY' ? 'above' : 'below'}`, {
                                price: signal.signal === 'BUY'
                                  ? signal.previousHigh?.toLocaleString()
                                  : signal.previousLow?.toLocaleString()
                              })} {Math.abs(signal.strength).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                      </div>
                    )
                  })}
            </div>
          )}
      </div>

      {/* Chart Dialog */}
      <ChartFullscreenDialog
        ticker={dialogTicker}
        onClose={handleCloseDialog}
        tickerList={allTickersForNavigation}
        currentIndex={currentTickerIndex}
        getTitle={getChartTitle}
      />
    </>
  )
}