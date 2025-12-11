import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { type StockData } from '@/lib/api-client'
import {
  ALL_WATCHLIST_NAME,
  CRYPTO_WATCHLIST_NAME,
  MARKET_INDICES,
  MATRIX_DAYS_PER_PAGE,
  PRIORITY_GROUPS,
  TRENDSIGNAL_OPEN_SECTORS_STORAGE_KEY,
} from '@/lib/constants'
import { formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ChartFullscreenDialog } from './ChartFullscreenDialog'
import { getWatchlistNames, getWatchlistTickers } from '@/lib/watchlist-storage'
import {
  getPredefinedWatchlistTickers,
  isPredefinedWatchlist
} from '@/lib/predefined-watchlists'
import { format } from 'date-fns'

// Default sectors to show expanded (matches PRIORITY_GROUPS)
const DEFAULT_OPEN_SECTORS = ['NGAN_HANG', 'CHUNG_KHOAN', 'BAT_DONG_SAN', 'XAY_DUNG', 'THEP', 'BAN_LE']

// Auto-expand threshold: expand all sectors if total sectors is below this number
const AUTO_EXPAND_SECTOR_THRESHOLD = 3

type SignalType = 'BUY' | 'SELL' | null
type IntervalType = '1H' | '1D'

interface TrendSignalData {
  ticker: string
  signal: SignalType
  signalDate?: string
  breakoutPrice?: number
  previousHigh?: number // For BUY signals
  previousLow?: number // For SELL signals
  strength?: number
  sector: string
  currentPrice: number
  closeChange?: number
  highest20?: number // Highest close in last 20 periods
  lowest10?: number // Lowest close in last 10 periods
}

interface TrendSignalProps {
  defaultWatchlist?: string
  defaultInterval?: IntervalType
  defaultBuyPeriod?: number
  defaultSellPeriod?: number
}

// Signal detection algorithm
function detectSignal(
  data: StockData[],
  buyPeriod: number,
  sellPeriod: number
): { signal: SignalType; strength: number; previousHigh?: number; previousLow?: number } {
  const minLength = Math.max(buyPeriod, sellPeriod) + 1
  if (data.length < minLength) {
    return { signal: null, strength: 0 }
  }

  const latest = data[data.length - 1]
  const historical = data.slice(0, -1)

  // Check BUY signal
  if (historical.length >= buyPeriod) {
    const lastNBars = historical.slice(-buyPeriod)
    const highestClose = Math.max(...lastNBars.map(d => d.close))

    if (latest.close > highestClose) {
      const strength = ((latest.close - highestClose) / highestClose) * 100
      return {
        signal: 'BUY',
        strength,
        previousHigh: highestClose
      }
    }
  }

  // Check SELL signal
  if (historical.length >= sellPeriod) {
    const lastNBars = historical.slice(-sellPeriod)
    const lowestClose = Math.min(...lastNBars.map(d => d.close))

    if (latest.close < lowestClose) {
      const strength = ((latest.close - lowestClose) / lowestClose) * 100
      return {
        signal: 'SELL',
        strength,
        previousLow: lowestClose
      }
    }
  }

  return { signal: null, strength: 0 }
}

// Get ticker sector (reusing logic from MarketMatrix)
function getTickerSector(ticker: string, tickerGroups: Record<string, string[]> | null, cryptoTickerGroups: Record<string, string[]> | null): string {
  // Check crypto groups first
  if (cryptoTickerGroups) {
    for (const [sector, symbols] of Object.entries(cryptoTickerGroups)) {
      if (symbols.includes(ticker)) {
        return sector
      }
    }
  }

  // Check regular ticker groups
  if (tickerGroups) {
    for (const [sector, symbols] of Object.entries(tickerGroups)) {
      if (symbols.includes(ticker)) {
        return sector
      }
    }
  }

  return 'Unknown'
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
  const [signals, setSignals] = React.useState<TrendSignalData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, _setRefreshKey] = React.useState(0)

  // Dialog state for chart viewing
  const [dialogTicker, setDialogTicker] = React.useState<string | null>(null)
  const [dialogEndDate, setDialogEndDate] = React.useState<string | null>(null)

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

  // Get tickers for selected watchlist (reuse logic from MarketMatrix)
  const selectedTickers = React.useMemo(() => {
    if (!tickerGroups) return []

    if (selectedWatchlist === ALL_WATCHLIST_NAME) {
      // Get all tickers from all sectors (excluding market indices like VNINDEX, VN30)
      const allTickers: string[] = []
      Object.entries(tickerGroups).forEach(([sector, symbols]) => {
        if (!MARKET_INDICES.includes(sector as any)) {
          allTickers.push(...symbols)
        }
      })
      return allTickers
    }

    if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
      return cryptoTickers.map(t => t.symbol)
    }

    if (isPredefinedWatchlist(selectedWatchlist)) {
      return getPredefinedWatchlistTickers(selectedWatchlist)
    }

    if (customWatchlists.includes(selectedWatchlist)) {
      return getWatchlistTickers(selectedWatchlist)
    }

    return tickerGroups[selectedWatchlist] || []
  }, [tickerGroups, selectedWatchlist, customWatchlists, cryptoTickers])

  // Split selected tickers into stocks and crypto
  const { stockSymbols, cryptoSymbols, watchlistType } = React.useMemo(() => {
    if (selectedTickers.length === 0) {
      return { stockSymbols: [], cryptoSymbols: [], watchlistType: 'stock' as const }
    }

    const cryptoSymbolSet = new Set(cryptoTickers.map(t => t.symbol))
    const stocks: string[] = []
    const crypto: string[] = []

    selectedTickers.forEach(symbol => {
      if (cryptoSymbolSet.has(symbol)) {
        crypto.push(symbol)
      } else {
        stocks.push(symbol)
      }
    })

    const type =
      selectedWatchlist === ALL_WATCHLIST_NAME ? 'stock' as const :
      selectedWatchlist === CRYPTO_WATCHLIST_NAME ? 'crypto' as const :
      crypto.length > 0 && stocks.length > 0 ? 'mixed' as const :
      crypto.length > 0 ? 'crypto' as const :
      'stock' as const

    return { stockSymbols: stocks, cryptoSymbols: crypto, watchlistType: type }
  }, [selectedTickers, cryptoTickers, selectedWatchlist])

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

        // Process each ticker for signals
        const processedSignals: TrendSignalData[] = []

        for (const ticker of selectedTickers) {
          const data = response[ticker] || []
          const latest = data[data.length - 1]

          if (latest) {
            const detection = detectSignal(data, buyPeriod, sellPeriod)
            const sector = getTickerSector(ticker, tickerGroups, cryptoTickerGroups)

            // Calculate highest buyPeriod and lowest sellPeriod for reference
            let highestBuyPeriod: number | undefined
            let lowestSellPeriod: number | undefined

            if (data.length >= buyPeriod + 1) {
              const lastBuyPeriodCloses = data.slice(-buyPeriod - 1, -1).map(d => d.close)
              highestBuyPeriod = Math.max(...lastBuyPeriodCloses)
            }

            if (data.length >= sellPeriod + 1) {
              const lastSellPeriodCloses = data.slice(-sellPeriod - 1, -1).map(d => d.close)
              lowestSellPeriod = Math.min(...lastSellPeriodCloses)
            }

            processedSignals.push({
              ticker,
              signal: detection.signal,
              signalDate: detection.signal ? formatToVietnamDate(parseUTCISOString(latest.time)) : undefined,
              breakoutPrice: detection.signal ? latest.close : undefined,
              previousHigh: detection.previousHigh,
              previousLow: detection.previousLow,
              strength: detection.strength,
              sector,
              currentPrice: latest.close,
              closeChange: latest.close_changed,
              highest20: highestBuyPeriod,
              lowest10: lowestSellPeriod,
            })
          }
        }

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

  // Group signals by sector
  const signalsBySector = React.useMemo(() => {
    if (filteredSignals.length === 0) return {}

    const grouped: { [sector: string]: TrendSignalData[] } = {}
    filteredSignals.forEach((signal) => {
      if (!grouped[signal.sector]) {
        grouped[signal.sector] = []
      }
      grouped[signal.sector].push(signal)
    })

    // Sort sectors by priority
    const sortedSectors = Object.keys(grouped).sort((a, b) => {
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

    // Sort signals within each sector by strength (signals first)
    sortedSectors.forEach(sector => {
      grouped[sector].sort((a, b) => {
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
    })

    return grouped
  }, [filteredSignals, selectedWatchlist])

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
    setDialogEndDate(signal.signalDate || globalEndDate || format(new Date(), 'yyyy-MM-dd'))
  }

  const handleCloseDialog = () => {
    setDialogTicker(null)
    setDialogEndDate(null)
  }

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
      <Card>
        <CardContent className="p-8 text-center">
          <p>Loading market data...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg font-semibold">{t('common.trendSignal.title')}</CardTitle>

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
              <SelectTrigger className="w-42 h-8">
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
              <SelectTrigger className="w-42 h-8">
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
        </CardHeader>

        <CardContent className="p-0">
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
                          <span className="truncate flex-1 text-left">
                            {sector}
                          </span>
                          <span className="opacity-70 flex-shrink-0">({sectorSignals.length})</span>
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
                              <span className={`text-xs ${
                                signal.closeChange >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({signal.closeChange >= 0 ? '+' : ''}{signal.closeChange.toFixed(1)}%)
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
        </CardContent>
      </Card>

      {/* Chart Dialog */}
      <ChartFullscreenDialog
        ticker={dialogTicker}
        endDate={dialogEndDate}
        onClose={handleCloseDialog}
        tickerList={allTickersForNavigation}
        currentIndex={currentTickerIndex}
      />
    </>
  )
}