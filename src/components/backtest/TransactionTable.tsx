import * as React from 'react'
import { formatPrice, parseUTCISOString, formatToVietnamDate } from '@/lib/format'
import { getPriceChangeColor } from '@/lib/colors'
import { Transaction } from '@/lib/backtest-storage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react'

interface TransactionTableProps {
  transactions: Transaction[]
  currentPrices: Record<string, number>
  onDeleteTransaction?: (transactionId: string) => void
  maxHeight?: string
  className?: string
}

export function TransactionTable({
  transactions,
  currentPrices,
  onDeleteTransaction,
  maxHeight = "400px",
  className
}: TransactionTableProps) {
  // Sort transactions by date (newest first)
  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [transactions])

  // Calculate gain/loss for sell transactions
  const getGainLossInfo = React.useCallback((transaction: Transaction, allTransactions: Transaction[]) => {
    if (transaction.type === 'buy') return null

    // Get all buy transactions for this ticker that happened before this sell
    const buyTransactions = allTransactions
      .filter(t =>
        t.type === 'buy' &&
        t.ticker === transaction.ticker &&
        new Date(t.date).getTime() <= new Date(transaction.date).getTime()
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Oldest first (FIFO)

    if (buyTransactions.length === 0) {
      console.warn(`[TransactionTable] No buy transactions found for sell of ${transaction.ticker}`)
      return null
    }

    // Calculate cost basis using FIFO method
    let remainingSellQuantity = transaction.quantity
    let totalCostBasis = 0
    let buyIndex = 0

    while (remainingSellQuantity > 0 && buyIndex < buyTransactions.length) {
      const buyTransaction = buyTransactions[buyIndex]
      const quantityFromThisBuy = Math.min(buyTransaction.quantity, remainingSellQuantity)

      totalCostBasis += quantityFromThisBuy * buyTransaction.price
      remainingSellQuantity -= quantityFromThisBuy
      buyIndex++
    }

    const sellValue = transaction.quantity * transaction.price
    const realizedGainLoss = sellValue - totalCostBasis
    const realizedGainLossPercent = totalCostBasis > 0 ? (realizedGainLoss / totalCostBasis) * 100 : 0

    console.log(`[TransactionTable] Calculated gain/loss for ${transaction.ticker}:`, {
      sellValue,
      totalCostBasis,
      realizedGainLoss,
      realizedGainLossPercent,
      sellQuantity: transaction.quantity,
      sellPrice: transaction.price
    })

    return {
      amount: realizedGainLoss,
      percent: realizedGainLossPercent
    }
  }, [])

  // Mobile card view
  const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
    const gainLossInfo = getGainLossInfo(transaction, transactions)
    const isBuy = transaction.type === 'buy'

    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={isBuy ? "default" : "secondary"} className="text-xs">
                {isBuy ? "BUY" : "SELL"}
              </Badge>
              <span className="font-semibold">{transaction.ticker}</span>
            </div>
            {onDeleteTransaction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTransaction(transaction.id)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Date</p>
              <p className="font-medium">{formatToVietnamDate(parseUTCISOString(transaction.date))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Quantity</p>
              <p className="font-medium">{transaction.quantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Price</p>
              <p className="font-medium">{formatPrice(transaction.price, { mode: 'vn' })}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="font-medium">{formatPrice(transaction.total, { mode: 'vn' })}</p>
            </div>
            {!isBuy && gainLossInfo && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Gain/Loss</p>
                <div className="flex items-center gap-1">
                  {gainLossInfo.amount >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
                  )}
                  <span className={`font-medium ${getPriceChangeColor(gainLossInfo.percent)}`}>
                    {gainLossInfo.percent >= 0 ? '+' : ''}{gainLossInfo.percent.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {transaction.notes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-muted-foreground text-xs">{transaction.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm font-medium mb-1">No transactions yet</p>
          <p className="text-xs">Start by buying or selling securities</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Desktop table view */}
      <div className="hidden lg:block">
        <div className="border rounded-lg overflow-hidden">
          <div style={{ maxHeight, overflowY: 'auto' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Gain/Loss %</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => {
                  const gainLossInfo = getGainLossInfo(transaction, transactions)
                  const isBuy = transaction.type === 'buy'

                  return (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant={isBuy ? "default" : "secondary"} className="text-xs">
                          {isBuy ? "BUY" : "SELL"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.ticker}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatToVietnamDate(parseUTCISOString(transaction.date))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {transaction.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(transaction.price, { mode: 'vn' })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatPrice(transaction.total, { mode: 'vn' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isBuy && gainLossInfo ? (
                          <div className="flex items-center justify-end gap-1">
                            {gainLossInfo.amount >= 0 ? (
                              <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
                            )}
                            <span className={`font-medium text-sm ${getPriceChangeColor(gainLossInfo.percent)}`}>
                              {gainLossInfo.percent >= 0 ? '+' : ''}{gainLossInfo.percent.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {onDeleteTransaction && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTransaction(transaction.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden">
        <div style={{ maxHeight, overflowY: 'auto' }}>
          {sortedTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>
    </div>
  )
}