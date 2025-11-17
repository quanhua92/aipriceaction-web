import * as React from 'react'
import { ChevronLeft, ChevronRight, Star, Plus, Edit2, Bookmark } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { usePrefetchTicker } from '@/hooks/usePrefetchTicker'
import { BASIC_WATCHLIST_PREFETCH_COUNT, ALL_WATCHLIST_NAME, CRYPTO_WATCHLIST_NAME, MARKET_INDICES } from '@/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SortableTickerList, type Ticker } from './SortableTickerList'
import { CreateWatchListDialog } from '@/components/dialogs/CreateWatchListDialog'
import { EditWatchListDialog } from '@/components/dialogs/EditWatchListDialog'
import { getWatchlistNames, getWatchlistTickers } from '@/lib/watchlist-storage'
import {
  getPredefinedWatchlistNames,
  getPredefinedWatchlistTickers,
  isPredefinedWatchlist as checkIsPredefinedWatchlist
} from '@/lib/predefined-watchlists'
import { getSectorDisplayName } from '@/lib/sector-names'
import { useTranslation } from '@/hooks/useTranslation'

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
  const { language } = useTranslation()

  // State to track custom watchlists and trigger re-renders
  const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([])
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Get predefined watchlist names
  const predefinedWatchlists = React.useMemo(() => getPredefinedWatchlistNames(), [])

  // Load custom watchlists from localStorage
  React.useEffect(() => {
    const loadCustomWatchlists = () => {
      const names = getWatchlistNames()
      setCustomWatchlists(names)
    }
    loadCustomWatchlists()
  }, [refreshKey])

  // Helper to check if a group is a custom watchlist
  const isCustomWatchlist = React.useCallback((group: string) => {
    return customWatchlists.includes(group)
  }, [customWatchlists])

  // Helper to check if a group is a predefined watchlist
  const isPredefinedWatchlist = React.useCallback((group: string) => {
    return checkIsPredefinedWatchlist(group)
  }, [])

  // Helper to check if a group is the ALL watchlist
  const isAllWatchlist = React.useCallback((group: string) => {
    return group === ALL_WATCHLIST_NAME
  }, [])

  // Helper to check if a group is the CRYPTO watchlist
  const isCryptoWatchlist = React.useCallback((group: string) => {
    return group === CRYPTO_WATCHLIST_NAME
  }, [])

  // Get available sector groups (exclude market indices)
  const sectorGroups = React.useMemo(() => {
    if (!tickerGroups) return []
    return Object.keys(tickerGroups).filter(group =>
      !['VNINDEX', 'VN30'].includes(group)
    )
  }, [tickerGroups])

  // Get all available groups (ALL, CRYPTO, predefined, custom watchlists, then sectors)
  const allGroups = React.useMemo(() => {
    return [ALL_WATCHLIST_NAME, CRYPTO_WATCHLIST_NAME, ...predefinedWatchlists, ...customWatchlists, ...sectorGroups]
  }, [predefinedWatchlists, customWatchlists, sectorGroups])

  // Helper to get display name for dropdown (readable names only for sectors)
  const getDropdownDisplayName = React.useCallback((group: string): string => {
    // Check if it's a sector group (not ALL, not predefined, not custom)
    const isSector = sectorGroups.includes(group)
    if (isSector) {
      return getSectorDisplayName(group, language)
    }
    // Keep ALL, predefined, and custom watchlist names as-is
    return group
  }, [sectorGroups, language])

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
    } else if (allGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(allGroups[0])
    }
  }, [allGroups, defaultGroup, hasUserChangedGroup, selectedGroup])

  // Transform ticker group data for SortableTickerList
  const tickers: Ticker[] = React.useMemo(() => {
    if (!selectedGroup) {
      return []
    }

    // Check if this is the ALL watchlist
    if (isAllWatchlist(selectedGroup)) {
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
    if (isCryptoWatchlist(selectedGroup)) {
      return []
    }

    // Check if this is a predefined watchlist
    if (isPredefinedWatchlist(selectedGroup)) {
      const watchlistTickers = getPredefinedWatchlistTickers(selectedGroup)
      return watchlistTickers.map(symbol => ({
        symbol,
        sector: selectedGroup
      }))
    }

    // Check if this is a custom watchlist
    if (isCustomWatchlist(selectedGroup)) {
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
  }, [selectedGroup, tickerGroups, isCustomWatchlist, isPredefinedWatchlist, isAllWatchlist, isCryptoWatchlist, refreshKey, cryptoTickers])

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
    const remainingGroups = [...customWatchlists.filter(w => w !== selectedGroup), ...sectorGroups]
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
      {/* Group Selection Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Watchlist:
          </span>
          <Select value={selectedGroup} onValueChange={handleGroupChange}>
            <SelectTrigger className="w-40 h-8 text-sm font-bold hover:bg-muted/50 transition-colors duration-200">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {allGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  <div className="flex items-center gap-2">
                    {isPredefinedWatchlist(group) && (
                      <Bookmark className="h-3.5 w-3.5 fill-purple-500 text-purple-500" />
                    )}
                    {isCustomWatchlist(group) && (
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    )}
                    <span className={isAllWatchlist(group) ? 'font-bold' : ''}>
                      {getDropdownDisplayName(group)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          {/* Edit button - only show for custom watchlists */}
          {selectedGroup && isCustomWatchlist(selectedGroup) && (
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
          {/* New button */}
          <CreateWatchListDialog onWatchlistCreated={handleWatchlistCreated}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Create new watchlist</span>
            </Button>
          </CreateWatchListDialog>
        </div>
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
        cryptoTickers={
          // ALL: show all crypto
          isAllWatchlist(selectedGroup)
            ? cryptoTickers
          // CRYPTO: show all crypto
          : isCryptoWatchlist(selectedGroup)
            ? cryptoTickers
          // Custom watchlist: only show crypto symbols that are IN the watchlist
          : isCustomWatchlist(selectedGroup)
            ? (() => {
                const watchlistSymbols = getWatchlistTickers(selectedGroup)
                return cryptoTickers.filter(ticker => watchlistSymbols.includes(ticker.symbol))
              })()
          // Stock sectors/predefined: no crypto
          : []
        }
        allCryptoTickersLastData={
          // Only pass crypto data when crypto might be shown
          isAllWatchlist(selectedGroup) || isCryptoWatchlist(selectedGroup) || isCustomWatchlist(selectedGroup)
            ? allCryptoTickersLastData
            : {}
        }
      />
      </div>

      {/* Navigation Controls */}
      {showControls && sortedTickers.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 p-2 border-t">
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