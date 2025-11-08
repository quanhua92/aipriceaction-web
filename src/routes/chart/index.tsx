import { createFileRoute } from '@tanstack/react-router'
import { SelectTickerButton } from '@/components/buttons/SelectTickerButton'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { BasicTickerWidget } from '@/components/widgets/BasicTickerWidget'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/chart/')({
  component: ChartPage,
})

function ChartPage() {
  return (
    <TickerProvider>
      <ChartPageContent />
    </TickerProvider>
  )
}

function ChartPageContent() {
  const { selectedTicker, chartData, loading, error } = useTicker()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chart</h1>
      <div className="border rounded-lg p-4">
        <div className="mb-4">
          <SelectTickerButton />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading chart data...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Loaded {chartData.length} days of chart data
            </p>
            <BasicTickerWidget data={chartData[chartData.length - 1]} />
          </div>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No chart data available
          </div>
        )}
      </div>
    </div>
  )
}
