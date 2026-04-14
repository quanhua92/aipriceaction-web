import { useState, useEffect } from 'react'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { X } from 'lucide-react'

export function HistoricalDataWarningBar() {
	const { endDate } = useChartSettings()
	const { t } = useTranslation()
	const [dismissedFor, setDismissedFor] = useState<string | null>(null)

	useEffect(() => {
		if (!endDate) {
			setDismissedFor(null)
			return
		}
		const today = new Date().toISOString().slice(0, 10)
		if (endDate === today) {
			setDismissedFor(null)
		}
	}, [endDate])

	if (!endDate) return null

	const today = new Date().toISOString().slice(0, 10)
	if (endDate === today) return null

	if (dismissedFor === endDate) return null

	return (
		<div className="flex items-center justify-center gap-2 py-1 px-3 bg-amber-600/20 text-amber-300 text-xs border-b border-amber-600/30">
			<span>
				{t('common.historicalWarning.message', { date: endDate })}
			</span>
			<button
				type="button"
				onClick={() => setDismissedFor(endDate)}
				className="ml-2 p-0.5 rounded hover:bg-amber-600/30 transition-colors"
				aria-label={t('common.historicalWarning.dismiss')}
			>
				<X className="w-3 h-3" />
			</button>
		</div>
	)
}
