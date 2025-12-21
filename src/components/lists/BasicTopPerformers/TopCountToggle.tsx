import * as React from 'react'
import type { TopCountToggleProps } from './types'

export function TopCountToggle({ value, onChange }: TopCountToggleProps) {
  const counts: Array<10 | 20 | 30> = [10, 20, 30]

  return (
    <div className="flex gap-1">
      {counts.map(count => (
        <button
          key={count}
          onClick={() => onChange(count)}
          className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
            value === count
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {count}
        </button>
      ))}
    </div>
  )
}