import { createFileRoute } from '@tanstack/react-router'
import { SelectTickerButton } from '@/components/buttons/SelectTickerButton'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { BasicTickerWidget } from '@/components/widgets/BasicTickerWidget'
import { BaseTradingViewChart } from '@/components/charts/BaseTradingViewChart'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

export const Route = createFileRoute('/chart/')({
  component: ChartPage,
})

function ChartPage() {
  return (
    <div className="space-y-8">
      {/* Context-based chart */}
      <TickerProvider>
        <ChartPageContent />
      </TickerProvider>

      {/* Standalone TradingViewChart with internal TickerProvider */}
      <div className="p-4 md:p-6 border-t">
        <h2 className="text-xl font-bold mb-4">Standalone Chart (VNINDEX)</h2>
        <TradingViewChart />
      </div>
    </div>
  )
}

function ChartPageContent() {
  const { chartData } = useTicker()

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chart</h1>
        <SelectTickerButton />
      </div>

      <div className="space-y-4">
        {chartData.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              Loaded {chartData.length} days of chart data
            </p>
            <BasicTickerWidget data={chartData[chartData.length - 1]} />
          </>
        )}
        <BaseTradingViewChart />
      </div>
    </div>
  )
}
