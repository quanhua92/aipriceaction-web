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

interface SelectTickerDialogProps {
  children: React.ReactNode
  onSelectTicker: (ticker: string) => void
}

export function SelectTickerDialog({ children, onSelectTicker }: SelectTickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const { tickers, loading, error } = useAPI()

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

    return {
      marketIndices: search ? indices : MARKET_INDICES,
      filteredTickers: regularTickers
    }
  }, [search, tickers])

  const handleSelectTicker = (symbol: string) => {
    onSelectTicker(symbol)
    setOpen(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[500px] flex flex-col p-0 gap-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Select Ticker Symbol</DialogTitle>
        <div className="p-4 shrink-0 border-b">
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
                    {marketIndices.map((index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectTicker(index)}
                        className="w-full flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold">{index}</span>
                          <span className="text-xs text-muted-foreground truncate">Market Index</span>
                        </div>
                      </button>
                    ))}
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
                    {filteredTickers.map((ticker) => (
                      <button
                        key={ticker.symbol}
                        onClick={() => handleSelectTicker(ticker.symbol)}
                        className="w-full flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold">{ticker.symbol}</span>
                          <span className="text-xs text-muted-foreground truncate">{ticker.sector}</span>
                        </div>
                      </button>
                    ))}
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
