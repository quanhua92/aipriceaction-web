import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Repeat, MoreVertical } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { type StockData } from '@/lib/api-client'
import { format, parseISO } from 'date-fns'
import { parseUTCISOString, formatToVietnamDate } from '@/lib/format'
import {
  ALL_WATCHLIST_NAME,
  CRYPTO_WATCHLIST_NAME,
  MAJOR_CRYPTO,
  MARKET_INDICES,
  MATRIX_DAYS_PER_PAGE,
  MATRIX_OPEN_SECTORS_STORAGE_KEY,
  PRIORITY_GROUPS,
  SECTOR_ABBREVIATIONS,
} from '@/lib/constants'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getWatchlistNames, getWatchlistTickers } from '@/lib/watchlist-storage'
import {
  getPredefinedWatchlistTickers,
  isPredefinedWatchlist as checkIsPredefinedWatchlist
} from '@/lib/predefined-watchlists'
import { getSectorDisplayName } from '@/lib/sector-names'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { ChartFullscreenDialog } from './ChartFullscreenDialog'
import type { SortBy } from '@/components/lists/SortableTickerList'
import { useTranslation } from '@/hooks/useTranslation'
import { TickerGroupSelector } from '@/components/TickerGroupSelector'

type ViewMode = 'close_changed' | 'ma20_score'

interface MatrixCell {
  date: string
  value: number
}

interface MatrixRow {
  ticker: string
  sector: string
  cells: MatrixCell[]
  latestData?: StockData
}

interface MatrixData {
  dates: string[] // Sorted descending (newest first)
  rows: MatrixRow[]
}

// Color coding helper (reference scheme)
function getCellColor(value: number): { bg: string; text: string } {
  if (value > 6.5) return { bg: 'bg-purple-500', text: 'text-white' } // Ceiling
  if (value < -6.5) return { bg: 'bg-cyan-500', text: 'text-white' } // Floor
  if (value > 0) return { bg: 'bg-green-500', text: 'text-white' } // Gain
  if (value < 0) return { bg: 'bg-red-500', text: 'text-white' } // Loss
  return { bg: 'bg-gray-200', text: 'text-gray-600' } // No change
}

// Default sectors to show expanded (matches PRIORITY_GROUPS)
const DEFAULT_OPEN_SECTORS = ['NGAN_HANG', 'CHUNG_KHOAN', 'BAT_DONG_SAN', 'XAY_DUNG', 'THEP', 'BAN_LE']

// Auto-expand threshold: expand all sectors if total sectors is below this number
const AUTO_EXPAND_SECTOR_THRESHOLD = 3

interface MarketMatrixProps {
  defaultWatchlist?: string
}

export function MarketMatrix({ defaultWatchlist }: MarketMatrixProps = {}) {
  const { tickerGroups, loading: apiLoading, getTickers, cryptoTickerGroups, cryptoTickers } = useAPI()
  const { lastRefresh } = useRefresh()
  const { endDate: globalEndDate } = useChartSettings()
  const { t, language } = useTranslation()

  // Helper to detect if watchlist contains both stocks and crypto
  const detectWatchlistType = React.useCallback((tickers: string[], cryptoTickersList: { symbol: string; sector: string }[]): 'stock' | 'crypto' | 'mixed' => {
    if (tickers.length === 0) return 'stock'

    const cryptoSymbolSet = new Set(cryptoTickersList.map(t => t.symbol))
    const hasCrypto = tickers.some(symbol => cryptoSymbolSet.has(symbol))
    const hasStock = tickers.some(symbol => !cryptoSymbolSet.has(symbol))

    if (hasCrypto && hasStock) return 'mixed'
    if (hasCrypto) return 'crypto'
    return 'stock'
  }, [])

  // State management - simple defaults, no localStorage
  const [selectedWatchlist, setSelectedWatchlist] = React.useState<string>(
    defaultWatchlist ?? ALL_WATCHLIST_NAME
  )
  const [viewMode, setViewMode] = React.useState<ViewMode>('close_changed')
  const [currentPage, setCurrentPage] = React.useState<number>(0)
  const [sortBy, setSortBy] = React.useState<SortBy>('gainers')
  const [openSectors, setOpenSectors] = React.useState<Set<string>>(() => {
    // Try to load from localStorage (only on client)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(MATRIX_OPEN_SECTORS_STORAGE_KEY)
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

  const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([])
  const [refreshKey, _setRefreshKey] = React.useState(0)
  const [matrixData, setMatrixData] = React.useState<MatrixData | null>(null)
  const [sortReferenceData, setSortReferenceData] = React.useState<Record<string, StockData>>({})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state
  const [dialogTicker, setDialogTicker] = React.useState<string | null>(null)
  const [dialogEndDate, setDialogEndDate] = React.useState<string | null>(null)

  // Load custom watchlists
  React.useEffect(() => {
    setCustomWatchlists(getWatchlistNames())
  }, [refreshKey])

  // Save open sectors to localStorage whenever they change (client-side only)
  // BUT: Don't save when viewing predefined watchlists OR small watchlists
  React.useEffect(() => {
    // Skip saving if viewing predefined watchlist (VN30, VINGROUP)
    if (checkIsPredefinedWatchlist(selectedWatchlist)) {
      return
    }

    // Count unique sectors from matrixData (if available)
    // For small watchlists (< AUTO_EXPAND_SECTOR_THRESHOLD), don't persist to localStorage
    if (matrixData) {
      const uniqueSectors = new Set(matrixData.rows.map(row => row.sector))
      if (uniqueSectors.size < AUTO_EXPAND_SECTOR_THRESHOLD) {
        return
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MATRIX_OPEN_SECTORS_STORAGE_KEY, JSON.stringify(Array.from(openSectors)))
      } catch (error) {
        console.error('Failed to save open sectors to localStorage:', error)
      }
    }
  }, [openSectors, selectedWatchlist, matrixData])

  // Get tickers for selected watchlist
  const selectedTickers = React.useMemo(() => {
    if (!tickerGroups) return []

    if (selectedWatchlist === ALL_WATCHLIST_NAME) {
      // Get all tickers from all sectors
      const allTickers: string[] = []
      Object.entries(tickerGroups).forEach(([sector, symbols]) => {
        if (!MARKET_INDICES.includes(sector as any)) {
          allTickers.push(...symbols)
        }
      })
      return allTickers
    }

    // Check if CRYPTO watchlist
    if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
      // Return all crypto ticker symbols
      return cryptoTickers.map(t => t.symbol)
    }

    // Check if predefined watchlist
    if (checkIsPredefinedWatchlist(selectedWatchlist)) {
      return getPredefinedWatchlistTickers(selectedWatchlist)
    }

    // Check if custom watchlist
    if (customWatchlists.includes(selectedWatchlist)) {
      return getWatchlistTickers(selectedWatchlist)
    }

    // Regular sector group
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

    // Determine watchlist type with special case handling
    const type =
      // Special case: ALL watchlist is always stock-only (doesn't include crypto from APIContext)
      selectedWatchlist === ALL_WATCHLIST_NAME ? 'stock' as const :
      // Special case: CRYPTO watchlist is always crypto-only
      selectedWatchlist === CRYPTO_WATCHLIST_NAME ? 'crypto' as const :
      // For other watchlists (custom/predefined/sectors), detect based on actual symbols
      detectWatchlistType(selectedTickers, cryptoTickers)

    return { stockSymbols: stocks, cryptoSymbols: crypto, watchlistType: type }
  }, [selectedTickers, cryptoTickers, detectWatchlistType, selectedWatchlist])

  // Fetch matrix data
  React.useEffect(() => {
    if (selectedTickers.length === 0) {
      setMatrixData(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Calculate end_date for API: use globalEndDate (or today) for page 0, or oldest date from previous page
        const endDateForAPI =
          currentPage === 0
            ? globalEndDate || format(new Date(), 'yyyy-MM-dd')
            : matrixData?.dates[matrixData.dates.length - 1] || globalEndDate || format(new Date(), 'yyyy-MM-dd')

        // Determine if this is a mixed, crypto-only, or stock-only watchlist
        const isMixed = watchlistType === 'mixed'
        const isCryptoOnly = watchlistType === 'crypto' || selectedWatchlist === CRYPTO_WATCHLIST_NAME
        const isStockOnly = watchlistType === 'stock'

        // Fetch ticker data - make separate calls for mixed watchlists
        let stockResponse: Record<string, StockData[]> = {}
        let cryptoResponse: Record<string, StockData[]> = {}

        if (isMixed) {
          // Two parallel API calls for mixed watchlist
          const [stocks, crypto] = await Promise.all([
            stockSymbols.length > 0
              ? getTickers('MarketMatrix.data.stocks', {
                  symbol: ['VNINDEX', ...stockSymbols],
                  interval: '1D',
                  end_date: endDateForAPI,
                  limit: MATRIX_DAYS_PER_PAGE,
                  mode: 'vn',
                })
              : Promise.resolve({}),
            cryptoSymbols.length > 0
              ? getTickers('MarketMatrix.data.crypto', {
                  symbol: ['BTC', ...cryptoSymbols],
                  interval: '1D',
                  end_date: endDateForAPI,
                  limit: MATRIX_DAYS_PER_PAGE,
                  mode: 'crypto',
                })
              : Promise.resolve({}),
          ])
          stockResponse = stocks
          cryptoResponse = crypto
        } else if (isCryptoOnly) {
          // Single crypto call
          cryptoResponse = await getTickers('MarketMatrix.data.crypto', {
            symbol: selectedTickers,
            interval: '1D',
            end_date: endDateForAPI,
            limit: MATRIX_DAYS_PER_PAGE,
            mode: 'crypto',
          })
        } else {
          // Single stock call (existing behavior)
          // Optimization: When "ALL" watchlist is selected, omit symbol parameter
          // to avoid super long URLs with hundreds of ticker symbols
          stockResponse = await getTickers('MarketMatrix.data.stocks', {
            symbol:
              selectedWatchlist === ALL_WATCHLIST_NAME
                ? undefined
                : ['VNINDEX', ...selectedTickers],
            interval: '1D',
            end_date: endDateForAPI,
            limit: MATRIX_DAYS_PER_PAGE,
            mode: 'vn',
          })
        }

        // Merge responses
        const response = { ...stockResponse, ...cryptoResponse }

        // Extract dates from reference ticker
        // For mixed/crypto watchlists: use BTC (crypto calendar, 24/7)
        // For stock-only watchlists: use VNINDEX (trading days only)
        let dates: string[] = []

        if (isMixed || isCryptoOnly) {
          // Use BTC as calendar reference for crypto-containing watchlists
          const btcData = response['BTC'] || []
          dates = btcData
            .map((point) => formatToVietnamDate(parseUTCISOString(point.time)))
            .sort((a, b) => b.localeCompare(a)) // Newest first
        } else {
          // Use VNINDEX as trading day calendar for stock-only watchlists
          const vnindexData = response['VNINDEX'] || []
          dates = vnindexData
            .map((point) => formatToVietnamDate(parseUTCISOString(point.time)))
            .sort((a, b) => b.localeCompare(a)) // Newest first
        }

        if (dates.length === 0) {
          setError('No market data available')
          return
        }

        // Group tickers by sector
        const tickersBySector: { [sector: string]: string[] } = {}
        selectedTickers.forEach((ticker) => {
          let sector = 'Unknown'

          // Find sector for this ticker
          if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
            // Check if this is a major crypto first (BTC, ETH, XRP, TON)
            if (MAJOR_CRYPTO.includes(ticker as any)) {
              sector = 'MAJOR_CRYPTO'
            } else if (cryptoTickerGroups) {
              // Use cryptoTickerGroups for other crypto
              for (const [sectorName, symbols] of Object.entries(cryptoTickerGroups)) {
                if (symbols.includes(ticker)) {
                  sector = sectorName
                  break
                }
              }
            }
          } else {
            // Use regular tickerGroups for stocks
            if (tickerGroups) {
              for (const [sectorName, symbols] of Object.entries(tickerGroups)) {
                if (symbols.includes(ticker)) {
                  sector = sectorName
                  break
                }
              }
            }
          }

          if (!tickersBySector[sector]) {
            tickersBySector[sector] = []
          }
          tickersBySector[sector].push(ticker)
        })

        // Create matrix rows
        const rows: MatrixRow[] = []

        // Sort sectors by priority
        const sortedSectors = Object.keys(tickersBySector).sort((a, b) => {
          const priorityA = PRIORITY_GROUPS.indexOf(a as any)
          const priorityB = PRIORITY_GROUPS.indexOf(b as any)

          if (priorityA !== -1 && priorityB !== -1) {
            return priorityA - priorityB
          }
          if (priorityA !== -1) return -1
          if (priorityB !== -1) return 1

          return a.localeCompare(b)
        })

        // Build rows grouped by sector
        const newSortReferenceData: Record<string, StockData> = {}

        for (const sector of sortedSectors) {
          const sectorTickers = tickersBySector[sector]

          for (const ticker of sectorTickers) {
            const tickerData = response[ticker] || []
            const latestData = tickerData[tickerData.length - 1]

            const cells: MatrixCell[] = dates.map((date) => {
              const point = tickerData.find((d) => formatToVietnamDate(parseUTCISOString(d.time)) === date)

              let value = 0
              if (point) {
                if (viewMode === 'close_changed') {
                  value = point.close_changed ?? 0
                } else {
                  value = point.ma20_score ?? 0
                }
              }

              return { date, value }
            })

            rows.push({ ticker, sector, cells, latestData })

            // Store reference data from page 0 for consistent sorting
            if (currentPage === 0 && latestData) {
              newSortReferenceData[ticker] = latestData
            }
          }
        }

        setMatrixData({ dates, rows })

        // Update sort reference data only on page 0
        if (currentPage === 0) {
          setSortReferenceData(newSortReferenceData)
        }
      } catch (err) {
        console.error('Failed to fetch matrix data:', err)
        setError('Failed to load matrix data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTickers, stockSymbols, cryptoSymbols, watchlistType, currentPage, viewMode, tickerGroups, cryptoTickerGroups, cryptoTickers, lastRefresh, globalEndDate])

  // Group rows by sector and sort within each sector
  const rowsBySector = React.useMemo(() => {
    if (!matrixData) return {}

    const grouped: { [sector: string]: MatrixRow[] } = {}
    matrixData.rows.forEach((row) => {
      if (!grouped[row.sector]) {
        grouped[row.sector] = []
      }
      grouped[row.sector].push(row)
    })

    // Sort rows within each sector based on sortBy
    Object.keys(grouped).forEach((sector) => {
      grouped[sector].sort((a, b) => {
        // Use sortReferenceData (from page 0) for consistent sorting across pages
        const aData = sortReferenceData[a.ticker] || a.latestData
        const bData = sortReferenceData[b.ticker] || b.latestData

        switch (sortBy) {
          case 'az':
            return a.ticker.localeCompare(b.ticker)

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

          case 'value':
            // Sort by value descending (highest traded value first)
            const aValue = (aData?.close ?? 0) * (aData?.volume ?? 0)
            const bValue = (bData?.close ?? 0) * (bData?.volume ?? 0)
            return bValue - aValue

          default:
            return 0
        }
      })
    })

    return grouped
  }, [matrixData, sortBy, sortReferenceData])

  // Get all tickers in current view for navigation
  const allTickersInView = React.useMemo(() => {
    const tickers: string[] = []
    // Sort sectors in the same order as displayed in the matrix
    const sortedSectors = Object.keys(rowsBySector).sort((a, b) => {
      // MAJOR_CRYPTO goes first for CRYPTO watchlist
      if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
        if (a === 'MAJOR_CRYPTO') return -1
        if (b === 'MAJOR_CRYPTO') return 1
      }

      const priorityA = PRIORITY_GROUPS.indexOf(a as any)
      const priorityB = PRIORITY_GROUPS.indexOf(b as any)

      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB
      } else if (priorityA !== -1) {
        return -1
      } else if (priorityB !== -1) {
        return 1
      }
      return a.localeCompare(b)
    })

    // Collect tickers from each sector
    sortedSectors.forEach(sector => {
      const sectorRows = rowsBySector[sector]
      if (!openSectors.has(sector)) return // Skip collapsed sectors

      sectorRows.forEach(row => {
        tickers.push(row.ticker)
      })
    })

    return tickers
  }, [rowsBySector, openSectors, selectedWatchlist])

  // Find current ticker index in the list
  const currentTickerIndex = React.useMemo(() => {
    if (!dialogTicker) return 0
    const index = allTickersInView.indexOf(dialogTicker)
    return index !== -1 ? index : 0
  }, [dialogTicker, allTickersInView])

  // Auto-expand all sectors when:
  // 1. Viewing predefined watchlists (VN30, VINGROUP) OR
  // 2. There are fewer than AUTO_EXPAND_SECTOR_THRESHOLD sectors
  // This does NOT save to localStorage (handled in the save effect above)
  React.useEffect(() => {
    const allSectorsInView = Object.keys(rowsBySector)

    if (allSectorsInView.length > 0) {
      const shouldExpandAll =
        checkIsPredefinedWatchlist(selectedWatchlist) ||
        allSectorsInView.length < AUTO_EXPAND_SECTOR_THRESHOLD

      if (shouldExpandAll) {
        setOpenSectors(new Set(allSectorsInView))
      }
    }
  }, [selectedWatchlist, rowsBySector])

  // Event handlers
  const handleWatchlistChange = (value: string) => {
    setSelectedWatchlist(value)
    setCurrentPage(0) // Reset to first page
  }

  const handleViewModeToggle = () => {
    setViewMode((prev) => (prev === 'close_changed' ? 'ma20_score' : 'close_changed'))
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1)
  }

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
    const allSectors = Object.keys(rowsBySector)
    setOpenSectors(new Set(allSectors))
  }

  const collapseAllSectors = () => {
    setOpenSectors(new Set())
  }

  const handleCellClick = (ticker: string) => {
    if (!matrixData) return

    setDialogTicker(ticker)
    // Use latest date from matrix as end date; chart will fetch 128 days backward
    setDialogEndDate(matrixData.dates[0])
  }

  const handleCloseDialog = () => {
    setDialogTicker(null)
    setDialogEndDate(null)
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
          <h2 className="text-lg font-semibold">Market Matrix</h2>

        {/* Control Bar - Row 1: Watchlist, View Mode, and Actions */}
        <div className="flex items-center gap-2 mt-4">
          {/* Watchlist Selector */}
          <TickerGroupSelector
            value={selectedWatchlist}
            onValueChange={handleWatchlistChange}
            placeholder="Select watchlist"
            className="w-36"
            refreshKey={refreshKey}
          />

          {/* View Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewModeToggle}
            className="flex items-center gap-1 h-8 px-3"
            title={`Switch to ${viewMode === 'close_changed' ? 'MA20 Score' : 'Close Change'}`}
          >
            <Repeat className="h-3 w-3" />
            <span className="text-xs font-medium">
              {viewMode === 'close_changed' ? 'CLOSE %' : 'MA20'}
            </span>
          </Button>

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

          {/* Date Range Info */}
          {matrixData && (
            <div className="text-xs text-muted-foreground mt-2">
              {matrixData.dates[matrixData.dates.length - 1]} to {matrixData.dates[0]} ({matrixData.dates.length} trading days)
            </div>
          )}

          {/* Pagination Controls - Above Matrix */}
          {!loading && !error && matrixData && (
            <div className="flex items-center justify-center gap-2 mt-4 pb-3 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 0}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="px-4 py-1 text-sm font-medium bg-muted rounded-md min-w-[100px] text-center">
                {currentPage + 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                className="h-8 px-3"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        <div className="px-0">
          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && matrixData && (
            <div className="flex">
              {/* Fixed Left Column - Ticker Symbols */}
              <div className="w-[100px] min-w-[100px] flex-shrink-0 border-r border-border">
                {/* Header */}
                <div className="bg-muted/50 text-center px-2 py-2 font-semibold border-b border-border h-[40px] flex items-center justify-center text-xs">
                  Ticker
                </div>

                {/* Sector rows */}
                {Object.keys(rowsBySector)
                  .sort((a, b) => {
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
                  .map((sector) => {
                    const sectorRows = rowsBySector[sector]
                    const isCollapsed = !openSectors.has(sector)

                    return (
                      <div key={sector}>
                        {/* Sector Header */}
                        <div className="bg-primary/20 px-2 py-2 font-semibold text-primary text-xs flex items-center border-b border-primary/30 h-[36px]">
                          <button
                            onClick={() => toggleSector(sector)}
                            className="flex items-center gap-1 hover:bg-primary/30 rounded px-1 transition-colors w-full"
                            title={getSectorDisplayName(sector, language)}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="truncate flex-1 text-left">
                              {SECTOR_ABBREVIATIONS[sector] || sector.slice(0, 4)}
                            </span>
                            <span className="opacity-70 flex-shrink-0">({sectorRows.length})</span>
                          </button>
                        </div>

                        {/* Ticker rows */}
                        {!isCollapsed &&
                          sectorRows.map((row) => (
                            <div
                              key={row.ticker}
                              className="bg-white px-2 py-2 border-b border-border hover:bg-muted/10 h-[36px] flex items-center justify-center"
                            >
                              <span className="font-mono font-semibold text-xs truncate">
                                {row.ticker}
                              </span>
                            </div>
                          ))}
                      </div>
                    )
                  })}
              </div>

              {/* Scrollable Right Column - Data Cells */}
              <div className="flex-1 overflow-x-auto">
                {/* Header row */}
                <div className="flex bg-muted/50 border-b border-border h-[40px]">
                  {matrixData.dates.map((date) => {
                    try {
                      return (
                        <div
                          key={date}
                          className="w-[60px] min-w-[60px] flex-shrink-0 px-1 py-2 font-semibold text-xs flex items-center justify-center"
                        >
                          {format(parseISO(date), 'MMM d')}
                        </div>
                      )
                    } catch (error) {
                      // Fallback for invalid dates
                      console.error('Invalid date format:', date, error)
                      return (
                        <div
                          key={date}
                          className="w-[60px] min-w-[60px] flex-shrink-0 px-1 py-2 font-semibold text-xs flex items-center justify-center"
                        >
                          {date}
                        </div>
                      )
                    }
                  })}
                </div>

                {/* Data rows */}
                {Object.keys(rowsBySector)
                  .sort((a, b) => {
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
                  .map((sector) => {
                    const sectorRows = rowsBySector[sector]
                    const isCollapsed = !openSectors.has(sector)

                    return (
                      <div key={sector}>
                        {/* Sector Header Row */}
                        <div className="flex bg-primary/20 h-[36px]">
                          {matrixData.dates.map((date) => (
                            <div
                              key={date}
                              className="w-[60px] min-w-[60px] flex-shrink-0 border-r border-primary/30"
                            />
                          ))}
                        </div>

                        {/* Data rows for tickers */}
                        {!isCollapsed &&
                          sectorRows.map((row) => (
                            <div key={row.ticker} className="flex hover:bg-muted/10 h-[36px]">
                              {row.cells.map((cell) => {
                                const colors = getCellColor(cell.value)
                                const displayValue =
                                  Math.abs(cell.value ?? 0) >= 0.1
                                    ? (cell.value ?? 0).toFixed(1) + '%'
                                    : '-'

                                return (
                                  <div
                                    key={cell.date}
                                    onClick={() => handleCellClick(row.ticker)}
                                    className={`w-[60px] min-w-[60px] flex-shrink-0 px-1 py-2 text-xs font-semibold flex items-center justify-center cursor-pointer border-r border-border hover:ring-2 hover:ring-blue-300 hover:ring-opacity-50 ${colors.bg} ${colors.text}`}
                                    title={`${row.ticker} - ${cell.date}\n${viewMode === 'close_changed' ? 'Close Change' : 'MA20 Score'}: ${(cell.value ?? 0).toFixed(2)}%`}
                                  >
                                    {displayValue}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {!loading && !error && !matrixData && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}

          {/* Pagination Controls - Below Matrix */}
          {!loading && !error && matrixData && (
            <div className="flex items-center justify-center gap-2 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 0}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="px-4 py-1 text-sm font-medium bg-muted rounded-md min-w-[100px] text-center">
                {currentPage + 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                className="h-8 px-3"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
      </div>

      {/* Chart Dialog */}
      <ChartFullscreenDialog
        ticker={dialogTicker}
        endDate={dialogEndDate}
        onClose={handleCloseDialog}
        tickerList={allTickersInView}
        currentIndex={currentTickerIndex}
      />
    </>
  )
}
