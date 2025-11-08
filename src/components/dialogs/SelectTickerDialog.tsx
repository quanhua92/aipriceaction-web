import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SelectTickerDialogProps {
  children: React.ReactNode
  onSelectTicker: (ticker: string) => void
}

interface Ticker {
  symbol: string
  name: string
}

// Generate mock ticker data
function generateTickers(): Ticker[] {
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'BAC', name: 'Bank of America Corp.' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'DIS', name: 'The Walt Disney Company' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
    { symbol: 'INTC', name: 'Intel Corporation' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
    { symbol: 'ORCL', name: 'Oracle Corporation' },
    { symbol: 'ADBE', name: 'Adobe Inc.' },
  ]

  // Generate additional tickers
  const additionalTickers: Ticker[] = []
  const usedSymbols = new Set(popularStocks.map(s => s.symbol))
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  let counter = 0
  while (additionalTickers.length < 180 && counter < 1000) {
    const symbol = `${letters[counter % 26]}${letters[Math.floor(counter / 26) % 26]}${letters[Math.floor(counter / 676) % 26]}`

    if (!usedSymbols.has(symbol) && symbol !== 'AAA') {
      usedSymbols.add(symbol)
      additionalTickers.push({
        symbol,
        name: `${symbol} Corporation`
      })
    }
    counter++
  }

  return [...popularStocks, ...additionalTickers]
}

const TICKERS = generateTickers()

export function SelectTickerDialog({ children, onSelectTicker }: SelectTickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filteredTickers = React.useMemo(() => {
    if (!search) return TICKERS
    const searchLower = search.toLowerCase()
    return TICKERS.filter(
      (ticker) =>
        ticker.symbol.toLowerCase().includes(searchLower)
    )
  }, [search])

  const handleSelectTicker = (symbol: string) => {
    onSelectTicker(symbol)
    setOpen(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[500px] flex flex-col p-0 gap-0" showCloseButton={false}>
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
            {filteredTickers.map((ticker) => (
              <button
                key={ticker.symbol}
                onClick={() => handleSelectTicker(ticker.symbol)}
                className="w-full flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold">{ticker.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{ticker.name}</span>
                </div>
              </button>
            ))}
            {filteredTickers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tickers found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
