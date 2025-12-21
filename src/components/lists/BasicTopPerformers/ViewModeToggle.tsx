import * as React from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { ViewModeToggleProps } from './types'

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-1">
      <button
        onClick={() => onChange('cards')}
        className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
          value === 'cards'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted hover:bg-muted/80'
        }`}
      >
        {t('common.topPerformers.viewMode.cards')}
      </button>
      <button
        onClick={() => onChange('table')}
        className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
          value === 'table'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted hover:bg-muted/80'
        }`}
      >
        {t('common.topPerformers.viewMode.table')}
      </button>
    </div>
  )
}