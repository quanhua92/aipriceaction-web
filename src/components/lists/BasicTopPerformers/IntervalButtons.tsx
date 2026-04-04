import * as React from 'react'
import type { IntervalButtonsProps } from './types'

export function IntervalButtons({ value, onChange }: IntervalButtonsProps) {
  const intervals: Array<'1h' | '1D' | '1W' | '1M'> = ['1h', '1D', '1W', '1M']

  return (
    <div className="flex gap-1">
      {intervals.map(interval => (
        <button
          key={interval}
          onClick={() => onChange(interval)}
          className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
            value === interval
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {interval}
        </button>
      ))}
    </div>
  )
}