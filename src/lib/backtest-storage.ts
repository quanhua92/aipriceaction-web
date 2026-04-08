import { BACKTEST_STORAGE_KEY } from '@/lib/constants'
import { SafeLocalStorage } from '@/lib/localStorage'

export interface BacktestSettings {
  currency: 'VND' | 'USD'
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell'
  ticker: string
  quantity: number
  price: number
  total: number
  date: string // ISO datetime
  fee?: number
  notes?: string
}

export interface Position {
  ticker: string
  totalShares: number
  averageCost: number // weighted average buy price
  totalCost: number // total investment including fees
  currentPrice?: number // latest market price
  currentValue?: number
  unrealizedPnL?: number
  realizedPnL: number
  lastUpdated: string
}

export interface BacktestData {
  settings: BacktestSettings
  transactions: Transaction[]
  positions: Position[]
}

export interface BacktestExport {
  version: string
  exportedAt: string
  data: BacktestData
  metadata: {
    totalTransactions: number
    totalPositions: number
    dateRange: { start: string; end: string }
  }
}

const DEFAULT_SETTINGS: BacktestSettings = {
  currency: 'VND'
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Calculate positions by replaying all transactions
 * This ensures positions are always accurate and eliminates need for storage
 */
export function calculatePositionsFromTransactions(transactions: Transaction[]): Position[] {
  const positions = new Map<string, Position>()

  // Sort transactions by date to ensure proper order
  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  console.log('[PositionCalculation] Replaying transactions:', sortedTransactions.length)

  for (const transaction of sortedTransactions) {
    const { ticker, type, quantity, price, total, date } = transaction

    if (type === 'buy') {
      const existingPosition = positions.get(ticker)

      if (!existingPosition || existingPosition.totalShares === 0) {
        // New position
        positions.set(ticker, {
          ticker,
          totalShares: quantity,
          averageCost: price,
          totalCost: total,
          realizedPnL: 0,
          lastUpdated: date
        })
      } else {
        // Add to existing position
        const newTotalShares = existingPosition.totalShares + quantity
        const newTotalCost = existingPosition.totalCost + total
        const newAverageCost = newTotalCost / newTotalShares

        positions.set(ticker, {
          ...existingPosition,
          totalShares: newTotalShares,
          averageCost: newAverageCost,
          totalCost: newTotalCost,
          lastUpdated: date
        })
      }
    } else if (type === 'sell') {
      const position = positions.get(ticker)

      if (!position || position.totalShares === 0) {
        console.warn(`[PositionCalculation] Sell transaction for position with no shares: ${ticker}`)
        continue
      }

      if (quantity > position.totalShares) {
        console.warn(`[PositionCalculation] Selling more shares than owned: ${ticker}`)
        continue
      }

      // Calculate realized P&L for this sell using FIFO
      const sellRevenue = quantity * price
      const costBasis = quantity * position.averageCost
      const realizedPnL = sellRevenue - costBasis

      const newTotalShares = position.totalShares - quantity

      if (newTotalShares === 0) {
        // Position closed
        positions.delete(ticker)
      } else {
        // Reduce position cost proportionally
        const remainingCostRatio = newTotalShares / position.totalShares
        const newTotalCost = position.totalCost * remainingCostRatio
        // averageCost stays the same for remaining shares

        positions.set(ticker, {
          ...position,
          totalShares: newTotalShares,
          totalCost: newTotalCost,
          realizedPnL: position.realizedPnL + realizedPnL,
          lastUpdated: date
        })
      }
    }
  }

  const result = Array.from(positions.values())
  console.log('[PositionCalculation] Calculated positions:', result)

  return result
}

export function getBacktestData(): BacktestData {
  try {
    const stored = SafeLocalStorage.getItem(BACKTEST_STORAGE_KEY)
    if (!stored) {
      return {
        settings: DEFAULT_SETTINGS,
        transactions: [],
        positions: []
      }
    }

    const data = JSON.parse(stored) as BacktestData

    // Calculate positions from transactions instead of storing them
    const calculatedPositions = calculatePositionsFromTransactions(data.transactions)

    return {
      ...data,
      positions: calculatedPositions
    }
  } catch (error) {
    console.error('Failed to parse backtest data:', error)
    return {
      settings: DEFAULT_SETTINGS,
      transactions: [],
      positions: []
    }
  }
}

export function saveBacktestData(data: BacktestData): void {
  try {
    // Don't save positions - they are calculated from transactions
    const dataToSave = {
      settings: data.settings,
      transactions: data.transactions
    }
    SafeLocalStorage.setItem(BACKTEST_STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.error('Failed to save backtest data:', error)
  }
}

export function addTransaction(transaction: Omit<Transaction, 'id' | 'date'> & { date?: string }): Transaction {
  const backtestData = getBacktestData()
  const newTransaction: Transaction = {
    ...transaction,
    id: generateId(),
    date: transaction.date || new Date().toISOString()
  }

  backtestData.transactions.push(newTransaction)
  saveBacktestData(backtestData)

  return newTransaction
}

// updatePosition removed - positions are now calculated from transactions

export function deleteTransaction(transactionId: string): boolean {
  const backtestData = getBacktestData()
  const index = backtestData.transactions.findIndex(t => t.id === transactionId)

  if (index >= 0) {
    backtestData.transactions.splice(index, 1)
    saveBacktestData(backtestData)
    return true
  }

  return false
}

export function updateSettings(settings: Partial<BacktestSettings>): void {
  const backtestData = getBacktestData()
  backtestData.settings = { ...backtestData.settings, ...settings }
  saveBacktestData(backtestData)
}

export function resetBacktestData(): void {
  saveBacktestData({
    settings: DEFAULT_SETTINGS,
    transactions: [],
    positions: []
  })
}

export function exportBacktestData(): BacktestExport {
  const data = getBacktestData()
  const transactions = data.transactions

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data,
    metadata: {
      totalTransactions: transactions.length,
      totalPositions: data.positions.length,
      dateRange: {
        start: transactions.length > 0 ? transactions[0].date : new Date().toISOString(),
        end: transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString()
      }
    }
  }
}

export function importBacktestData(importData: BacktestExport, mergeMode: 'replace' | 'merge' = 'replace'): void {
  try {
    // Validate import data structure
    if (!importData || !importData.data) {
      throw new Error('Invalid import file format')
    }

    const { settings, transactions, positions } = importData.data

    // Validate individual data structures
    if (!settings || !Array.isArray(transactions) || !Array.isArray(positions)) {
      throw new Error('Invalid data structure in import file')
    }

    let newData: BacktestData

    if (mergeMode === 'merge') {
      const existingData = getBacktestData()
      newData = {
        settings: { ...existingData.settings, ...settings },
        transactions: [...existingData.transactions, ...transactions],
        positions: [...existingData.positions, ...positions]
      }
    } else {
      newData = {
        settings,
        transactions,
        positions
      }
    }

    saveBacktestData(newData)
  } catch (error) {
    console.error('Failed to import backtest data:', error)
    throw error
  }
}