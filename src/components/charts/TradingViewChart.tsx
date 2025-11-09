import { useTranslation } from '@/hooks/useTranslation'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { useChartSettings, MaVisibility } from '@/contexts/ChartSettingsContext'
import { Interval } from '@/lib/api-client'
import { BaseTradingViewChart } from './BaseTradingViewChart'
import { ChartControlBar } from './ChartControlBar'

interface TradingViewChartProps {
	// Visual configuration
	title?: string
	height?: number
	showControls?: boolean
	viewportSizeOverride?: number

	// Ticker control
	ticker?: string
	onTickerChange?: (ticker: string) => void

	// Settings control (optional - defaults to global settings)
	interval?: Interval
	onIntervalChange?: (interval: Interval) => void
	limit?: number
	setLimit?: (limit: number) => void
	height?: number
	setHeight?: (height: number) => void
	maVisibility?: MaVisibility
	setMaVisibility?: (visibility: MaVisibility) => void
	resetMaVisibility?: () => void
	startDate?: string
	setStartDate?: (date?: string) => void
	endDate?: string
	setEndDate?: (date?: string) => void
}

export function TradingViewChart({
	ticker,
	onTickerChange,
	interval,
	onIntervalChange,
	limit,
	setLimit,
	height,
	setHeight,
	maVisibility,
	setMaVisibility,
	resetMaVisibility,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
	showControls = true,
	...visualProps
}: TradingViewChartProps) {
	const { t } = useTranslation()
	const globalSettings = useChartSettings()

	// Use global settings as defaults, override with props if provided
	const currentInterval = interval ?? globalSettings.interval
	const currentLimit = limit ?? globalSettings.limit
	const currentHeight = height ?? globalSettings.height
	const currentMaVisibility = maVisibility ?? globalSettings.maVisibility
	const currentStartDate = startDate ?? globalSettings.startDate
	const currentEndDate = endDate ?? globalSettings.endDate
	const handleIntervalChange = onIntervalChange ?? globalSettings.setInterval
	const handleLimitChange = setLimit ?? globalSettings.setLimit
	const handleHeightChange = setHeight ?? globalSettings.setHeight
	const handleMaVisibilityChange = setMaVisibility ?? globalSettings.setMaVisibility
	const handleResetMaVisibility = resetMaVisibility ?? globalSettings.resetMaVisibility
	const handleStartDateChange = setStartDate ?? globalSettings.setStartDate
	const handleEndDateChange = setEndDate ?? globalSettings.setEndDate

	return (
		<TickerProvider ticker={ticker}>
			{({ selectedTicker, setSelectedTicker }) => (
				<div className="space-y-4">
					{showControls && (
						<ChartControlBar
							ticker={selectedTicker}
							interval={currentInterval}
							onIntervalChange={handleIntervalChange}
							onTickerChange={setSelectedTicker}
							showTickerSelect={true}
						/>
					)}
					<BaseTradingViewChart
						{...visualProps}
						height={currentHeight}
						maVisibility={currentMaVisibility}
						noDataMessage={t('common.noDataAvailable')}
					/>
				</div>
			)}
		</TickerProvider>
	)
}
