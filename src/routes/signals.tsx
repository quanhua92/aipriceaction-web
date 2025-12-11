import { createFileRoute } from '@tanstack/react-router'
import { TrendSignal } from '@/components/TrendSignal'

export const Route = createFileRoute('/signals')({
  component: TrendSignal,
})