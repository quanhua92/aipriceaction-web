import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SortableTickerList, type Ticker } from './SortableTickerList'

export interface BasicWatchListProps {
  defaultGroup?: string
  maxHeight?: string
  className?: string
  showMarketIndices?: boolean
  onSelectTicker?: (symbol: string) => void
}

export function BasicWatchList({
  defaultGroup,
  maxHeight = '400px',
  className = '',
  showMarketIndices = false,
  onSelectTicker
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

  // Update selected group when groups are loaded
  React.useEffect(() => {
    if (sectorGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(sectorGroups[0])
    } else if (defaultGroup && tickerGroups?.[defaultGroup]) {
      setSelectedGroup(defaultGroup)
    }
  }, [sectorGroups, defaultGroup, tickerGroups, selectedGroup])

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

  const handleSelectTicker = (symbol: string) => {
    if (onSelectTicker) {
      onSelectTicker(symbol)
    }
  }

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group)
  }

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
    </div>
  )
}