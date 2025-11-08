import { createFileRoute } from '@tanstack/react-router'
import { SelectTickerButton } from '@/components/buttons/SelectTickerButton'

export const Route = createFileRoute('/chart/')({
  component: ChartPage,
})

function ChartPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chart</h1>
      <div className="border rounded-lg p-4">
        <div className="mb-4">
          <SelectTickerButton />
        </div>
        <p>Chart content will go here</p>
      </div>
    </div>
  )
}
