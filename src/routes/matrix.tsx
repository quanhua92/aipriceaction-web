import { createFileRoute } from '@tanstack/react-router'
import { MarketMatrix } from '@/components/MarketMatrix'

export const Route = createFileRoute('/matrix')({
  component: MatrixPage,
})

function MatrixPage() {
  return (
    <div className="p-4 md:p-6">
      <MarketMatrix />
    </div>
  )
}
