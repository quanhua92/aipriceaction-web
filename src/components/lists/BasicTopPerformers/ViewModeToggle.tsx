import * as React from 'react'
import { Toggle } from '@/components/ui/toggle'
import { useTranslation } from '@/hooks/useTranslation'
import type { ViewModeToggleProps } from './types'

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 mb-3">
      <Toggle
        pressed={value === 'cards'}
        onPressedChange={() => onChange('cards')}
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs font-medium data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:hover:bg-green-700 transition-colors"
      >
        {t('common.topPerformers.viewMode.cards')}
      </Toggle>
      <Toggle
        pressed={value === 'table'}
        onPressedChange={() => onChange('table')}
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs font-medium data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:hover:bg-green-700 transition-colors"
      >
        {t('common.topPerformers.viewMode.table')}
      </Toggle>
    </div>
  )
}