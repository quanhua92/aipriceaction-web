import { createFileRoute } from '@tanstack/react-router'
import { MarketMatrix } from '@/components/MarketMatrix'
import { DateControlWidget } from '@/components/widgets/DateControlWidget'

export const Route = createFileRoute('/matrix')({
  component: MatrixPage,
})

function MatrixPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <DateControlWidget />
      <MarketMatrix />
    </div>
  )
}
