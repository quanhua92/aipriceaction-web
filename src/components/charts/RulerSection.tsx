import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { type StockData } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
	formatPrice,
	formatToVietnamDateShort,
	formatToVietnamDateTimeShort,
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
		<div className="space-y-2">
			{/* Point capture buttons */}
			<div className="flex items-center justify-between text-xs">
				<div className="flex gap-2">
					<div className="flex items-center gap-1">
						<Button
							size="sm"
							variant={rulerTimeA ? 'default' : 'outline'}
							onClick={handleSetPointA}
							className="h-6 px-2"
						>
							A:{' '}
							{pointA
								? formatToVietnamDateTimeShort(
										parseUTCISOString(pointA.time)
								  )
								: t('common.ruler.setPointA')}
						</Button>
						{rulerTimeA && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setRulerTimeA(undefined)}
								className="h-6 w-6 p-0 hover:bg-destructive/10"
								title={t('common.ruler.clear')}
							>
								<X className="h-3 w-3" />
							</Button>
						)}
					</div>

					<div className="flex items-center gap-1">
						<Button
							size="sm"
							variant={rulerTimeB ? 'default' : 'outline'}
							onClick={handleSetPointB}
							className="h-6 px-2"
						>
							B:{' '}
							{pointB
								? formatToVietnamDateTimeShort(
										parseUTCISOString(pointB.time)
								  )
								: t('common.ruler.setPointB')}
						</Button>
						{rulerTimeB && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setRulerTimeB(undefined)}
								className="h-6 w-6 p-0 hover:bg-destructive/10"
								title={t('common.ruler.clear')}
							>
								<X className="h-3 w-3" />
							</Button>
						)}
					</div>
				</div>

				{/* Difference display */}
				{percentDiff !== null && (
					<div
						className={`font-medium ${
							percentDiff >= 0 ? 'text-green-600' : 'text-red-600'
						}`}
					>
						{percentDiff >= 0 ? '+' : ''}
						{percentDiff.toFixed(2)}%
					</div>
				)}
			</div>

			{/* Detailed comparison view */}
			{pointA && pointB && (
				<div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
					<div>
						<div className="text-muted-foreground">{t('common.ruler.pointA')}</div>
						<div>{formatPrice(pointA.close, pointA)}</div>
						<div>
							{formatToVietnamDateShort(
								parseUTCISOString(pointA.time)
							)}
						</div>
					</div>

					<div>
						<div className="text-muted-foreground">{t('common.ruler.pointB')}</div>
						<div>{formatPrice(pointB.close, pointB)}</div>
						<div>
							{formatToVietnamDateShort(
								parseUTCISOString(pointB.time)
							)}
						</div>
					</div>

					<div>
						<div className="text-muted-foreground">{t('common.ruler.difference')}</div>
						<div
							className={
								percentDiff >= 0 ? 'text-green-600' : 'text-red-600'
							}
						>
							{formatPrice(pointB.close - pointA.close, pointA)}
						</div>
						<div
							className={
								percentDiff >= 0 ? 'text-green-600' : 'text-red-600'
							}
						>
							{percentDiff >= 0 ? '+' : ''}
							{percentDiff.toFixed(2)}%
						</div>
					</div>
				</div>
			)}

			{/* Clear button */}
			{(rulerTimeA || rulerTimeB) && (
				<div className="flex justify-end">
					<Button
						size="sm"
						variant="ghost"
						onClick={clearRuler}
						className="h-6 px-2 text-xs"
					>
						{t('common.ruler.clear')}
					</Button>
				</div>
			)}
		</div>
	)
}