import { useTranslation } from '@/hooks/useTranslation'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { useChartSettings, MaVisibility } from '@/contexts/ChartSettingsContext'
import * as React from 'react'
import { Interval } from '@/lib/api-client'
import { BaseTradingViewChart } from './BaseTradingViewChart'
import { ChartControlBar } from './ChartControlBar'
import { ChartFullscreenDialog } from '@/components/ChartFullscreenDialog'
import { StockData } from '@/lib/api-client'

interface TradingViewChartProps {
	// Visual configuration
	title?: string
	height?: number
	showControls?: boolean

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
	endDateOverride?: string | null  // Local endDate override (for dialogs)

	// NEW: Cache support props
	cacheData?: StockData[]
	cacheMetadata?: {
		symbol: string
		interval: Interval
		startDate: string
		endDate: string
		mode: 'vn' | 'crypto'
	}
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

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null)

	// Use global settings as defaults, override with props if provided
	const currentInterval = interval ?? globalSettings.interval
	const currentHeight = height ?? globalSettings.height
	const currentMaVisibility = maVisibility ?? globalSettings.maVisibility
	const handleIntervalChange = onIntervalChange ?? globalSettings.setInterval

	// Fullscreen handlers
	const handleFullscreenClick = () => {
		setFullscreenTicker(selectedTicker)
	}

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null)
	}

	return (
		<>
			<div>
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
						onFullscreenClick={handleFullscreenClick}
					/>
				)}
				<BaseTradingViewChart
					{...visualProps}
					height={currentHeight}
					maVisibility={currentMaVisibility}
					noDataMessage={t('common.noDataAvailable')}
				/>
			</div>

			{/* Fullscreen Dialog */}
			<ChartFullscreenDialog
				ticker={fullscreenTicker}
				onClose={handleCloseFullscreen}
			/>
		</>
	)
}

// Main export - wrapper component that provides TickerProvider
export function TradingViewChart(props: TradingViewChartProps) {
	return (
		<TickerProvider
			initialTicker={props.initialTicker}
			ticker={props.ticker}
			limit={props.limit}
			endDate={props.endDateOverride || props.cacheMetadata?.endDate}
			// NEW: Pass cache props to TickerProvider
			cachedData={props.cacheData}
			initialCacheMetadata={props.cacheMetadata}
		>
			<TradingViewChartContent {...props} />
		</TickerProvider>
	)
}
