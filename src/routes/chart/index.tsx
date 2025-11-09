import { createFileRoute } from '@tanstack/react-router'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { BasicTickerWidget } from '@/components/widgets/BasicTickerWidget'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

export const Route = createFileRoute('/chart/')({
  component: ChartPage,
})

function ChartPage() {
  return (
    <div className="space-y-8">
      <TickerProvider>
        <ChartPageContent />
      </TickerProvider>

      <div className="p-4 md:p-6 border-t">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TradingViewChart ticker="VNINDEX" />
          <TradingViewChart ticker="STB" />
        </div>
      </div>
    </div>
  )
}

function ChartPageContent() {
  const { chartData } = useTicker()

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chart</h1>
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
      </div>
    </div>
  )
}
