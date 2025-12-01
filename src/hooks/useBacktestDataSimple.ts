import * as React from 'react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useLogs } from '@/contexts/LogsContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import {
  getBacktestData,
  addTransaction,
  deleteTransaction,
  updateSettings,
  resetBacktestData,
  exportBacktestData,
  importBacktestData,
  calculatePositionsFromTransactions,
  type BacktestData,
  type Transaction,
  type Position
} from '@/lib/backtest-storage'
import {
  calculateBuyUpdate,
  calculateSell,
  calculatePortfolioStats,
  type PortfolioStats
} from '@/lib/backtest-calculations'

export function useBacktestDataSimple() {
  const { getTickers, allTickersLastData, allCryptoTickersLastData } = useAPI()
  const { lastRefresh } = useRefresh()
  const { info, error: logError } = useLogs()
  const { endDate } = useChartSettings()

  // Debug: Log the actual endDate value
  React.useEffect(() => {
    console.log('[useBacktestDataSimple] ChartSettings endDate:', endDate)
  }, [endDate])

  // State for backtest data
  const [data, setData] = React.useState<BacktestData>({
    settings: {
      calculationMethod: 'fifo',
      defaultBuyAmount: 10000000,
      currency: 'VND'
    },
    transactions: [],
    positions: []
  })
  const [currentPrices, setCurrentPrices] = React.useState<Record<string, number>>({})
  const [portfolioStats, setPortfolioStats] = React.useState<PortfolioStats | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Load data on mount only
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setData(getBacktestData())
    }
  }, [])

  // Fetch current prices when data or dependencies change
  React.useEffect(() => {
    const fetchPrices = async () => {
      try {
        const tickers = Array.from(new Set(data.transactions.map(t => t.ticker)))
        if (tickers.length === 0) return

        setLoading(true)

        console.log('[useBacktestDataSimple] Fetching historical prices:', {
          tickers,
          endDate,
          currentDate: new Date().toISOString()
        })

        const prices: Record<string, number> = {}

        // When using historical dates, make separate API calls for each ticker
        // because the API doesn't handle multiple tickers with end_date properly
        if (endDate) {
          console.log('[useBacktestDataSimple] Using separate API calls for historical data')

          for (const ticker of tickers) {
            try {
              const response = await getTickers('useBacktestDataSimple.fetchPrices', {
                symbol: ticker,
                limit: 1,
                end_date: endDate
              })

              const tickerData = response[ticker]
              if (tickerData && tickerData.length > 0) {
                const latestData = tickerData[tickerData.length - 1]
                prices[ticker] = latestData.close
                console.log(`[useBacktestDataSimple] Got historical price for ${ticker}: ${latestData.close}`)
              } else {
                console.warn(`[useBacktestDataSimple] No historical data for ${ticker} on ${endDate}`)
              }
            } catch (error) {
              console.error(`[useBacktestDataSimple] Failed to fetch historical data for ${ticker}:`, error)
            }
          }
        } else {
          // For current data, use single API call (works fine)
          const response = await getTickers('useBacktestDataSimple.fetchPrices', {
            symbol: tickers.join(','),
            limit: 1
          })

          for (const ticker of tickers) {
            const tickerData = response[ticker]
            if (tickerData && tickerData.length > 0) {
              const latestData = tickerData[tickerData.length - 1]
              prices[ticker] = latestData.close
            }
          }
        }

        setCurrentPrices(prices)
      } catch (error) {
        console.error('Failed to fetch current prices:', error)
        logError('Backtest', 'Failed to fetch current prices')
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
  }, [data.transactions, endDate, getTickers, logError])

  // Update portfolio stats when data changes
  React.useEffect(() => {
    console.log('[useBacktestDataSimple] Updating portfolio stats:', {
      endDate,
      positionsCount: data.positions.length,
      transactionsCount: data.transactions.length,
      currentPricesCount: Object.keys(currentPrices).length
    })

    // Show stats if we have transactions, even if no open positions
    if (data.transactions.length === 0) {
      setPortfolioStats(null)
      return
    }

    const stats = calculatePortfolioStats(data.positions, currentPrices, endDate, data.transactions)
    setPortfolioStats(stats)
  }, [data.positions, data.transactions, currentPrices, endDate])

  // Buy transaction handler
  const handleBuy = React.useCallback(async (
    ticker: string,
    quantity: number,
    notes?: string
  ): Promise<Transaction | null> => {
    try {
      setLoading(true)

      const price = currentPrices[ticker] ||
                   (allTickersLastData[ticker]?.[allTickersLastData[ticker].length - 1]?.close) ||
                   (allCryptoTickersLastData[ticker]?.[allCryptoTickersLastData[ticker].length - 1]?.close) ||
                   0

      console.log('useBacktestDataSimple.handleBuy:', {
        ticker,
        quantity,
        price,
        currentPrices: currentPrices[ticker],
        stockData: allTickersLastData[ticker],
        cryptoData: allCryptoTickersLastData[ticker]
      })

      if (price <= 0) {
        logError('Backtest', `No price data available for ${ticker}`)
        return null
      }

      if (quantity <= 0) {
        logError('Backtest', 'Quantity must be greater than 0')
        return null
      }

      // Use the historical date for transaction, not current date
      const transactionDate = endDate ?
        new Date(endDate).toISOString() :
        new Date().toISOString()

      console.log('[useBacktestDataSimple] Creating transaction with historical date:', {
        ticker,
        price,
        quantity,
        transactionDate,
        endDate
      })

      const transaction = addTransaction({
        type: 'buy',
        ticker,
        quantity,
        price,
        total: quantity * price,
        notes,
        date: transactionDate
      })

      const currentPosition = data.positions.find(p => p.ticker === ticker)
      console.log('useBacktestDataSimple.handleBuy debug:', {
        ticker,
        quantity,
        price,
        currentPosition,
        'ticker passed to calculateBuyUpdate': ticker
      })
      const updatedPosition = calculateBuyUpdate(currentPosition, quantity, price, 0, ticker)
      console.log('useBacktestDataSimple.updatedPosition:', updatedPosition)
      // Position is now calculated from transactions, no need to updatePosition

      // Reload data from storage
      if (typeof window !== 'undefined') {
        setData(getBacktestData())
      }

      info('Backtest', `Bought ${quantity} shares of ${ticker} at ${price.toLocaleString()} (${(quantity * price).toLocaleString()} total)`)
      return transaction

    } catch (error) {
      console.error('Buy transaction failed:', error)
      logError('Backtest', `Buy transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [currentPrices, allTickersLastData, data.positions, info, logError])

  // Sell transaction handler
  const handleSell = React.useCallback(async (
    ticker: string,
    sellPercentage: number,
    notes?: string
  ): Promise<Transaction | null> => {
    try {
      setLoading(true)

      const position = data.positions.find(p => p.ticker === ticker && p.totalShares > 0)
      if (!position) {
        logError('Backtest', `No position found for ${ticker}`)
        return null
      }

      const price = currentPrices[ticker] ||
                   (allTickersLastData[ticker]?.[allTickersLastData[ticker].length - 1]?.close) ||
                   (allCryptoTickersLastData[ticker]?.[allCryptoTickersLastData[ticker].length - 1]?.close) ||
                   0

      if (price <= 0) {
        logError('Backtest', `No price data available for ${ticker}`)
        return null
      }

      const sellQuantity = Math.floor(position.totalShares * (sellPercentage / 100))
      if (sellQuantity <= 0) {
        logError('Backtest', 'Invalid sell quantity')
        return null
      }

      const sellCalculation = calculateSell(
        position,
        sellQuantity,
        price,
        data.settings.calculationMethod,
        data.transactions
      )

      // Use the historical date for transaction, not current date
      const transactionDate = endDate ?
        new Date(endDate).toISOString() :
        new Date().toISOString()

      console.log('[useBacktestDataSimple] Creating SELL transaction with historical date:', {
        ticker,
        sellQuantity,
        price,
        transactionDate,
        endDate,
        endDateType: typeof endDate,
        'endDate exists': !!endDate
      })

      const transaction = addTransaction({
        type: 'sell',
        ticker,
        quantity: sellQuantity,
        price,
        total: sellQuantity * price,
        notes,
        date: transactionDate
      })

      const newTotalShares = Math.max(0, position.totalShares - sellQuantity)

      // Calculate the cost basis for the sold shares
      const soldCostBasis = position.totalCost * (sellQuantity / position.totalShares)

      // Calculate remaining cost basis for unsold shares
      const remainingCostBasis = position.totalCost - soldCostBasis

      console.log('[useBacktestDataSimple] Position cost adjustment:', {
        ticker,
        originalShares: position.totalShares,
        originalCost: position.totalCost,
        soldShares: sellQuantity,
        soldCostBasis,
        remainingShares: newTotalShares,
        remainingCostBasis,
        realizedPnL: sellCalculation.realizedPnL
      })

      // Position is now calculated from transactions, no need to manually update
      console.log('[useBacktestDataSimple] Position cost adjustment handled by transaction replay:', {
        ticker,
        originalShares: position.totalShares,
        originalCost: position.totalCost,
        soldShares: sellQuantity,
        soldCostBasis,
        remainingShares: newTotalShares,
        remainingCostBasis,
        realizedPnL: sellCalculation.realizedPnL
      })

      // Reload data from storage
      if (typeof window !== 'undefined') {
        setData(getBacktestData())
      }

      const pnlText = sellCalculation.realizedPnL >= 0 ? 'profit' : 'loss'
      info('Backtest', `Sold ${sellQuantity} shares of ${ticker} at ${price.toLocaleString()} (${pnlText}: ${sellCalculation.realizedPnL.toLocaleString()})`)
      return transaction

    } catch (error) {
      console.error('Sell transaction failed:', error)
      logError('Backtest', `Sell transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [data.positions, data.transactions, data.settings.calculationMethod, currentPrices, allTickersLastData, info, logError])

  // Simple export handler
  const handleExport = React.useCallback(() => {
    try {
      const exportData = exportBacktestData()
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`
      link.download = `backtest-${timestamp}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      info('Backtest', 'Data exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      logError('Backtest', 'Failed to export data')
    }
  }, [info, logError])

  // Simple import handler
  const handleImport = React.useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const importData = JSON.parse(content)

          if (!importData.version || !importData.data) {
            throw new Error('Invalid file format')
          }

          importBacktestData(importData, 'merge')

          // Reload data from storage
          if (typeof window !== 'undefined') {
            setData(getBacktestData())
          }

          info('Backtest', 'Data imported successfully')
          resolve()
        } catch (error) {
          console.error('Import failed:', error)
          logError('Backtest', `Import failed: ${error instanceof Error ? error.message : 'Invalid file'}`)
          reject(error)
        }
      }

      reader.onerror = () => {
        const error = new Error('Failed to read file')
        logError('Backtest', 'Failed to read import file')
        reject(error)
      }

      reader.readAsText(file)
    })
  }, [info, logError])

  // Simple reset handler
  const handleReset = React.useCallback(() => {
    try {
      resetBacktestData()

      // Reload data from storage
      if (typeof window !== 'undefined') {
        setData(getBacktestData())
      }

      setCurrentPrices({})
      setPortfolioStats(null)
      info('Backtest', 'All data reset successfully')
    } catch (error) {
      console.error('Reset failed:', error)
      logError('Backtest', 'Failed to reset data')
    }
  }, [info, logError])

  return {
    data,
    loading,
    portfolioStats,
    currentPrices,
    handleBuy,
    handleSell,
    handleExport,
    handleImport,
    handleReset,
  }
}