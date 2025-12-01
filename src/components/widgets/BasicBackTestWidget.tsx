import * as React from 'react'
import { useBacktestDataSimple } from '@/hooks/useBacktestDataSimple'
import { PerformanceStats } from '@/components/backtest/PerformanceStats'
import { BacktestControls } from '@/components/backtest/BacktestControls'
import { TransactionTable } from '@/components/backtest/TransactionTable'
import { BuyTransactionDialog } from '@/components/dialogs/BuyTransactionDialog'
import { SellTransactionDialog } from '@/components/dialogs/SellTransactionDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, Download, Upload, RotateCcw } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLogs } from '@/contexts/LogsContext'

interface BasicBackTestWidgetProps {
  className?: string
}

export function BasicBackTestWidget({ className }: BasicBackTestWidgetProps) {
  const { t } = useTranslation()
  const { info } = useLogs()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Simple local state to avoid infinite loops
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [transactionCount, setTransactionCount] = React.useState(0)

  const {
    data,
    loading,
    portfolioStats,
    currentPrices,
    handleBuy,
    handleSell,
    handleExport,
    handleImport,
    handleReset
  } = useBacktestDataSimple()

  // Initialize only once to prevent loops
  React.useEffect(() => {
    if (!isInitialized && data) {
      setIsInitialized(true)
      setTransactionCount(data.transactions.length)
    }
  }, [data, isInitialized])

  // Simple dialog states
  const [buyDialogOpen, setBuyDialogOpen] = React.useState(false)
  const [sellDialogOpen, setSellDialogOpen] = React.useState(false)

  // Handle buy transaction
  const handleBuyTransaction = React.useCallback(async (ticker: string, amount: number, notes?: string) => {
    const transaction = await handleBuy(ticker, amount, notes)
    return !!transaction
  }, [handleBuy])

  // Handle sell transaction
  const handleSellTransaction = React.useCallback(async (ticker: string, percentage: number, notes?: string) => {
    const transaction = await handleSell(ticker, percentage, notes)
    return !!transaction
  }, [handleSell])

  // Handle file import
  const handleFileImport = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await handleImport(file)
      info('Backtest', 'Data imported successfully')
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [handleImport, info])

// Simple function handlers like MarketMatrix
const handleResetData = () => {
  if (window.confirm('Are you sure you want to reset all backtest data? This action cannot be undone.')) {
    handleReset()
  }
}

  return (
    <div className={`border rounded-lg p-4 bg-card space-y-4 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{t('common.backtest.title')}</h3>
          {data.transactions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* 3-dot Menu - Exact pattern from MarketMatrix */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleResetData} className="text-red-600 dark:text-red-500">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>

      {/* Buy/Sell Controls - Moved to top */}
      <BacktestControls
        onBuyClick={() => setBuyDialogOpen(true)}
        onSellClick={() => setSellDialogOpen(true)}
        loading={loading}
        disabled={loading}
      />

      {/* Performance Statistics */}
      <PerformanceStats
        stats={portfolioStats}
        loading={loading}
      />

      {/* Transaction Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">{t('common.backtest.transactionHistory')}</h4>
        <TransactionTable
          transactions={data.transactions}
          currentPrices={currentPrices}
          maxHeight="300px"
        />
      </div>

      {/* Buy Dialog - Standalone */}
      {buyDialogOpen && (
        <BuyTransactionDialog
          onBuy={handleBuyTransaction}
          currency={data.settings.currency}
          open={buyDialogOpen}
          onOpenChange={setBuyDialogOpen}
        >
          <div style={{ display: 'none' }} />
        </BuyTransactionDialog>
      )}

      {/* Sell Dialog - Standalone */}
      {sellDialogOpen && (
        <SellTransactionDialog
          onSell={handleSellTransaction}
          currency={data.settings.currency}
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
        >
          <div style={{ display: 'none' }} />
        </SellTransactionDialog>
      )}

      </div>
  )
}