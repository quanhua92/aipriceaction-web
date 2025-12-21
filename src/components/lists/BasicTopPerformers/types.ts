import type { StockData } from '@/lib/api-client'
import type { SortBy } from '@/components/SortButtons'

export type SectionFilter = 'all' | 'stocks' | 'crypto'
export type IntervalType = '1H' | '1D' | '1W'

export interface TopPerformer {
  symbol: string
  sector: string
  price: number
  change: number  // close_changed percentage
  changeValue: number  // price change amount (if available)
  volume: number
  volumeChanged?: number | null  // volume_changed percentage
  value: number  // price * volume (traded value)
  mode: 'vn' | 'crypto'
  ma20_score?: number | null
  ma50_score?: number | null
  ma10_score?: number | null
  ma20?: number | null
  ma50?: number | null
  ma10?: number | null
}

export interface BasicTopPerformersProps {
  defaultGroup?: string
  defaultSectionFilter?: SectionFilter
  defaultInterval?: IntervalType
  defaultSortBy?: SortBy
  maxItems?: number // Default 10
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

// Internal type for enriched ticker data
export interface TickerWithData {
  symbol: string
  sector: string
  stockData: StockData | undefined
  mode: 'vn' | 'crypto'
}