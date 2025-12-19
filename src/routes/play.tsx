import { createFileRoute } from '@tanstack/react-router'
import { PlaygroundDataProvider } from '@/components/playground/PlaygroundDataProvider'
import { PlaygroundInfoPanel } from '@/components/playground/PlaygroundInfoPanel'
import { PlaygroundControls } from '@/components/playground/PlaygroundControls'
import { PlaygroundChart } from '@/components/playground/PlaygroundChart'
import { PlaygroundDescription } from '@/components/playground/PlaygroundDescription'
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
    <div className="space-y-4">
      {/* Description Section */}
      <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
        <div className="container mx-auto p-6 md:p-8">
          <PlaygroundDescription />
        </div>
      </div>

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
    </div>
  )
}