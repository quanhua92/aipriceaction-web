import { createFileRoute } from '@tanstack/react-router'
import { PlaygroundDataProvider } from '@/components/playground/PlaygroundDataProvider'
import { PlaygroundInfoPanel } from '@/components/playground/PlaygroundInfoPanel'
import { PlaygroundControls } from '@/components/playground/PlaygroundControls'
import { PlaygroundChart } from '@/components/playground/PlaygroundChart'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/play')({
  component: PlayPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ticker: (search.ticker as string) || undefined,
    endDate: (search.endDate as string) || undefined,
  }),
})

function PlayPage() {
  const { ticker, endDate } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <PlaygroundDataProvider initialTicker={ticker} initialEndDate={endDate} navigate={navigate}>
      <div className="space-y-8">
        {/* Top: Info */}
        <div className="p-4 md:p-6">
          <PlaygroundInfoPanel />
        </div>

        {/* Middle: Chart */}
        <div className="p-4 md:p-6">
          <PlaygroundChart />
        </div>

        {/* Bottom: Controls */}
        <div className="p-4 md:p-6">
          <PlaygroundControls />
        </div>
      </div>
    </PlaygroundDataProvider>
  )
}