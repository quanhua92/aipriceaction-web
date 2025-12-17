import { createFileRoute } from '@tanstack/react-router'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { TrendSignalTable } from '@/components/TrendSignalTable'
import { SelectTickerButton } from '@/components/buttons/SelectTickerButton'
import { useMemo } from 'react'

export const Route = createFileRoute('/debug')({
  component: DebugPage,
})

function DebugPageContent() {
  const { selectedTicker } = useTicker()

  // Memoize tickers array to prevent unnecessary re-renders
  const tickers = useMemo(() => [selectedTicker], [selectedTicker])

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">Debug - Chart & TrendSignalTable</h1>
          {/* Ticker Selector using SelectTickerButton */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ticker:</span>
            <SelectTickerButton />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart Section */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Chart</h2>
            <div className="h-[600px]">
              <TradingViewChart
                ticker={selectedTicker}
                showControls={true}
                height={600}
              />
            </div>
          </div>

          {/* TrendSignalTable Section */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Historical Trend Signals</h2>
            <div style={{ height: '600px', overflowY: 'auto' }}>
              <TrendSignalTable
                tickers={tickers}
                maxDays={40}
                buyPeriod={20}
                sellPeriod={10}
                interval="1D"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DebugPage() {
  return (
    <TickerProvider initialTicker="MWG">
      <DebugPageContent />
    </TickerProvider>
  )
}