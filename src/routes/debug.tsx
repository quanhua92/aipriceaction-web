import { createFileRoute } from '@tanstack/react-router'
import { TickerProvider } from '@/contexts/TickerContext'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

export const Route = createFileRoute('/debug')({
  component: DebugPage,
})

function DebugPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Debug - TCX Chart</h1>
        <div className="h-[600px]">
          <TickerProvider initialTicker="TCX">
            <TradingViewChart
              ticker="TCX"
              showControls={true}
              height={600}
            />
          </TickerProvider>
        </div>
      </div>
    </div>
  )
}