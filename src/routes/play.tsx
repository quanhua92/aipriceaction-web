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
    <PlaygroundDataProvider
      initialTicker={ticker}
      initialEndDate={endDate}
      initialSecondaryTicker={'VNINDEX'}
      navigate={navigate}
    >
      <div className="space-y-4">
        {/* Top: Info */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
          <PlaygroundInfoPanel />
        </div>

        {/* Middle: Chart */}
        <div className="px-4 md:px-6 py-2">
          <PlaygroundChart />
        </div>

        {/* Bottom: Controls */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
          <PlaygroundControls />
        </div>
      </div>
    </PlaygroundDataProvider>
  )
}