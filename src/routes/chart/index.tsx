import { createFileRoute } from '@tanstack/react-router'
import { SelectTickerButton } from '@/components/buttons/SelectTickerButton'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'

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
  const { selectedTicker } = useTicker()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chart</h1>
      <div className="border rounded-lg p-4">
        <div className="mb-4">
          <SelectTickerButton />
        </div>
        <p>{selectedTicker}</p>
      </div>
    </div>
  )
}
