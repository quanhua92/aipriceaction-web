import { useTranslation } from '@/hooks/useTranslation'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { useChartSettings, MaVisibility } from '@/contexts/ChartSettingsContext'
import * as React from 'react'
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
	initialTicker?: string    // Static setup only
	ticker?: string          // External control
	onTickerChange?: (ticker: string) => void

	// Settings control (optional - defaults to global settings)
	interval?: Interval
	onIntervalChange?: (interval: Interval) => void
	limit?: number
	setLimit?: (limit: number) => void
	setHeight?: (height: number) => void
	maVisibility?: MaVisibility
	setMaVisibility?: (visibility: MaVisibility) => void
	resetMaVisibility?: () => void
	startDate?: string
	setStartDate?: (date?: string) => void
	endDate?: string
	setEndDate?: (date?: string) => void
}

// TradingViewChart content component - assumes it's wrapped in TickerProvider
function TradingViewChartContent({
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
	const { selectedTicker, setSelectedTicker } = useTicker()

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

	// Sync with external ticker prop changes
	React.useEffect(() => {
		if (ticker !== undefined && ticker !== selectedTicker) {
			setSelectedTicker(ticker)
		}
	}, [ticker, selectedTicker, setSelectedTicker])

	return (
		<div className="space-y-4">
			{showControls && (
				<ChartControlBar
					ticker={selectedTicker}
					interval={currentInterval}
					onIntervalChange={handleIntervalChange}
					onTickerChange={(newTicker) => {
						setSelectedTicker(newTicker)
						onTickerChange?.(newTicker)
					}}
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
	)
}

// Main export - wrapper component that provides TickerProvider
export function TradingViewChart(props: TradingViewChartProps) {
	return (
		<TickerProvider initialTicker={props.initialTicker} ticker={props.ticker}>
			<TradingViewChartContent {...props} />
		</TickerProvider>
	)
}
