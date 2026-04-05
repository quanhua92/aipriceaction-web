import type { SectionFilterProps } from './types'
import { useTranslation } from '@/hooks/useTranslation'

export function SectionFilter({ value, onChange }: SectionFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 gap-1.5 mb-2 shrink-0">
      <button
        onClick={() => onChange('stocks')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          value === 'stocks'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
      >
        {t('dialogs.selectTicker.filters.stocks')}
      </button>
      <button
        onClick={() => onChange('crypto')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          value === 'crypto'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
      >
        {t('dialogs.selectTicker.filters.crypto')}
      </button>
      <button
        onClick={() => onChange('global')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          value === 'global'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
      >
        {t('dialogs.selectTicker.filters.global')}
      </button>
    </div>
  )
}
