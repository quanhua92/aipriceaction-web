import * as React from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useAPI } from '@/contexts/APIContext'
import type { SortBy } from '@/components/lists/SortableTickerList'

export interface SortButtonsProps {
  /** Current sort value */
  value: SortBy
  /** Callback when sort changes */
  onChange: (value: SortBy) => void
  /** Available sort options (defaults to volume, gainers, losers, value, ma20, az) */
  availableOptions?: SortBy[]
  /** Margin class (mt-3 for top, mb-3 for bottom) */
  margin?: 'top' | 'bottom'
  /** Additional CSS classes */
  className?: string
}

// Re-export SortBy type for convenience
export { type SortBy }

export function SortButtons({
  value,
  onChange,
  availableOptions = ['volume', 'gainers', 'losers', 'value', 'ma10', 'ma20', 'ma50', 'ma100', 'az'],
  margin = 'top',
  className = ''
}: SortButtonsProps) {
  const { t } = useTranslation()
  const { ema } = useAPI()

  // Define the order and display of buttons
  const defaultOrder: SortBy[] = [
    'volume', 'gainers', 'losers', // Row 1
    'value', 'az',                // Row 2
    'ma10', 'ma20',               // Row 3 (MA scores)
    'ma50', 'ma100'               // Row 4 (MA scores)
  ]

  const marginClass = margin === 'top' ? 'mt-3' : 'mb-3'

  // Filter and sort buttons based on available options and defined order
  const filteredButtons = defaultOrder.filter(option =>
    availableOptions.includes(option)
  )

  const getLabel = (option: SortBy) => {
    const label = t(`dialogs.selectTicker.sortBy.${option}`)
    return ema ? label.replace('MA', 'EMA') : label
  }

  const isMAOption = (option: SortBy) => option.startsWith('ma')
  const isLongMA = (option: SortBy) => option === 'ma100' || option === 'ma200'

  const renderButton = (option: SortBy) => {
    const isActive = value === option
    const label = isMAOption(option) ? getLabel(option) : t(`dialogs.selectTicker.sortBy.${option}`)

    return (
      <button
        key={option}
        onClick={() => onChange(option)}
        className={`${isLongMA(option) ? 'px-1.5 text-[11px]' : isMAOption(option) ? 'px-2' : 'px-3'} py-1 text-xs font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${marginClass} shrink-0 ${className}`}>
      {filteredButtons.map(renderButton)}
    </div>
  )
}