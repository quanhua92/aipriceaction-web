import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus, Edit2, Download, Upload } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { usePrefetchTicker } from '@/hooks/usePrefetchTicker'
import { BASIC_WATCHLIST_PREFETCH_COUNT, ALL_WATCHLIST_NAME, CRYPTO_WATCHLIST_NAME, MARKET_INDICES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { SortableTickerList, type Ticker } from './SortableTickerList'
import { CreateWatchListDialog } from '@/components/dialogs/CreateWatchListDialog'
import { EditWatchListDialog } from '@/components/dialogs/EditWatchListDialog'
import { TickerGroupSelector } from '@/components/TickerGroupSelector'
import { PriceDistributionBars } from '@/components/PriceDistributionBars'
import { getWatchlistNames, getWatchlistTickers, getCustomWatchlists } from '@/lib/watchlist-storage'
import {
  getPredefinedWatchlistTickers,
  isPredefinedWatchlist as checkIsPredefinedWatchlist
} from '@/lib/predefined-watchlists'
import { useTranslation } from '@/hooks/useTranslation'
import { useLogs } from '@/contexts/LogsContext'
import { CUSTOM_WATCHLISTS_STORAGE_KEY } from '@/lib/constants'

export interface BasicWatchListProps {
  defaultGroup?: string
  maxHeight?: string
  className?: string
  showMarketIndices?: boolean
  showControls?: boolean
  onSelectTicker?: (symbol: string) => void
  onSectorChange?: (sector: string) => void
  onSortedTickersChange?: (tickers: Ticker[]) => void
}

export function BasicWatchList({
  defaultGroup,
  maxHeight = '300px',
  className = '',
  showMarketIndices = false,
  showControls = false,
  onSelectTicker,
  onSectorChange,
  onSortedTickersChange
}: BasicWatchListProps) {
  const {
    tickerGroups,
    allTickersLastData,
    loading,
    error,
    cryptoTickers,
    cryptoLoading,
    cryptoError,
    allCryptoTickersLastData
  } = useAPI()
  const { prefetchTickers } = usePrefetchTicker()
  const { t } = useTranslation()
  const { info, error: logError } = useLogs()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // State to track custom watchlists and trigger re-renders
  const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([])
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Load custom watchlists from localStorage
  React.useEffect(() => {
    const loadCustomWatchlists = () => {
      const names = getWatchlistNames()
      setCustomWatchlists(names)
    }
    loadCustomWatchlists()
  }, [refreshKey])

  // Track if user has explicitly changed the group
  const [hasUserChangedGroup, setHasUserChangedGroup] = React.useState(false)

  // Set default selected group
  const [selectedGroup, setSelectedGroup] = React.useState<string>(() => {
    if (defaultGroup) {
      return defaultGroup
    }
    return ''
  })

  // Update selected group when groups are loaded or defaultGroup changes
  // But only if user hasn't explicitly changed it
  React.useEffect(() => {
    if (hasUserChangedGroup) {
      // Don't override user's explicit selection
      return
    }

    if (defaultGroup) {
      setSelectedGroup(defaultGroup)
    } else if (!selectedGroup) {
      setSelectedGroup(ALL_WATCHLIST_NAME)
    }
  }, [defaultGroup, hasUserChangedGroup, selectedGroup])

  // Transform ticker group data for SortableTickerList
  const tickers: Ticker[] = React.useMemo(() => {
    if (!selectedGroup) {
      return []
    }

    // Check if this is the ALL watchlist
    if (selectedGroup === ALL_WATCHLIST_NAME) {
      if (!tickerGroups) return []

      // Get all tickers from all sector groups
      // SortableTickerList will handle market indices via marketIndices prop
      const allSectorTickers: Ticker[] = []
      Object.entries(tickerGroups).forEach(([sector, symbols]) => {
        // Skip market indices as they're handled by SortableTickerList
        if (!MARKET_INDICES.includes(sector as any)) {
          symbols.forEach(symbol => {
            allSectorTickers.push({
              symbol,
              sector
            })
          })
        }
      })

      return allSectorTickers
    }

    // Check if this is the CRYPTO watchlist - return empty array for tickers
    // Crypto will be passed separately via cryptoTickers prop to SortableTickerList
    if (selectedGroup === CRYPTO_WATCHLIST_NAME) {
      return []
    }

    // Check if this is a predefined watchlist
    if (checkIsPredefinedWatchlist(selectedGroup)) {
      const watchlistTickers = getPredefinedWatchlistTickers(selectedGroup)
      return watchlistTickers.map(symbol => ({
        symbol,
        sector: selectedGroup
      }))
    }

    // Check if this is a custom watchlist
    if (customWatchlists.includes(selectedGroup)) {
      const watchlistTickers = getWatchlistTickers(selectedGroup)
      // Filter out crypto symbols to prevent duplicates (crypto is passed separately via cryptoTickers prop)
      const cryptoSymbolSet = new Set(cryptoTickers.map(t => t.symbol))
      return watchlistTickers
        .filter(symbol => !cryptoSymbolSet.has(symbol))
        .map(symbol => ({
          symbol,
          sector: selectedGroup
        }))
    }

    // Otherwise, use regular ticker groups
    if (!tickerGroups?.[selectedGroup]) {
      return []
    }

    return tickerGroups[selectedGroup].map(symbol => ({
      symbol,
      sector: selectedGroup
    }))
  }, [selectedGroup, tickerGroups, customWatchlists, refreshKey, cryptoTickers])

  // Calculate price change distribution
  const priceDistribution = React.useMemo(() => {
    // Combine stock and crypto data
    const allData = { ...allTickersLastData, ...allCryptoTickersLastData }

    // Get tickers to check - regular tickers, plus crypto if CRYPTO watchlist is selected
    let tickersToCheck = [...tickers]

    // Add crypto tickers when CRYPTO watchlist is selected (since tickers array is empty for crypto)
    if (selectedGroup === CRYPTO_WATCHLIST_NAME) {
      tickersToCheck = [...cryptoTickers]
    }

    // Get only tickers with price data
    const tickersWithData = tickersToCheck.filter(t => {
      const data = allData[t.symbol]
      return data && data.length > 0 && data[0]?.close_changed !== null && data[0]?.close_changed !== undefined
    })

    // Initialize counters
    const distribution = {
      extremeGains: 0,    // > 6.5%
      normalGains: 0,     // 0% to 6.5%
      neutral: 0,         // exactly 0% (within epsilon)
      normalLosses: 0,    // -6.5% to 0%
      extremeLosses: 0    // < -6.5%
    }

    // Count tickers in each category
    tickersWithData.forEach(ticker => {
      const data = allData[ticker.symbol][0]
      const change = data.close_changed || 0
      const epsilon = 0.01 // Small epsilon for floating point comparison

      if (change > 6.5) {
        distribution.extremeGains++
      } else if (change > epsilon) {
        distribution.normalGains++
      } else if (Math.abs(change) <= epsilon) {
        distribution.neutral++
      } else if (change >= -6.5) {
        distribution.normalLosses++
      } else {
        distribution.extremeLosses++
      }
    })

    return { distribution, totalTickers: tickersWithData.length }
  }, [tickers, cryptoTickers, selectedGroup, allTickersLastData, allCryptoTickersLastData])

  // Navigation state - use sorted tickers from SortableTickerList
  const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([])
  const [currentSelectedIndex, setCurrentSelectedIndex] = React.useState(0)

  // Use a ref to store the latest sorted tickers to avoid dependency issues
  const sortedTickersRef = React.useRef<Ticker[]>([])
  sortedTickersRef.current = sortedTickers

  // Handle sorted tickers change from SortableTickerList
  const handleSortedTickersChange = React.useCallback((newSortedTickers: Ticker[]) => {
    const current = sortedTickersRef.current
    // Only update if the sorted tickers have actually changed
    if (newSortedTickers.length !== current.length ||
        newSortedTickers.some((ticker, index) => ticker.symbol !== current[index]?.symbol)) {
      setSortedTickers(newSortedTickers)
      // Notify parent component if callback is provided
      if (onSortedTickersChange) {
        onSortedTickersChange(newSortedTickers)
      }
    }
  }, [onSortedTickersChange])

  const handleSelectTicker = (symbol: string) => {
    if (onSelectTicker) {
      onSelectTicker(symbol)
    }
    // Update selected index when user clicks on a ticker - use sorted order
    const index = sortedTickers.findIndex(t => t.symbol === symbol)
    if (index !== -1) {
            setCurrentSelectedIndex(index)
    }
  }

  const handleGroupChange = (group: string) => {
    setHasUserChangedGroup(true)
    setSelectedGroup(group)
    if (onSectorChange) {
      onSectorChange(group)
    }
  }

  // Handlers for watchlist operations
  const handleWatchlistCreated = (name: string) => {
    // Update custom watchlists state immediately so it's available for selection
    setCustomWatchlists(prev => [...prev, name])
    setHasUserChangedGroup(true)
    setSelectedGroup(name)
    // Notify parent component about the sector/watchlist change
    if (onSectorChange) {
      onSectorChange(name)
    }
  }

  const handleWatchlistUpdated = () => {
    // Force re-render to pick up the updated tickers from localStorage
    setRefreshKey(prev => prev + 1)
  }

  const handleWatchlistDeleted = () => {
    // Remove from custom watchlists state
    setCustomWatchlists(prev => prev.filter(w => w !== selectedGroup))
    // Select the first available group
    const sectors = tickerGroups ? Object.keys(tickerGroups).filter(group => !MARKET_INDICES.includes(group as any)) : []
    const remainingGroups = [...customWatchlists.filter(w => w !== selectedGroup), ...sectors]
    if (remainingGroups.length > 0) {
      setHasUserChangedGroup(true)
      setSelectedGroup(remainingGroups[0])
      if (onSectorChange) {
        onSectorChange(remainingGroups[0])
      }
    } else {
      setSelectedGroup('')
    }
  }

  // Export watchlists to JSON file
  const handleExport = () => {
    try {
      const customWatchlistsData = getCustomWatchlists()

      const dataStr = JSON.stringify(customWatchlistsData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
      link.download = `watchlists-${timestamp}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const watchlistCount = Object.keys(customWatchlistsData).length
      info('Watchlists', `Exported ${watchlistCount} watchlist${watchlistCount !== 1 ? 's' : ''}`)
    } catch (err) {
      console.error('Export failed:', err)
      logError('Watchlists', 'Failed to export watchlists')
    }
  }

  // Import watchlists from JSON file
  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedWatchlists = JSON.parse(text)

      // Validate structure
      if (typeof importedWatchlists !== 'object' || importedWatchlists === null || Array.isArray(importedWatchlists)) {
        throw new Error('Invalid file format: expected object with watchlist names as keys')
      }

      // Validate all values are strings
      for (const [name, tickers] of Object.entries(importedWatchlists)) {
        if (typeof tickers !== 'string') {
          throw new Error(`Invalid watchlist format: "${name}" should have comma-separated tickers as string`)
        }
      }

      // Get existing watchlists
      const existingWatchlists = {}
      customWatchlists.forEach(name => {
        existingWatchlists[name] = getWatchlistTickers(name)
      })

      const importedNames = Object.keys(importedWatchlists)
      const existingNames = Object.keys(existingWatchlists)

      // Track new vs overwritten counts
      const overwrittenCount = importedNames.filter(name => existingNames.includes(name)).length
      const newCount = importedNames.length - overwrittenCount

      // Merge: existing + imported (imported takes precedence)
      const merged = { ...existingWatchlists, ...importedWatchlists }
      localStorage.setItem(CUSTOM_WATCHLISTS_STORAGE_KEY, JSON.stringify(merged))

      info('Watchlists', `Imported ${importedNames.length} watchlist${importedNames.length !== 1 ? 's' : ''} (${newCount} new, ${overwrittenCount} overwritten)`)

      // Refresh the watchlist
      handleWatchlistUpdated()
    } catch (err) {
      console.error('Import failed:', err)
      logError('Watchlists', `Failed to import watchlists: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Navigation functions - use sorted tickers
  const navigateToPrevious = React.useCallback(() => {
    if (sortedTickers.length === 0) return
    const newIndex = currentSelectedIndex === 0 ? sortedTickers.length - 1 : currentSelectedIndex - 1
    setCurrentSelectedIndex(newIndex)
    const ticker = sortedTickers[newIndex]
    if (ticker && onSelectTicker) {
      onSelectTicker(ticker.symbol)
    }
  }, [currentSelectedIndex, sortedTickers, onSelectTicker])

  const navigateToNext = React.useCallback(() => {
    if (sortedTickers.length === 0) return
    const newIndex = (currentSelectedIndex + 1) % sortedTickers.length
    setCurrentSelectedIndex(newIndex)
    const ticker = sortedTickers[newIndex]
    if (ticker && onSelectTicker) {
      onSelectTicker(ticker.symbol)
    }
  }, [currentSelectedIndex, sortedTickers, onSelectTicker])


  // Keyboard navigation
  React.useEffect(() => {
    if (!showControls || sortedTickers.length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateToPrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showControls, sortedTickers.length, navigateToPrevious, navigateToNext])

  // Prefetch next tickers when current index changes
  React.useEffect(() => {
    if (!showControls || sortedTickers.length === 0) return

    // Build array of next N ticker symbols to prefetch
    const symbolsToPrefetch: string[] = []
    for (let i = 1; i <= BASIC_WATCHLIST_PREFETCH_COUNT; i++) {
      const nextIndex = currentSelectedIndex + i
      if (nextIndex < sortedTickers.length) {
        symbolsToPrefetch.push(sortedTickers[nextIndex].symbol)
      }
    }

    // Fire-and-forget prefetch
    prefetchTickers('BasicWatchList', symbolsToPrefetch)
  }, [currentSelectedIndex, sortedTickers, showControls, prefetchTickers])

  // Auto-select first ticker when controls are enabled and tickers are available
  // Also reset to first ticker when sorting changes (sortedTickers array changes)
  React.useEffect(() => {
    if (showControls && sortedTickers.length > 0) {
      setCurrentSelectedIndex(0)
      const ticker = sortedTickers[0]
      if (ticker && onSelectTicker) {
        onSelectTicker(ticker.symbol)
      }
    }
  }, [showControls, sortedTickers, onSelectTicker])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Title Header */}
      <div className="flex items-center mb-3 shrink-0 px-3">
        <h3 className="text-lg font-semibold">
          Watchlist
        </h3>
      </div>

      {/* Price Change Distribution Summary */}
      {!loading && !error && priceDistribution.totalTickers > 0 && (
        <div className="px-3 mb-3">
          <PriceDistributionBars
            distribution={priceDistribution.distribution}
            totalTickers={priceDistribution.totalTickers}
          />
        </div>
      )}

      {/* Group Selection Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0 px-3">
        <TickerGroupSelector
          value={selectedGroup}
          onValueChange={handleGroupChange}
          placeholder="Select group"
          className="w-36 h-8 text-sm font-bold hover:bg-muted/50 transition-colors duration-200"
          refreshKey={refreshKey}
        />
        {/* New button - right next to dropdown */}
        <CreateWatchListDialog onWatchlistCreated={handleWatchlistCreated}>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1 text-xs">{t('common.watchlist.new')}</span>
            <span className="sr-only">Create new watchlist</span>
          </Button>
        </CreateWatchListDialog>
        {/* Edit button - aligned far right */}
        <div className="flex-1"></div>
        {selectedGroup && customWatchlists.includes(selectedGroup) && (
          <EditWatchListDialog
            watchlistName={selectedGroup}
            onWatchlistUpdated={handleWatchlistUpdated}
            onWatchlistDeleted={handleWatchlistDeleted}
          >
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Edit2 className="h-3.5 w-3.5" />
              <span className="sr-only">Edit watchlist</span>
            </Button>
          </EditWatchListDialog>
        )}
      </div>

      
      {/* Ticker List */}
      <div className="flex-1 px-3">
        <SortableTickerList
        tickers={tickers}
        allTickersLastData={allTickersLastData}
        searchQuery="" // No search in watchlist
        marketIndices={showMarketIndices ? [...MARKET_INDICES] : []}
        showMarketIndices={showMarketIndices}
        showSections={true} // Show section headers to distinguish stocks from crypto
        onSelectTicker={handleSelectTicker}
        onSortedTickersChange={handleSortedTickersChange}
        loading={loading || cryptoLoading}
        error={error || cryptoError}
        maxHeight={maxHeight}
        className="h-full"
        defaultSectionFilter={
          // Custom watchlists and CRYPTO watchlist default to 'all'
          customWatchlists.includes(selectedGroup) || selectedGroup === CRYPTO_WATCHLIST_NAME
            ? 'all'
            : 'stocks'
        }
        cryptoTickers={
          // ALL: show all crypto
          selectedGroup === ALL_WATCHLIST_NAME
            ? cryptoTickers
          // CRYPTO: show all crypto
          : selectedGroup === CRYPTO_WATCHLIST_NAME
            ? cryptoTickers
          // Custom watchlist: only show crypto symbols that are IN the watchlist
          : customWatchlists.includes(selectedGroup)
            ? (() => {
                const watchlistSymbols = getWatchlistTickers(selectedGroup)
                return cryptoTickers.filter(ticker => watchlistSymbols.includes(ticker.symbol))
              })()
          // Stock sectors/predefined: no crypto
          : []
        }
        allCryptoTickersLastData={
          // Only pass crypto data when crypto might be shown
          selectedGroup === ALL_WATCHLIST_NAME || selectedGroup === CRYPTO_WATCHLIST_NAME || customWatchlists.includes(selectedGroup)
            ? allCryptoTickersLastData
            : {}
        }
      />
      </div>

      {/* Edit Watchlist Button - only show for custom watchlists */}
      {selectedGroup && customWatchlists.includes(selectedGroup) && (
        <div className="px-3 mt-2">
          <EditWatchListDialog
            watchlistName={selectedGroup}
            onWatchlistUpdated={handleWatchlistUpdated}
            onWatchlistDeleted={handleWatchlistDeleted}
          >
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs">
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              {t('common.watchlist.editWatchlist')}
            </Button>
          </EditWatchListDialog>
        </div>
      )}

      {/* Export/Import Controls */}
      <div className="px-3 mt-2">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="flex-1 h-8 text-xs hover:bg-muted/50"
            title="Export watchlists"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
            className="flex-1 h-8 text-xs hover:bg-muted/50"
            title="Import watchlists"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Import
          </Button>
        </div>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Navigation Controls */}
      {showControls && sortedTickers.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 px-3 py-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={navigateToPrevious}
            disabled={sortedTickers.length <= 1}
            className="shrink-0 px-6 h-8 min-w-[80px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-shrink-0 px-2 sm:px-3 py-1 text-center">
            <span className="font-mono font-bold text-sm">
              {sortedTickers[currentSelectedIndex]?.symbol || ''}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={navigateToNext}
            disabled={sortedTickers.length <= 1}
            className="shrink-0 px-6 h-8 min-w-[80px]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}