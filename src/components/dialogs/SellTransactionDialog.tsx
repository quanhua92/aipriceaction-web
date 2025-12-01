import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatPercent } from '@/lib/format'
import { getPriceChangeColor } from '@/lib/colors'
import { getBacktestData, Position } from '@/lib/backtest-storage'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'

interface SellTransactionDialogProps {
  children: React.ReactNode
  onSell: (ticker: string, percentage: number, notes?: string) => Promise<boolean>
  currency?: 'VND' | 'USD'
}

const SELL_PERCENTAGES = [
  { label: '10%', value: 10 },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '100%', value: 100 }
]

export function SellTransactionDialog({
  children,
  onSell,
  currency = 'VND',
  open,
  onOpenChange
}: SellTransactionDialogProps & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const [selectedTicker, setSelectedTicker] = React.useState('')
  const [selectedPercentage, setSelectedPercentage] = React.useState(25)
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Get API context data for current prices (both stock and crypto)
  const { allTickersLastData, allCryptoTickersLastData } = useAPI()
  const { lastRefresh } = useRefresh()

  // Get fresh data from localStorage - simple and direct
  const [localData, setLocalData] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return getBacktestData()
    }
    return { positions: [] }
  })

  // Refresh data when localStorage changes
  const refreshData = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      setLocalData(getBacktestData())
    }
  }, [])

  // Use localStorage positions directly
  const positions = localData.positions

  // State for enhanced price management
  const [priceLoading, setPriceLoading] = React.useState(true)
  const [priceErrors, setPriceErrors] = React.useState<Record<string, string>>({})
  const [priceSources, setPriceSources] = React.useState<Record<string, string>>({})
  const [retryCount, setRetryCount] = React.useState(0)
  const [currentPrices, setCurrentPrices] = React.useState<Record<string, number>>({})
  const MAX_RETRIES = 3

  // Enhanced price fetching function with robust fallbacks
  const getRobustPrice = React.useCallback((symbol: string): { price: number; source: 'api' | 'transaction' | 'fallback' } => {
    // Try API data first (most recent)
    const stockData = allTickersLastData[symbol]
    if (stockData && stockData.length > 0) {
      return { price: stockData[stockData.length - 1].close, source: 'api' }
    }

    const cryptoData = allCryptoTickersLastData[symbol]
    if (cryptoData && cryptoData.length > 0) {
      return { price: cryptoData[cryptoData.length - 1].close, source: 'api' }
    }

    // Fallback to latest transaction price from localStorage
    const latestTransaction = localData.transactions
      .filter(t => t.ticker === symbol)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    if (latestTransaction) {
      return { price: latestTransaction.price, source: 'transaction' }
    }

    // Final fallback to position average cost
    const position = positions.find(p => p.ticker === symbol)
    if (position && position.averageCost > 0) {
      return { price: position.averageCost, source: 'fallback' }
    }

    return { price: 0, source: 'fallback' }
  }, [allTickersLastData, allCryptoTickersLastData, localData.transactions, positions])

  // Effect to resolve prices when component mounts or data changes
  React.useEffect(() => {
    const resolvePrices = async () => {
      console.log('[SellDialog] Resolving prices for positions:', positions.map(p => p.ticker))
      setPriceLoading(true)
      const newPrices: Record<string, number> = {}
      const newErrors: Record<string, string> = {}
      const newSources: Record<string, string> = {}

      for (const position of positions) {
        const priceResult = getRobustPrice(position.ticker)
        newPrices[position.ticker] = priceResult.price
        newSources[position.ticker] = priceResult.source

        console.log(`[SellDialog] Price resolved for ${position.ticker}:`, {
          price: priceResult.price,
          source: priceResult.source,
          stockDataAvailable: !!allTickersLastData[position.ticker],
          cryptoDataAvailable: !!allCryptoTickersLastData[position.ticker]
        })

        if (priceResult.price === 0) {
          newErrors[position.ticker] = 'Price data unavailable'
          console.warn(`[SellDialog] Failed to get price for ${position.ticker}`)
        }
      }

      console.log('[SellDialog] Final prices resolved:', newPrices)
      setCurrentPrices(newPrices)
      setPriceErrors(newErrors)
      setPriceSources(newSources)
      setPriceLoading(false)
    }

    resolvePrices()
  }, [positions, allTickersLastData, allCryptoTickersLastData, lastRefresh, getRobustPrice])

  // Automatic retry logic with exponential backoff
  React.useEffect(() => {
    if (retryCount < MAX_RETRIES && Object.keys(priceErrors).length > 0) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        // Trigger price resolution again
        const retryPrices = async () => {
          setPriceLoading(true)
          const newPrices: Record<string, number> = {}
          const newErrors: Record<string, string> = {}
          const newSources: Record<string, string> = {}

          for (const position of positions) {
            const priceResult = getRobustPrice(position.ticker)
            newPrices[position.ticker] = priceResult.price
            newSources[position.ticker] = priceResult.source

            if (priceResult.price === 0) {
              newErrors[position.ticker] = `Price unavailable (retry ${retryCount + 1}/${MAX_RETRIES})`
            }
          }

          setCurrentPrices(newPrices)
          setPriceErrors(newErrors)
          setPriceSources(newSources)
          setPriceLoading(false)
        }
        retryPrices()
      }, 2000 * (retryCount + 1)) // Exponential backoff: 2s, 4s, 6s

      return () => clearTimeout(timer)
    }
  }, [priceErrors, retryCount, positions, getRobustPrice])

  // Get position details for selected ticker
  const selectedPosition = React.useMemo(() => {
    return positions.find(p => p.ticker === selectedTicker)
  }, [positions, selectedTicker])

  // Calculate sell details
  const sellDetails = React.useMemo(() => {
    if (!selectedPosition) return null

    const currentPrice = currentPrices[selectedTicker] || 0
    const sellQuantity = Math.floor(selectedPosition.totalShares * (selectedPercentage / 100))
    const sellValue = sellQuantity * currentPrice
    const costBasis = selectedPosition.averageCost * sellQuantity
    const realizedPnL = sellValue - costBasis
    const realizedPnLPercent = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0

    return {
      totalShares: selectedPosition.totalShares,
      sellQuantity,
      currentPrice,
      averageCost: selectedPosition.averageCost,
      sellValue,
      costBasis,
      realizedPnL,
      realizedPnLPercent
    }
  }, [selectedPosition, selectedPercentage, currentPrices, selectedTicker])

  // Debug: Log when selectedTicker changes
  React.useEffect(() => {
    console.log('[SellDialog] selectedTicker changed:', `"${selectedTicker}"`)
  }, [selectedTicker])

  const handleSell = async () => {
    if (!selectedTicker || !selectedPosition) return

    setLoading(true)

    try {
      const success = await onSell(selectedTicker, selectedPercentage, notes || undefined)
      if (success) {
        // Refresh localStorage data
        refreshData()
        // Reset form
        setSelectedTicker('')
        setSelectedPercentage(25)
        setNotes('')
        setDialogOpen(false)
      }
    } catch (error) {
      console.error('Sell transaction failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const isValid = selectedTicker && selectedPosition && sellDetails?.sellQuantity > 0

  // Filter positions with shares available to sell
  const availablePositions = React.useMemo(() => {
    return positions.filter(p => p.totalShares > 0)
  }, [positions])

  if (availablePositions.length === 0) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5" />
              No Positions to Sell
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">You don't have any open positions to sell.</p>
            <p className="text-xs mt-1">Start by buying some securities first.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show loading state while resolving prices
  if (priceLoading && availablePositions.length > 0) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5" />
              Sell Transaction
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading current prices...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5" />
              Sell Transaction
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset retry count and force price resolution refresh
                setRetryCount(0)
                const resolvePrices = async () => {
                  setPriceLoading(true)
                  const newPrices: Record<string, number> = {}
                  const newErrors: Record<string, string> = {}
                  const newSources: Record<string, string> = {}

                  for (const position of positions) {
                    const priceResult = getRobustPrice(position.ticker)
                    newPrices[position.ticker] = priceResult.price
                    newSources[position.ticker] = priceResult.source

                    if (priceResult.price === 0) {
                      newErrors[position.ticker] = 'Price data unavailable'
                    }
                  }

                  setCurrentPrices(newPrices)
                  setPriceErrors(newErrors)
                  setPriceSources(newSources)
                  setPriceLoading(false)
                }
                resolvePrices()
              }}
              disabled={loading || priceLoading}
            >
              Refresh Prices
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Position Selection */}
          <div className="space-y-2">
            <Label>Select Position</Label>
            <div className="space-y-2">
              {availablePositions.map((position) => {
                const currentPrice = currentPrices[position.ticker] || 0
                const currentValue = position.totalShares * currentPrice
                const unrealizedPnL = currentValue - position.totalCost
                const unrealizedPnLPercent = position.totalCost > 0 ? (unrealizedPnL / position.totalCost) * 100 : 0

                return (
                  <Button
                    key={position.ticker}
                    variant={selectedTicker === position.ticker ? "default" : "outline"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => {
                      console.log(`[SellDialog] Position selected: ${position.ticker}`, {
                        ticker: position.ticker,
                        currentPrice: currentPrices[position.ticker],
                        priceSource: priceSources[position.ticker],
                        sellDetails: sellDetails
                      })
                      console.log(`[SellDialog] Setting selectedTicker to: "${position.ticker}"`)
                      setSelectedTicker(position.ticker)
                    }}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{position.ticker}</span>
                        <Badge variant="secondary" className="text-xs">
                          {position.totalShares.toLocaleString()} shares
                        </Badge>
                        {priceSources[position.ticker] === 'transaction' && (
                          <Badge variant="outline" className="text-xs">Historical</Badge>
                        )}
                        {priceSources[position.ticker] === 'fallback' && (
                          <Badge variant="secondary" className="text-xs">Estimated</Badge>
                        )}
                        {priceErrors[position.ticker] && (
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatPrice(currentValue)}</div>
                        <div className={`text-xs ${getPriceChangeColor(unrealizedPnLPercent)}`}>
                          {formatPercent(unrealizedPnLPercent)}
                        </div>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Error Messages */}
          {priceErrors[selectedTicker] && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ {priceErrors[selectedTicker]} - using estimated price for calculations
              </p>
            </div>
          )}

          {/* Current Position Details */}
          {selectedPosition && sellDetails && (
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Price</span>
                  {priceSources[selectedTicker] && (
                    <Badge variant="outline" className="text-xs">
                      {priceSources[selectedTicker] === 'api' ? 'Live' :
                       priceSources[selectedTicker] === 'transaction' ? 'Historical' : 'Estimated'}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-semibold">{formatPrice(sellDetails.currentPrice)}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {selectedTicker || 'NO TICKER'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Cost</span>
                <span className="font-medium">{formatPrice(sellDetails.averageCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Shares</span>
                <span className="font-medium">{sellDetails.totalShares.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Sell Percentage Selection */}
          {selectedPosition && (
            <div className="space-y-2">
              <Label>Sell Amount</Label>
              <div className="grid grid-cols-4 gap-2">
                {SELL_PERCENTAGES.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedPercentage === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPercentage(option.value)}
                    disabled={loading}
                    className="h-10"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sell Calculation */}
          {sellDetails && sellDetails.sellQuantity > 0 && (
            <div className="space-y-2">
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Shares to Sell</span>
                  <span className="font-bold text-primary">{sellDetails.sellQuantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sell Value</span>
                  <span className="font-medium">{formatPrice(sellDetails.sellValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cost Basis</span>
                  <span className="font-medium">{formatPrice(sellDetails.costBasis)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-1">
                      {sellDetails.realizedPnL >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
                      )}
                      Realized P&L
                    </span>
                    <div className="text-right">
                      <div className={`font-bold ${getPriceChangeColor(sellDetails.realizedPnLPercent)}`}>
                        {formatPrice(sellDetails.realizedPnL)}
                      </div>
                      <div className={`text-xs ${getPriceChangeColor(sellDetails.realizedPnLPercent)}`}>
                        {formatPercent(sellDetails.realizedPnLPercent)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this transaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSell}
              disabled={!isValid || loading}
              className="flex-1"
              variant={sellDetails?.realizedPnL && sellDetails.realizedPnL > 0 ? "default" : "destructive"}
            >
              {loading ? 'Processing...' : `Sell ${selectedTicker || ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}