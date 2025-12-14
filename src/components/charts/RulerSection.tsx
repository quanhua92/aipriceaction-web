import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { type StockData } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
	formatPrice,
	formatToVietnamDateShort,
	formatToVietnamDateTimeShort,
	formatToVietnamMonthDay,
	parseUTCISOString,
} from '@/lib/format'
import { X } from 'lucide-react'

interface RulerSectionProps {
	data: StockData[]
	crosshairData: StockData | null
	latestData: StockData | null
}

export function RulerSection({ data, crosshairData, latestData }: RulerSectionProps) {
	const { t } = useTranslation()
	const {
		rulerTimeA,
		rulerTimeB,
		setRulerTimeA,
		setRulerTimeB,
		clearRuler,
	} = useChartSettings()

	// Find data points by time
	const findDataByTime = (timeStr?: string): StockData | null => {
		if (!timeStr) return null
		return data.find((point) => point.time === timeStr) || null
	}

	const pointA = findDataByTime(rulerTimeA)
	const pointB = findDataByTime(rulerTimeB)

	// Calculate differences if both points exist
	const percentDiff = pointA && pointB
		? ((pointB.close - pointA.close) / pointA.close) * 100
		: null

	// Handle time capture from crosshair or latest data
	const handleSetPointA = () => {
		const currentTime = crosshairData?.time || latestData?.time
		if (currentTime) setRulerTimeA(currentTime)
	}

	const handleSetPointB = () => {
		const currentTime = crosshairData?.time || latestData?.time
		if (currentTime) setRulerTimeB(currentTime)
	}

	return (
		<div className="flex items-center justify-between gap-2">
			{/* A and B buttons on one line with date and price */}
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					variant={rulerTimeA ? 'default' : 'outline'}
					onClick={handleSetPointA}
					className="h-6 px-2 text-xs min-w-0"
				>
					{pointA ? `A: ${formatToVietnamMonthDay(parseUTCISOString(pointA.time))} ${formatPrice(pointA.close, pointA)}` : `A: ${t('common.ruler.setPointA')}`}
				</Button>
				{rulerTimeA && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setRulerTimeA(undefined)}
						className="h-5 w-5 p-0 hover:bg-destructive/10 flex-shrink-0"
						title={t('common.ruler.clear')}
					>
						<X className="h-3 w-3" />
					</Button>
				)}

				<Button
					size="sm"
					variant={rulerTimeB ? 'default' : 'outline'}
					onClick={handleSetPointB}
					className="h-6 px-2 text-xs min-w-0"
				>
					{pointB ? `B: ${formatToVietnamMonthDay(parseUTCISOString(pointB.time))} ${formatPrice(pointB.close, pointB)}` : `B: ${t('common.ruler.setPointB')}`}
				</Button>
				{rulerTimeB && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setRulerTimeB(undefined)}
						className="h-5 w-5 p-0 hover:bg-destructive/10 flex-shrink-0"
						title={t('common.ruler.clear')}
					>
						<X className="h-3 w-3" />
					</Button>
				)}
			</div>

			{/* Difference display */}
			{percentDiff !== null && (
				<span className={`text-sm font-medium ${percentDiff >= 0 ? 'text-green-600' : 'text-red-600'} flex-shrink-0`}>
					{percentDiff >= 0 ? '+' : ''}{percentDiff.toFixed(2)}%
				</span>
			)}
		</div>
	)
}