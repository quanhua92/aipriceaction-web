import * as React from 'react'
import { useTranslation } from '@/hooks/useTranslation'
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
  availableOptions = ['volume', 'gainers', 'losers', 'value', 'az', 'ma20', 'ma50', 'ma100', 'ma200'],
  margin = 'top',
  className = ''
}: SortButtonsProps) {
  const { t } = useTranslation()

  // Define the order and display of buttons
  const defaultOrder: SortBy[] = [
    'volume', 'gainers', 'losers', // Row 1
    'value', 'az', 'ma20',         // Row 2
    'ma50', 'ma100', 'ma200'       // Row 3 (MA scores)
  ]

  const marginClass = margin === 'top' ? 'mt-3' : 'mb-3'

  // Filter and sort buttons based on available options and defined order
  const filteredButtons = defaultOrder.filter(option =>
    availableOptions.includes(option)
  )

  const renderButton = (option: SortBy) => {
    const isActive = value === option

    return (
      <button
        key={option}
        onClick={() => onChange(option)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
      >
        {t(`dialogs.selectTicker.sortBy.${option}`)}
      </button>
    )
  }

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${marginClass} shrink-0 ${className}`}>
      {filteredButtons.map(renderButton)}
    </div>
  )
}