import * as React from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SortableTickerList, type Ticker } from './SortableTickerList'

export interface BasicWatchListProps {
  defaultGroup?: string
  maxHeight?: string
  className?: string
  showMarketIndices?: boolean
  showControls?: boolean
  onSelectTicker?: (symbol: string) => void
  onSectorChange?: (sector: string) => void
}

export function BasicWatchList({
  defaultGroup,
  maxHeight = '300px',
  className = '',
  showMarketIndices = false,
  showControls = false,
  onSelectTicker,
  onSectorChange
}: BasicWatchListProps) {
  const { tickerGroups, allTickersData, loading, error } = useAPI()

  // Get available sector groups (exclude market indices)
  const sectorGroups = React.useMemo(() => {
    if (!tickerGroups) return []
    return Object.keys(tickerGroups).filter(group =>
      !['VNINDEX', 'VN30'].includes(group)
    )
  }, [tickerGroups])

  // Set default selected group
  const [selectedGroup, setSelectedGroup] = React.useState<string>(() => {
    if (defaultGroup && tickerGroups?.[defaultGroup]) {
      return defaultGroup
    }
    return sectorGroups.length > 0 ? sectorGroups[0] : ''
  })

  // Update selected group when groups are loaded or defaultGroup changes
  React.useEffect(() => {
    if (defaultGroup && tickerGroups?.[defaultGroup]) {
      setSelectedGroup(defaultGroup)
    } else if (sectorGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(sectorGroups[0])
    }
  }, [sectorGroups, defaultGroup, tickerGroups]) // Removed selectedGroup from dependencies

  // Transform ticker group data for SortableTickerList
  const tickers: Ticker[] = React.useMemo(() => {
    if (!selectedGroup || !tickerGroups?.[selectedGroup]) {
      return []
    }

    return tickerGroups[selectedGroup].map(symbol => ({
      symbol,
      sector: selectedGroup
    }))
  }, [selectedGroup, tickerGroups])

  // Navigation state
  const [currentSelectedIndex, setCurrentSelectedIndex] = React.useState(0)

  // Auto-select first ticker when controls are enabled and tickers are available
  React.useEffect(() => {
    if (showControls && tickers.length > 0 && currentSelectedIndex >= tickers.length) {
      setCurrentSelectedIndex(0)
    }
  }, [showControls, tickers.length, currentSelectedIndex])

  // Reset navigation when group changes
  React.useEffect(() => {
    setCurrentSelectedIndex(0)
  }, [selectedGroup])

  const handleSelectTicker = (symbol: string) => {
    if (onSelectTicker) {
      onSelectTicker(symbol)
    }
    // Update selected index when user clicks on a ticker
    const index = tickers.findIndex(t => t.symbol === symbol)
    if (index !== -1) {
      setCurrentSelectedIndex(index)
    }
  }

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group)
    if (onSectorChange) {
      onSectorChange(group)
    }
  }

  // Navigation functions
  const navigateToPrevious = React.useCallback(() => {
    if (tickers.length === 0) return
    const newIndex = currentSelectedIndex === 0 ? tickers.length - 1 : currentSelectedIndex - 1
    setCurrentSelectedIndex(newIndex)
    const ticker = tickers[newIndex]
    if (ticker && onSelectTicker) {
      onSelectTicker(ticker.symbol)
    }
  }, [currentSelectedIndex, tickers, onSelectTicker])

  const navigateToNext = React.useCallback(() => {
    if (tickers.length === 0) return
    const newIndex = (currentSelectedIndex + 1) % tickers.length
    setCurrentSelectedIndex(newIndex)
    const ticker = tickers[newIndex]
    if (ticker && onSelectTicker) {
      onSelectTicker(ticker.symbol)
    }
  }, [currentSelectedIndex, tickers, onSelectTicker])

  // Keyboard navigation
  React.useEffect(() => {
    if (!showControls || tickers.length === 0) return

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
  }, [showControls, tickers.length, navigateToPrevious, navigateToNext])

  // Auto-select first ticker when controls are enabled
  React.useEffect(() => {
    if (showControls && tickers.length > 0 && currentSelectedIndex === 0) {
      const ticker = tickers[0]
      if (ticker && onSelectTicker) {
        onSelectTicker(ticker.symbol)
      }
    }
  }, [showControls, tickers, currentSelectedIndex, onSelectTicker])

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
              {sectorGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  <div className="flex items-center gap-2">
                    <span>{group}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ChevronDown className="h-4 w-4 opacity-60 text-muted-foreground" />
      </div>

      {/* Ticker List */}
      <SortableTickerList
        tickers={tickers}
        allTickersData={allTickersData}
        searchQuery="" // No search in watchlist
        marketIndices={[]} // No market indices in watchlist
        showMarketIndices={showMarketIndices}
        showSections={false} // Don't show section headers in watchlist
        onSelectTicker={handleSelectTicker}
        loading={loading}
        error={error}
        maxHeight={maxHeight}
        className="flex-1"
      />

      {/* Navigation Controls */}
      {showControls && tickers.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={navigateToPrevious}
            disabled={tickers.length <= 1}
            className="shrink-0 sm:px-4 px-3 h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-shrink-0 px-2 sm:px-3 py-1 text-center">
            <span className="font-mono font-bold text-sm">
              {tickers[currentSelectedIndex]?.symbol || ''}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={navigateToNext}
            disabled={tickers.length <= 1}
            className="shrink-0 sm:px-4 px-3 h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}