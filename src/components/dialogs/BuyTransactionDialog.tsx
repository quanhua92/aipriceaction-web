import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { formatPrice } from '@/lib/format'
import { Plus } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useTranslation } from '@/hooks/useTranslation'

interface BuyTransactionDialogProps {
  children: React.ReactNode
  onBuy: (ticker: string, quantity: number, notes?: string) => Promise<boolean>
  currency?: 'VND' | 'USD'
}

export function BuyTransactionDialog({
  children,
  onBuy,
  currency = 'VND',
  open,
  onOpenChange
}: BuyTransactionDialogProps & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const [selectedTicker, setSelectedTicker] = React.useState('')
  const [quantity, setQuantity] = React.useState('1000')
  const [currentTickerPrice, setCurrentTickerPrice] = React.useState(0)
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Get API context data for current prices (both stock and crypto)
  const { allTickersLastData, allCryptoTickersLastData } = useAPI()
  const { lastRefresh } = useRefresh()

  // Helper function to get latest data from either stock or crypto
  const getLatestData = (symbol: string): number => {
    // Try stock data first
    const stockData = allTickersLastData[symbol]
    if (stockData && stockData.length > 0) {
      return stockData[stockData.length - 1].close
    }

    // Try crypto data
    const cryptoData = allCryptoTickersLastData[symbol]
    if (cryptoData && cryptoData.length > 0) {
      return cryptoData[cryptoData.length - 1].close
    }

    return 0
  }

  // Alternative validation that uses direct price fetching as fallback
  const fallbackPrice = React.useMemo(() => {
    return selectedTicker ? getLatestData(selectedTicker) : 0
  }, [selectedTicker, allTickersLastData, allCryptoTickersLastData, lastRefresh])

  // Calculate total cost based on quantity and price
  const totalCost = React.useMemo(() => {
    if (!quantity || !currentTickerPrice) return 0

    const quantityNum = parseInt(quantity.replace(/,/g, ''))
    if (quantityNum <= 0 || currentTickerPrice <= 0) return 0

    return quantityNum * currentTickerPrice
  }, [quantity, currentTickerPrice])

  // Fetch current price from APIContext when ticker is selected
  React.useEffect(() => {
    if (!selectedTicker) return

    const price = getLatestData(selectedTicker)
    setCurrentTickerPrice(price)
  }, [selectedTicker, allTickersLastData, allCryptoTickersLastData, lastRefresh])

  const handleBuy = async () => {
    console.log('handleBuy called with:', {
      selectedTicker,
      quantity,
      currentTickerPrice,
      loading
    })

    if (!selectedTicker || !quantity) {
      console.log('Early return: missing ticker or quantity')
      return
    }

    const quantityNum = parseInt(quantity.replace(/,/g, ''))
    if (quantityNum <= 0) {
      console.log('Early return: invalid quantity', quantityNum)
      return
    }

    if (currentTickerPrice <= 0) {
      console.log('Early return: invalid price', currentTickerPrice)
      return
    }

    console.log('All validations passed, proceeding with buy:', {
      ticker: selectedTicker,
      quantity: quantityNum,
      price: currentTickerPrice,
      total: quantityNum * currentTickerPrice
    })

    setLoading(true)

    try {
      const success = await onBuy(selectedTicker, quantityNum, notes || undefined)
      console.log('onBuy result:', success)
      if (success) {
        // Reset form
        setSelectedTicker('')
        setQuantity('')
        setNotes('')
        setCurrentTickerPrice(0)
        setDialogOpen(false)
      }
    } catch (error) {
      console.error('Buy transaction failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format quantity with thousand separators
  const formatQuantity = (value: string) => {
    const cleanValue = value.replace(/,/g, '')
    if (!cleanValue) return ''
    return parseInt(cleanValue).toLocaleString()
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '')
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(formatQuantity(value))
    }
  }

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker)
  }

  const isValid = selectedTicker && quantity && currentTickerPrice > 0 && totalCost > 0

  // Manual validation check for debugging
  const validationCheck = {
    hasTicker: !!selectedTicker,
    hasQuantity: !!quantity,
    quantityNumber: quantity ? parseInt(quantity.replace(/,/g, '')) : 0,
    hasCurrentPrice: currentTickerPrice > 0,
    currentTickerPriceValue: currentTickerPrice,
    totalCostValue: totalCost,
    finalResult: selectedTicker && quantity && currentTickerPrice > 0 && totalCost > 0
  }

  // Debug validation state
  React.useEffect(() => {
    console.log('BuyTransactionDialog validation state:', {
      selectedTicker,
      quantity,
      currentTickerPrice,
      totalCost,
      isValid,
      rawPrice: getLatestData(selectedTicker),
      validationCheck
    })
  }, [selectedTicker, quantity, currentTickerPrice, totalCost, isValid, validationCheck, allTickersLastData, allCryptoTickersLastData])

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('common.backtest.buyTransaction')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ticker Selection */}
          <div className="space-y-2">
            <Label htmlFor="ticker">{t('common.backtest.ticker')}</Label>
            <SelectTickerDialog onSelectTicker={handleTickerSelect}>
              <Button
                variant="outline"
                className="w-full justify-start font-normal"
                disabled={loading}
              >
                {selectedTicker || t('common.backtest.selectTicker')}
              </Button>
            </SelectTickerDialog>
          </div>

          {/* Current Price Display */}
          {selectedTicker && currentTickerPrice > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('common.backtest.currentPrice')}</span>
                <span className="font-semibold">{formatPrice(currentTickerPrice, { mode: 'vn' })}</span>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{t('common.backtest.quantityShares')}</Label>
            <Input
              id="quantity"
              placeholder="100"
              value={quantity}
              onChange={handleQuantityChange}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t('common.backtest.enterQuantity')}
            </p>
          </div>

          {/* Total Cost */}
          {totalCost > 0 && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('common.backtest.totalCost')}</span>
                <span className="font-bold text-primary">{formatPrice(totalCost, { mode: 'vn' })}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">{t('common.backtest.quantity')}</span>
                <span className="text-sm font-medium">
                  {parseInt(quantity.replace(/,/g, '')).toLocaleString()} {t('common.backtest.shares')}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('common.backtest.notesOptional')}</Label>
            <Textarea
              id="notes"
              placeholder={t('common.backtest.notesPlaceholder')}
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBuy}
              disabled={!isValid || loading}
              className="flex-1"
            >
              {loading ? t('common.backtest.processing') : `${t('common.backtest.buy')} ${selectedTicker || ''}`}
            </Button>
          </div>

          {/* Warning */}
          {totalCost === 0 && quantity && currentTickerPrice > 0 && (
            <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
              {t('common.backtest.quantityTooSmall')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}