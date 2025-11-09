import { useTranslation } from '@/hooks/useTranslation'
import { TickerProvider, useTicker } from '@/contexts/TickerContext'
import { Interval } from '@/lib/api-client'
import { BaseTradingViewChart } from './BaseTradingViewChart'
import { useEffect } from 'react'

interface TradingViewChartProps {
	// Visual configuration
	title?: string
	height?: number
	showControls?: boolean
	viewportSizeOverride?: number

	// Context control
	ticker?: string
	interval?: Interval
	startDate?: string
	endDate?: string
	limit?: number
}

export function TradingViewChart(props: TradingViewChartProps) {
	return (
		<TickerProvider>
			<TradingViewChartWithContext {...props} />
		</TickerProvider>
	)
}

function TradingViewChartWithContext({
	ticker,
	interval,
	startDate,
	endDate,
	limit,
	height,
	...visualProps
}: TradingViewChartProps) {
	const { t } = useTranslation()
	const {
		setSelectedTicker,
		setInterval: setContextInterval,
		setStartDate,
		setEndDate,
		setLimit,
		setHeight,
	} = useTicker()

	// Apply context control props on mount/update
	useEffect(() => {
		if (ticker !== undefined) {
			setSelectedTicker(ticker)
		}
	}, [ticker, setSelectedTicker])

	useEffect(() => {
		if (interval !== undefined) {
			setContextInterval(interval)
		}
	}, [interval, setContextInterval])

	useEffect(() => {
		if (startDate !== undefined) {
			setStartDate(startDate)
		}
	}, [startDate, setStartDate])

	useEffect(() => {
		if (endDate !== undefined) {
			setEndDate(endDate)
		}
	}, [endDate, setEndDate])

	useEffect(() => {
		if (limit !== undefined) {
			setLimit(limit)
		}
	}, [limit, setLimit])

	useEffect(() => {
		if (height !== undefined) {
			setHeight(height)
		}
	}, [height, setHeight])

	return (
		<BaseTradingViewChart
			{...visualProps}
			noDataMessage={t('common.noDataAvailable')}
		/>
	)
}
