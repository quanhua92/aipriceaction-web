import { Transaction, Position } from '@/lib/backtest-storage'

export interface BuyLot {
  id: string
  quantity: number
  price: number
  date: string
}

export interface SellCalculation {
  realizedPnL: number
  realizedPnLPercent: number
  remainingLots: BuyLot[]
  soldLots: Array<BuyLot & { soldQuantity: number; soldPrice: number }>
}

/**
 * Calculate FIFO (First In, First Out) sell transaction
 */
export function calculateFIFOSell(
  position: Position,
  sellQuantity: number,
  sellPrice: number,
  allTransactions: Transaction[]
): SellCalculation {
  // Get all buy transactions for this ticker, sorted by date (oldest first)
  const buyLots: BuyLot[] = allTransactions
    .filter(t => t.type === 'buy' && t.ticker === position.ticker)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => ({
      id: t.id,
      quantity: t.quantity,
      price: t.price,
      date: t.date
    }))

  // Account for previous sells
  const sellTransactions = allTransactions
    .filter(t => t.type === 'sell' && t.ticker === position.ticker)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let remainingLots = [...buyLots]
  const soldLots: Array<BuyLot & { soldQuantity: number; soldPrice: number }> = []

  // Apply previous sells to get current state
  for (const sell of sellTransactions) {
    let quantityToSell = sell.quantity
    const tempSoldLots: typeof soldLots = []

    for (let i = 0; i < remainingLots.length && quantityToSell > 0; i++) {
      const lot = remainingLots[i]
      const sellFromLot = Math.min(lot.quantity, quantityToSell)

      if (sellFromLot > 0) {
        tempSoldLots.push({
          ...lot,
          soldQuantity: sellFromLot,
          soldPrice: sell.price
        })

        remainingLots[i] = {
          ...lot,
          quantity: lot.quantity - sellFromLot
        }

        quantityToSell -= sellFromLot
      }
    }

    // Remove lots with zero quantity
    remainingLots = remainingLots.filter(lot => lot.quantity > 0)
  }

  // Now apply the new sell
  let quantityToSell = sellQuantity
  const newSoldLots: typeof soldLots = []

  for (let i = 0; i < remainingLots.length && quantityToSell > 0; i++) {
    const lot = remainingLots[i]
    const sellFromLot = Math.min(lot.quantity, quantityToSell)

    if (sellFromLot > 0) {
      newSoldLots.push({
        ...lot,
        soldQuantity: sellFromLot,
        soldPrice: sellPrice
      })

      remainingLots[i] = {
        ...lot,
        quantity: lot.quantity - sellFromLot
      }

      quantityToSell -= sellFromLot
    }
  }

  // Calculate realized P&L
  const totalRealizedPnL = newSoldLots.reduce((sum, lot) => {
    return sum + (lot.soldPrice - lot.price) * lot.soldQuantity
  }, 0)

  const totalCostBasis = newSoldLots.reduce((sum, lot) => {
    return sum + lot.price * lot.soldQuantity
  }, 0)

  const realizedPnLPercent = totalCostBasis > 0 ? (totalRealizedPnL / totalCostBasis) * 100 : 0

  // Remove lots with zero quantity
  const finalRemainingLots = remainingLots.filter(lot => lot.quantity > 0)

  return {
    realizedPnL: totalRealizedPnL,
    realizedPnLPercent,
    remainingLots: finalRemainingLots,
    soldLots: newSoldLots
  }
}

/**
 * Calculate FIFO (First In, First Out) sell transaction
 * This is the only calculation method used in the system
 */
export function calculateSell(
  position: Position,
  sellQuantity: number,
  sellPrice: number,
  allTransactions: Transaction[]
): SellCalculation {
  // Get all buy transactions for this ticker, sorted by date (oldest first)
  const buyLots: BuyLot[] = allTransactions
    .filter(t => t.type === 'buy' && t.ticker === position.ticker)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => ({
      id: t.id,
      quantity: t.quantity,
      price: t.price,
      date: t.date
    }))

  // Account for previous sells
  const sellTransactions = allTransactions
    .filter(t => t.type === 'sell' && t.ticker === position.ticker)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let remainingLots = [...buyLots]
  const soldLots: Array<BuyLot & { soldQuantity: number; soldPrice: number }> = []

  // Apply previous sells to get current state
  for (const sell of sellTransactions) {
    let quantityToSell = sell.quantity
    const tempSoldLots: typeof soldLots = []

    for (let i = 0; i < remainingLots.length && quantityToSell > 0; i++) {
      const lot = remainingLots[i]
      const sellFromThisLot = Math.min(lot.quantity, quantityToSell)

      tempSoldLots.push({
        id: lot.id,
        quantity: lot.quantity,
        price: lot.price,
        date: lot.date,
        soldQuantity: sellFromThisLot,
        soldPrice: sell.price
      })

      remainingLots[i] = {
        ...lot,
        quantity: lot.quantity - sellFromThisLot
      }

      quantityToSell -= sellFromThisLot
    }

    soldLots.push(...tempSoldLots)
    remainingLots = remainingLots.filter(lot => lot.quantity > 0)
  }

  // Calculate current sell
  let remainingQuantity = sellQuantity
  let totalCostBasis = 0
  const tempSoldLots: typeof soldLots = []

  for (let i = 0; i < remainingLots.length && remainingQuantity > 0; i++) {
    const lot = remainingLots[i]
    const sellFromThisLot = Math.min(lot.quantity, remainingQuantity)

    totalCostBasis += sellFromThisLot * lot.price

    tempSoldLots.push({
      id: lot.id,
      quantity: lot.quantity,
      price: lot.price,
      date: lot.date,
      soldQuantity: sellFromThisLot,
      soldPrice: sellPrice
    })

    remainingLots[i] = {
      ...lot,
      quantity: lot.quantity - sellFromThisLot
    }

    remainingQuantity -= sellFromThisLot
  }

  const sellValue = sellQuantity * sellPrice
  const realizedPnL = sellValue - totalCostBasis
  const realizedPnLPercent = totalCostBasis > 0 ? (realizedPnL / totalCostBasis) * 100 : 0

  const finalRemainingLots = remainingLots.filter(lot => lot.quantity > 0)

  return {
    realizedPnL,
    realizedPnLPercent,
    remainingLots: finalRemainingLots,
    soldLots: [...soldLots, ...tempSoldLots]
  }
}

/**
 * Calculate updated position after buy transaction
 */
export function calculateBuyUpdate(
  currentPosition: Position | undefined,
  buyQuantity: number,
  buyPrice: number,
  fee: number = 0,
  ticker: string = ''
): Position {
  const totalCost = buyQuantity * buyPrice + fee

  if (!currentPosition || currentPosition.totalShares === 0) {
    return {
      ticker: ticker,
      totalShares: buyQuantity,
      averageCost: buyPrice + (fee / buyQuantity),
      totalCost,
      realizedPnL: 0,
      lastUpdated: new Date().toISOString()
    }
  }

  const newTotalShares = currentPosition.totalShares + buyQuantity
  const newTotalCost = currentPosition.totalCost + totalCost
  const newAverageCost = newTotalCost / newTotalShares

  return {
    ...currentPosition,
    totalShares: newTotalShares,
    averageCost: newAverageCost,
    totalCost: newTotalCost,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Calculate portfolio statistics
 */
export interface PortfolioStats {
  totalValue: number
  totalCost: number
  totalPnL: number
  totalPnLPercent: number
  unrealizedPnL: number
  realizedPnL: number
  winningPositions: number
  losingPositions: number
  totalPositions: number
  bestPerformer: { ticker: string; percent: number } | null
  worstPerformer: { ticker: string; percent: number } | null
}

export function calculatePortfolioStats(
  positions: Position[],
  currentPrices: Record<string, number>,
  endDate?: string,
  allTransactions: Transaction[] = []
): PortfolioStats {
  console.log('[PortfolioStats] Historical date context:', endDate || 'current date (no endDate set)')
  console.log('[PortfolioStats] Input positions:', positions)
  console.log('[PortfolioStats] Current prices:', currentPrices)

  const validPositions = positions.filter(p => p.totalShares > 0)
  console.log('[PortfolioStats] Valid positions:', validPositions)

  // Calculate Total Invested = sum of all BUY transactions
  const totalInvested = allTransactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.total, 0)

  // Calculate realized P&L by calculating from transactions directly
  let realizedPnL = 0
  const tickerLots = new Map<string, Array<{ quantity: number; price: number; date: string }>>()

  // Process transactions in chronological order to calculate realized P&L
  allTransactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(transaction => {
      if (transaction.type === 'buy') {
        // Add to lots for this ticker
        if (!tickerLots.has(transaction.ticker)) {
          tickerLots.set(transaction.ticker, [])
        }
        tickerLots.get(transaction.ticker)!.push({
          quantity: transaction.quantity,
          price: transaction.price,
          date: transaction.date
        })
      } else if (transaction.type === 'sell') {
        // Calculate realized P&L using FIFO
        const lots = tickerLots.get(transaction.ticker) || []
        let remainingSellQuantity = transaction.quantity
        let totalCostBasis = 0

        for (const lot of lots) {
          if (remainingSellQuantity <= 0) break

          const quantityFromLot = Math.min(lot.quantity, remainingSellQuantity)
          totalCostBasis += quantityFromLot * lot.price
          remainingSellQuantity -= quantityFromLot
          lot.quantity -= quantityFromLot
        }

        // Remove empty lots
        if (tickerLots.has(transaction.ticker)) {
          tickerLots.set(
            transaction.ticker,
            tickerLots.get(transaction.ticker)!.filter(lot => lot.quantity > 0)
          )
        }

        const sellRevenue = transaction.quantity * transaction.price
        const loss = sellRevenue - totalCostBasis
        realizedPnL += loss

        console.log(`[RealizedPnL] ${transaction.ticker} sell:`, {
          quantity: transaction.quantity,
          sellPrice: transaction.price,
          sellRevenue,
          costBasis: totalCostBasis,
          loss
        })
      }
    })

  console.log('[PortfolioStats] Transaction-based calculations:', {
    totalInvested,
    realizedPnL,
    totalBuyTransactions: allTransactions.filter(t => t.type === 'buy').length,
    totalSellTransactions: allTransactions.filter(t => t.type === 'sell').length
  })

  let totalValue = 0
  let unrealizedPnL = 0
  let winningPositions = 0
  let losingPositions = 0
  let bestPerformer: { ticker: string; percent: number } | null = null
  let worstPerformer: { ticker: string; percent: number } | null = null

  const positionPerformance: Array<{ ticker: string; percent: number }> = []

  // Calculate trade performance from all sell transactions
  const tradePerformance: Array<{ ticker: string; percent: number; realized: number }> = []

  // Process sell transactions to count winning/losing trades
  allTransactions
    .filter(t => t.type === 'sell')
    .forEach(sellTransaction => {
      // Calculate cost basis for this sell using FIFO
      const buyTransactions = allTransactions
        .filter(t =>
          t.type === 'buy' &&
          t.ticker === sellTransaction.ticker &&
          new Date(t.date).getTime() <= new Date(sellTransaction.date).getTime()
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      if (buyTransactions.length > 0) {
        // Simple FIFO cost basis calculation
        const avgBuyPrice = buyTransactions.reduce((sum, t) => sum + t.price, 0) / buyTransactions.length
        const sellPrice = sellTransaction.price
        const percent = ((sellPrice - avgBuyPrice) / avgBuyPrice) * 100
        const realized = (sellPrice - avgBuyPrice) * sellTransaction.quantity

        tradePerformance.push({
          ticker: sellTransaction.ticker,
          percent,
          realized
        })

        if (realized > 0) winningPositions++
        else if (realized < 0) losingPositions++
      }
    })

  // Only calculate unrealized P&L for positions that still have shares
  for (const position of validPositions) {
    const currentPrice = currentPrices[position.ticker] || position.currentPrice || 0
    const currentValue = position.totalShares * currentPrice
    const unrealized = currentValue - position.totalCost

    totalValue += currentValue
    unrealizedPnL += unrealized

    const percent = position.totalCost > 0 ? (unrealized / position.totalCost) * 100 : 0
    positionPerformance.push({ ticker: position.ticker, percent })
  }

  // Combine open position performance with completed trade performance for best/worst
  const allPerformance = [
    ...positionPerformance.map(p => ({ ticker: p.ticker, percent: p.percent })),
    ...tradePerformance.map(t => ({ ticker: `${t.ticker} (closed)`, percent: t.percent }))
  ]

  // Find best and worst performers from all trades
  allPerformance.sort((a, b) => b.percent - a.percent)
  if (allPerformance.length > 0) {
    bestPerformer = {
      ticker: allPerformance[0].ticker.replace(' (closed)', ''),
      percent: allPerformance[0].percent
    }
    worstPerformer = {
      ticker: allPerformance[allPerformance.length - 1].ticker.replace(' (closed)', ''),
      percent: allPerformance[allPerformance.length - 1].percent
    }
  }

  const totalPnL = realizedPnL + unrealizedPnL
  // Calculate P&L percentage based on total invested (all buy transactions)
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  console.log('[PortfolioStats] Final calculations:', {
    totalValue,
    totalInvested,
    totalPnL,
    realizedPnL,
    unrealizedPnL,
    totalPnLPercent,
    hasOpenPositions: validPositions.length > 0
  })

  // Calculate total completed trades (sell transactions)
  const totalCompletedTrades = allTransactions.filter(t => t.type === 'sell').length

  console.log('[PortfolioStats] Final calculations:', {
    totalValue,
    totalInvested,
    totalPnL,
    realizedPnL,
    unrealizedPnL,
    totalPnLPercent,
    hasOpenPositions: validPositions.length > 0,
    totalCompletedTrades,
    winningPositions,
    losingPositions
  })

  // Always return stats if we have transactions, even if no open positions
  return {
    totalValue,
    totalCost: totalInvested, // Show total invested instead of remaining position cost
    totalPnL,
    totalPnLPercent,
    unrealizedPnL,
    realizedPnL,
    winningPositions,
    losingPositions,
    totalPositions: totalCompletedTrades, // Show total completed trades instead of open positions
    bestPerformer,
    worstPerformer
  }
}