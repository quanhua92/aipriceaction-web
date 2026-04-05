import type { StockData } from '@/lib/api-client'
import type { SortBy } from '@/components/SortButtons'

export type SectionFilter = 'stocks' | 'crypto' | 'global'
export type IntervalType = '1h' | '1D' | '1W' | '1M'
export type ViewMode = 'cards' | 'table'

export interface TopPerformer {
  symbol: string
  sector: string
  price: number
  change: number  // close_changed percentage
  changeValue: number  // price change amount (if available)
  volume: number
  volumeChanged?: number | null  // volume_changed percentage
  value: number  // price * volume (traded value)
  mode: 'vn' | 'crypto' | 'yahoo'
  ma20_score?: number | null
  ma50_score?: number | null
  ma10_score?: number | null
  ma100_score?: number | null
  ma200_score?: number | null
  ma20?: number | null
  ma50?: number | null
  ma10?: number | null
  ma100?: number | null
  ma200?: number | null
}

export interface BasicTopPerformersProps {
  defaultGroup?: string
  defaultSectionFilter?: SectionFilter
  defaultInterval?: IntervalType
  defaultSortBy?: SortBy
  defaultTopCount?: TopCount // Default 20
  showControls?: boolean
  className?: string
  onTickerSelect?: (symbol: string) => void
}

export interface TopPerformerCardProps {
  performer: TopPerformer
  onClick?: () => void
}

export interface SectionFilterProps {
  value: SectionFilter
  onChange: (value: SectionFilter) => void
}

export interface IntervalButtonsProps {
  value: IntervalType
  onChange: (value: IntervalType) => void
}

export interface ViewModeToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export type TopCount = 10 | 20 | 30 | 40 | 50

export interface TopCountToggleProps {
  value: TopCount
  onChange: (value: TopCount) => void
}

export interface TopPerformerTableProps {
  performers: TopPerformer[]
  title: string
  onTickerSelect?: (symbol: string) => void
  emptyMessage: string
}

// Internal type for enriched ticker data
export interface TickerWithData {
  symbol: string
  sector: string
  stockData: StockData | undefined
  mode: 'vn' | 'crypto' | 'yahoo'
}