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
				{/* A button with X */}
				<div className="flex items-center">
					{rulerTimeA ? (
						<>
							<Button
								size="sm"
								variant="default"
								onClick={handleSetPointA}
								className="h-6 px-2 text-xs min-w-0 rounded-r-none"
							>
								{pointA && pointA.time ? `A: ${formatToVietnamMonthDay(parseUTCISOString(pointA.time))} ${formatPrice(pointA.close, pointA)}` : `A: ${t('common.ruler.setPointA')}`}
							</Button>
							<Button
								variant="default"
								size="sm"
								onClick={() => setRulerTimeA(undefined)}
								className="h-6 w-4 p-0 hover:bg-destructive/20 flex-shrink-0 rounded-l-none"
								title={t('common.ruler.clear')}
							>
								<X className="h-2 w-2" />
							</Button>
						</>
					) : (
						<Button
							size="sm"
							variant="outline"
							onClick={handleSetPointA}
							className="h-6 px-2 text-xs min-w-0"
						>
							{`A: ${t('common.ruler.setPointA')}`}
						</Button>
					)}
				</div>

				{/* B button with X */}
				<div className="flex items-center">
					{rulerTimeB ? (
						<>
							<Button
								size="sm"
								variant="default"
								onClick={handleSetPointB}
								className="h-6 px-2 text-xs min-w-0 rounded-r-none"
							>
													{pointB && pointB.time ? `B: ${formatToVietnamMonthDay(parseUTCISOString(pointB.time))} ${formatPrice(pointB.close, pointB)}` : `B: ${t('common.ruler.setPointB')}`}
							</Button>
							<Button
								variant="default"
								size="sm"
								onClick={() => setRulerTimeB(undefined)}
								className="h-6 w-4 p-0 hover:bg-destructive/20 flex-shrink-0 rounded-l-none"
								title={t('common.ruler.clear')}
							>
								<X className="h-2 w-2" />
							</Button>
						</>
					) : (
						<Button
							size="sm"
							variant="outline"
							onClick={handleSetPointB}
							className="h-6 px-2 text-xs min-w-0"
						>
							{`B: ${t('common.ruler.setPointB')}`}
						</Button>
					)}
				</div>
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