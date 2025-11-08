import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { MARKET_INDICES } from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getPriceChangeColor, getVolumeChangeColor } from '@/lib/colors'
import type { StockData } from '@/lib/api-client'

interface SelectTickerDialogProps {
  children: React.ReactNode
  onSelectTicker: (ticker: string) => void
}

type SortBy = 'az' | 'gainers' | 'losers' | 'volume'

export function SelectTickerDialog({ children, onSelectTicker }: SelectTickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState<SortBy>('volume')
  const { tickers, loading, error, allTickersData } = useAPI()

  const getLatestData = (symbol: string): StockData | undefined => {
    const data = allTickersData[symbol]
    return data?.[data.length - 1]
  }

  const { marketIndices, filteredTickers } = React.useMemo(() => {
    const searchLower = search.toLowerCase()

    // Filter market indices
    const indices = MARKET_INDICES.filter(index =>
      index.toLowerCase().includes(searchLower)
    )

    // Filter regular tickers (excluding market indices)
    const regularTickers = tickers.filter(
      (ticker) =>
        !MARKET_INDICES.includes(ticker.symbol as any) &&
        ticker.symbol.toLowerCase().includes(searchLower)
    )

    // Sort tickers based on selected sort option
    const sortedTickers = [...regularTickers].sort((a, b) => {
      const aData = getLatestData(a.symbol)
      const bData = getLatestData(b.symbol)

      switch (sortBy) {
        case 'az':
          return a.symbol.localeCompare(b.symbol)

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

        default:
          return 0
      }
    })

    return {
      marketIndices: search ? indices : MARKET_INDICES,
      filteredTickers: sortedTickers
    }
  }, [search, tickers, sortBy, allTickersData])

  const handleSelectTicker = (symbol: string) => {
    onSelectTicker(symbol)
    setOpen(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[700px] flex flex-col p-0 gap-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Select Ticker Symbol</DialogTitle>
        <div className="p-4 shrink-0 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
              autoFocus
            />
          </div>

          {/* Sort Buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortBy('volume')}
              className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'volume'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setSortBy('gainers')}
              className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'gainers'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              ↑ Gainers
            </button>
            <button
              onClick={() => setSortBy('losers')}
              className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'losers'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              ↓ Losers
            </button>
            <button
              onClick={() => setSortBy('az')}
              className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'az'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              A-Z
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="p-2">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Market Indices */}
                {marketIndices.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Market Indices
                    </div>
                    {marketIndices.map((index) => {
                      const latestData = getLatestData(index)
                      return (
                        <button
                          key={index}
                          onClick={() => handleSelectTicker(index)}
                          className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex flex-col min-w-0 flex-shrink">
                            <span className="font-extrabold">{index}</span>
                            <span className="text-xs text-muted-foreground/70 truncate">Market Index</span>
                          </div>
                          {latestData && (
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              {/* Price Row */}
                              <div className="flex items-center gap-2">
                                <span className="font-bold tabular-nums">{formatPrice(latestData.close)}</span>
                                {latestData.close_changed !== null && latestData.close_changed !== undefined && (
                                  <span className={`text-xs tabular-nums ${getPriceChangeColor(latestData.close_changed)}`}>
                                    {latestData.close_changed >= 0 ? '↑' : '↓'} {formatPercent(latestData.close_changed)}
                                  </span>
                                )}
                              </div>
                              {/* Volume Row */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <span className="tabular-nums">Vol: {formatVolume(latestData.volume)}</span>
                                {latestData.volume_changed !== null && latestData.volume_changed !== undefined && (
                                  <span className={`tabular-nums opacity-70 ${getVolumeChangeColor(latestData.volume_changed)}`}>
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
                {filteredTickers.length > 0 && (
                  <div>
                    {marketIndices.length > 0 && (
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Stocks
                      </div>
                    )}
                    {filteredTickers.map((ticker) => {
                      const latestData = getLatestData(ticker.symbol)
                      return (
                        <button
                          key={ticker.symbol}
                          onClick={() => handleSelectTicker(ticker.symbol)}
                          className="w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex flex-col min-w-0 flex-shrink">
                            <span className="font-extrabold">{ticker.symbol}</span>
                            <span className="text-xs text-muted-foreground/70 truncate">{ticker.sector}</span>
                          </div>
                          {latestData && (
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              {/* Price Row */}
                              <div className="flex items-center gap-2">
                                <span className="font-bold tabular-nums">{formatPrice(latestData.close)}</span>
                                {latestData.close_changed !== null && latestData.close_changed !== undefined && (
                                  <span className={`text-xs tabular-nums ${getPriceChangeColor(latestData.close_changed)}`}>
                                    {latestData.close_changed >= 0 ? '↑' : '↓'} {formatPercent(latestData.close_changed)}
                                  </span>
                                )}
                              </div>
                              {/* Volume Row */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <span className="tabular-nums">Vol: {formatVolume(latestData.volume)}</span>
                                {latestData.volume_changed !== null && latestData.volume_changed !== undefined && (
                                  <span className={`tabular-nums opacity-70 ${getVolumeChangeColor(latestData.volume_changed)}`}>
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

                {marketIndices.length === 0 && filteredTickers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tickers found
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
