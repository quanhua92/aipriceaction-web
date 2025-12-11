import { createFileRoute } from '@tanstack/react-router'
import { TrendSignal } from '@/components/TrendSignal'
import { DateControlWidget } from '@/components/widgets/DateControlWidget'

export const Route = createFileRoute('/signals')({
  component: SignalsPage,
})

function SignalsPage() {
  return (
    <div>
      <div className="p-4 md:p-6">
        <DateControlWidget />
      </div>
      <TrendSignal />
    </div>
  )
}