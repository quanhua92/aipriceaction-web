import type { StockData } from '@/lib/api-client'
import {
	createChart,
	createTextWatermark,
	type IChartApi,
	type ISeriesApi,
	ColorType,
	CrosshairMode,
	type CandlestickData,
	type HistogramData,
	type LineData,
	type Time,
	CandlestickSeries,
	HistogramSeries,
	LineSeries,
} from 'lightweight-charts'
import { useEffect, useRef, useMemo, useState } from 'react'
import { formatPrice, formatPercent, formatVolume, parseUTCISOString, formatToVietnamTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTicker } from '@/contexts/TickerContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { Loader2 } from 'lucide-react'

interface BaseTradingViewChartProps {
	title?: string
	height?: number
	showControls?: boolean
	viewportSizeOverride?: number
	noDataMessage?: string
	maVisibility?: {
		ma10: boolean
		ma20: boolean
		ma50: boolean
		ma100: boolean
		ma200: boolean
	}
}

export function BaseTradingViewChart({
	title,
	height: heightProp,
	showControls = true,
	viewportSizeOverride,
	noDataMessage = 'No data available',
	maVisibility: maVisibilityProp,
}: BaseTradingViewChartProps) {
	// Get global settings
	const globalSettings = useChartSettings()

	// Always use context for data
	const { loading, error, chartData: data } = useTicker()
	const height = heightProp ?? globalSettings.height
	const maVisibility = maVisibilityProp ?? globalSettings.maVisibility

	// Get latest data for overlay
	const latestData = data && data.length > 0 ? data[data.length - 1] : null

	// Show loading state when using context
	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Loading chart data...</span>
			</div>
		)
	}

	// Show error state when using context
	if (error) {
		return (
			<div className="text-center py-8 text-destructive">
				{error}
			</div>
		)
	}
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartRef = useRef<IChartApi | null>(null)
	const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
	const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
	const ma10SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
	const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
	const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
	const ma100SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
	const ma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

	// Viewport state tracking
	const [userViewportSet, setUserViewportSet] = useState(false)
	const [lastViewportRange, setLastViewportRange] = useState<{
		from: Time
		to: Time
	} | null>(null)
	const [isDataInitialized, setIsDataInitialized] = useState(false)

	// Reset viewport state when data changes
	useEffect(() => {
		setUserViewportSet(false)
		setLastViewportRange(null)
		setIsDataInitialized(false)
	}, [data])

	// Transform data to TradingView format
	const chartData = useMemo(() => {
		if (!data || data.length === 0) {
			return { candlestick: [], volume: [], ma10: [], ma20: [], ma50: [], ma100: [], ma200: [] }
		}

		const candlestick: CandlestickData[] = []
		const volume: HistogramData[] = []
		const ma10: LineData[] = []
		const ma20: LineData[] = []
		const ma50: LineData[] = []
		const ma100: LineData[] = []
		const ma200: LineData[] = []

		data.forEach((point, index) => {
			// Parse UTC ISO string to Date object
			const dateTime = parseUTCISOString(point.time)

			// Skip invalid dates
			if (isNaN(dateTime.getTime())) {
				console.error('Invalid date in chart data:', point.time)
				return
			}

			const time = Math.floor(dateTime.getTime() / 1000) as Time
			const prevPoint = index > 0 ? data[index - 1] : null
			const volumeColor = prevPoint
				? point.close >= prevPoint.close
					? '#16a34a'
					: '#dc2626'
				: point.close >= point.open
					? '#16a34a'
					: '#dc2626'

			candlestick.push({
				time,
				open: point.open,
				high: point.high,
				low: point.low,
				close: point.close,
			})

			volume.push({
				time,
				value: point.volume,
				color: volumeColor + '80', // Add transparency
			})

			// Add moving averages if available
			if (point.ma10 !== undefined && point.ma10 !== null) {
				ma10.push({ time, value: point.ma10 })
			}
			if (point.ma20 !== undefined && point.ma20 !== null) {
				ma20.push({ time, value: point.ma20 })
			}
			if (point.ma50 !== undefined && point.ma50 !== null) {
				ma50.push({ time, value: point.ma50 })
			}
			if (point.ma100 !== undefined && point.ma100 !== null) {
				ma100.push({ time, value: point.ma100 })
			}
			if (point.ma200 !== undefined && point.ma200 !== null) {
				ma200.push({ time, value: point.ma200 })
			}
		})

		return { candlestick, volume, ma10, ma20, ma50, ma100, ma200 }
	}, [data])

	// Initialize chart (only once on mount)
	useEffect(() => {
		if (!chartContainerRef.current) {
			return
		}

		// Create new chart
		const chart = createChart(chartContainerRef.current, {
			width: chartContainerRef.current.clientWidth,
			height: height,
			layout: {
				background: { type: ColorType.Solid, color: 'transparent' },
				textColor: '#71717a',
				attributionLogo: false,
			},
			grid: {
				vertLines: { visible: false },
				horzLines: { visible: false },
			},
			crosshair: {
				mode: CrosshairMode.Normal,
			},
			rightPriceScale: {
				borderColor: '#27272a',
				scaleMargins: {
					top: 0.1,
					bottom: 0.25, // Reserve 25% for volume
				},
			},
			timeScale: {
				borderColor: '#27272a',
				timeVisible: true,
				secondsVisible: false,
			},
			handleScroll: {
				mouseWheel: true,
				pressedMouseMove: true,
				horzTouchDrag: true,
			},
			handleScale: {
				axisPressedMouseMove: true,
				mouseWheel: true,
				pinch: true,
			},
		})

		chartRef.current = chart

		// Add candlestick series
		const candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: '#16a34a',
			downColor: '#dc2626',
			borderVisible: false,
			wickUpColor: '#16a34a',
			wickDownColor: '#dc2626',
		})
		candlestickSeriesRef.current = candlestickSeries

		// Add volume series on secondary scale
		const volumeSeries = chart.addSeries(HistogramSeries, {
			priceFormat: {
				type: 'volume',
			},
			priceScaleId: 'volume', // Use separate scale for volume
		})
		volumeSeriesRef.current = volumeSeries

		// Configure volume scale to use bottom 20% of chart
		volumeSeries.priceScale().applyOptions({
			scaleMargins: {
				top: 0.8,
				bottom: 0,
			},
		})

		// Add moving average series (initially empty)
		const ma10Series = chart.addSeries(LineSeries, {
			color: '#dc2626',
			lineWidth: 2,
			crosshairMarkerVisible: false,
			lastValueVisible: false,
			priceLineVisible: false,
		})
		ma10SeriesRef.current = ma10Series

		const ma20Series = chart.addSeries(LineSeries, {
			color: '#16a34a',
			lineWidth: 2,
			crosshairMarkerVisible: false,
			lastValueVisible: false,
			priceLineVisible: false,
		})
		ma20SeriesRef.current = ma20Series

		const ma50Series = chart.addSeries(LineSeries, {
			color: '#2563eb',
			lineWidth: 2,
			crosshairMarkerVisible: false,
			lastValueVisible: false,
			priceLineVisible: false,
		})
		ma50SeriesRef.current = ma50Series

		const ma100Series = chart.addSeries(LineSeries, {
			color: '#a1a1aa',
			lineWidth: 2,
			crosshairMarkerVisible: false,
			lastValueVisible: false,
			priceLineVisible: false,
		})
		ma100SeriesRef.current = ma100Series

		const ma200Series = chart.addSeries(LineSeries, {
			color: '#71717a',
			lineWidth: 2,
			crosshairMarkerVisible: false,
			lastValueVisible: false,
			priceLineVisible: false,
		})
		ma200SeriesRef.current = ma200Series

		// Create watermark using official API
		const watermark = createTextWatermark(chart.panes()[0], {
			horzAlign: 'center',
			vertAlign: 'center',
			lines: [{
				text: 'aipriceaction.com',
				color: 'rgba(255, 255, 255, 0.12)',
				fontSize: 20,
			}],
		})

		// Create tooltip element
		const tooltipWidth = 200
		const tooltipHeight = 90
		const tooltipMargin = 15

		const tooltip = document.createElement('div')
		tooltip.style.cssText = `
			width: auto;
			min-width: 180px;
			max-width: ${tooltipWidth}px;
			position: absolute;
			display: none;
			padding: 6px 8px;
			box-sizing: border-box;
			font-size: 11px;
			text-align: left;
			z-index: 1000;
			pointer-events: none;
			border: 1px solid #27272a;
			border-radius: 4px;
			background: rgba(24, 24, 27, 0.95);
			color: #fafafa;
			font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
			-webkit-font-smoothing: antialiased;
			-moz-osx-font-smoothing: grayscale;
			backdrop-filter: blur(8px);
		`
		chartContainerRef.current.appendChild(tooltip)

		// Track user viewport changes
		const handleVisibleTimeRangeChange = () => {
			const visibleRange = chart.timeScale().getVisibleRange()
			if (visibleRange && isDataInitialized) {
				if (!userViewportSet) {
					setUserViewportSet(true)
					setLastViewportRange({
						from: visibleRange.from,
						to: visibleRange.to,
					})
				} else {
					// Update last known viewport
					setLastViewportRange({
						from: visibleRange.from,
						to: visibleRange.to,
					})
				}
			}
		}

		// Subscribe to viewport changes
		chart
			.timeScale()
			.subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)

		// Subscribe to crosshair move events for tooltip
		chart.subscribeCrosshairMove((param) => {
			if (
				!chartContainerRef.current ||
				param.point === undefined ||
				!param.time ||
				param.point.x < 0 ||
				param.point.x > chartContainerRef.current.clientWidth ||
				param.point.y < 0 ||
				param.point.y > chartContainerRef.current.clientHeight
			) {
				tooltip.style.display = 'none'
				return
			}

			tooltip.style.display = 'block'

			// Get data from all series
			const candleData = param.seriesData.get(candlestickSeries) as
				| CandlestickData
				| undefined
			const volumeData = param.seriesData.get(volumeSeries) as
				| HistogramData
				| undefined
			const ma10Data = ma10SeriesRef.current
				? (param.seriesData.get(ma10SeriesRef.current) as LineData | undefined)
				: undefined
			const ma20Data = ma20SeriesRef.current
				? (param.seriesData.get(ma20SeriesRef.current) as LineData | undefined)
				: undefined
			const ma50Data = ma50SeriesRef.current
				? (param.seriesData.get(ma50SeriesRef.current) as LineData | undefined)
				: undefined
			const ma100Data = ma100SeriesRef.current
				? (param.seriesData.get(ma100SeriesRef.current) as LineData | undefined)
				: undefined
			const ma200Data = ma200SeriesRef.current
				? (param.seriesData.get(ma200SeriesRef.current) as LineData | undefined)
				: undefined

			if (!candleData) {
				tooltip.style.display = 'none'
				return
			}

			// Format date with time in Vietnam timezone
			let dateStr: string
			try {
				const date = new Date((param.time as number) * 1000)
				if (isNaN(date.getTime())) {
					dateStr = String(param.time)
				} else {
					// Format to Vietnam time string, then display as readable format
					const vietnamTimeStr = formatToVietnamTime(date)
					// Parse and format for display: "2025-11-09 21:00:00" -> "Nov 9, 2025, 09:00 PM"
					const [datePart, timePart] = vietnamTimeStr.split(' ')
					const [year, month, day] = datePart.split('-')
					const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
					const monthName = monthNames[parseInt(month) - 1]
					dateStr = `${monthName} ${parseInt(day)}, ${year}, ${timePart}`
				}
			} catch (error) {
				console.error('Invalid date in tooltip:', param.time, error)
				dateStr = String(param.time)
			}

			// Find current index in original data to get change percentages
			const currentIndex = chartData.candlestick.findIndex(
				(d) => d.time === param.time,
			)
			const currentDataPoint = currentIndex >= 0 ? data[currentIndex] : null

			// Use close_changed from StockData
			let priceChangePercent = ''
			if (currentDataPoint && currentDataPoint.close_changed !== null && currentDataPoint.close_changed !== undefined) {
				const change = currentDataPoint.close_changed
				const changeColor = change >= 0 ? '#16a34a' : '#dc2626'
				priceChangePercent = `<span style="color: ${changeColor}; font-size: 9px;">${formatPercent(change)}</span>`
			}

			// Use volume_changed from StockData
			let volumeChangePercent = ''
			if (currentDataPoint && currentDataPoint.volume_changed !== null && currentDataPoint.volume_changed !== undefined) {
				const volChange = currentDataPoint.volume_changed
				const volChangeColor = volChange >= 0 ? '#16a34a' : '#dc2626'
				volumeChangePercent = `<span style="color: ${volChangeColor}; font-size: 9px;">${formatPercent(volChange)}</span>`
			}

			// Get ticker symbol from the current chart
			const tickerSymbol = data.length > 0 ? data[0].symbol : ''

			// Build tooltip HTML - 2-column grid layout
			let html = `
				<div style="display: flex; justify-content: space-between; align-items: center; color: #a1a1aa; font-size: 10px; margin-bottom: 4px;">
					<span style="font-weight: bold;">${tickerSymbol}</span>
					<span>${dateStr}</span>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 10px;">
					<div><span style="color: #a1a1aa;">O</span> ${formatPrice(candleData.open)}</div>
					<div><span style="color: #a1a1aa;">C</span> ${formatPrice(candleData.close)} ${priceChangePercent}</div>
					<div><span style="color: #a1a1aa;">H</span> <span style="color: #16a34a;">${formatPrice(candleData.high)}</span></div>
					<div><span style="color: #a1a1aa;">L</span> <span style="color: #dc2626;">${formatPrice(candleData.low)}</span></div>
			`

			// Add volume if available
			if (volumeData) {
				html += `
					<div style="grid-column: 1 / -1;"><span style="color: #a1a1aa;">Vol</span> ${formatVolume(volumeData.value)} ${volumeChangePercent}</div>
				`
			}

			// Add moving averages in 2-column grid (only show visible MAs)
			if (ma10Data || ma20Data || ma50Data || ma100Data || ma200Data) {
				html += `<div style="grid-column: 1 / -1; margin-top: 4px; padding-top: 4px; border-top: 1px solid #27272a;"></div>`

				if (ma10Data && maVisibility.ma10 && currentDataPoint?.ma10_score !== null && currentDataPoint?.ma10_score !== undefined) {
					const ma10Color = currentDataPoint.ma10_score >= 0 ? '#16a34a' : '#dc2626'
					html += `<div><span style="color: #dc2626; display: inline-block; width: 40px;">MA10</span> ${formatPrice(ma10Data.value)}</div>`
					html += `<div><span style="color: #dc2626; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma10Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma10_score)}</span></div>`
				}
				if (ma20Data && maVisibility.ma20 && currentDataPoint?.ma20_score !== null && currentDataPoint?.ma20_score !== undefined) {
					const ma20Color = currentDataPoint.ma20_score >= 0 ? '#16a34a' : '#dc2626'
					html += `<div><span style="color: #16a34a; display: inline-block; width: 40px;">MA20</span> ${formatPrice(ma20Data.value)}</div>`
					html += `<div><span style="color: #16a34a; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma20Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma20_score)}</span></div>`
				}
				if (ma50Data && maVisibility.ma50 && currentDataPoint?.ma50_score !== null && currentDataPoint?.ma50_score !== undefined) {
					const ma50Color = currentDataPoint.ma50_score >= 0 ? '#16a34a' : '#dc2626'
					html += `<div><span style="color: #2563eb; display: inline-block; width: 40px;">MA50</span> ${formatPrice(ma50Data.value)}</div>`
					html += `<div><span style="color: #2563eb; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma50Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma50_score)}</span></div>`
				}
				if (ma100Data && maVisibility.ma100 && currentDataPoint?.ma100_score !== null && currentDataPoint?.ma100_score !== undefined) {
					const ma100Color = currentDataPoint.ma100_score >= 0 ? '#16a34a' : '#dc2626'
					html += `<div><span style="color: #a1a1aa; display: inline-block; width: 40px;">MA100</span> ${formatPrice(ma100Data.value)}</div>`
					html += `<div><span style="color: #a1a1aa; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma100Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma100_score)}</span></div>`
				}
				if (ma200Data && maVisibility.ma200 && currentDataPoint?.ma200_score !== null && currentDataPoint?.ma200_score !== undefined) {
					const ma200Color = currentDataPoint.ma200_score >= 0 ? '#16a34a' : '#dc2626'
					html += `<div style="grid-column: 1 / -1;"><span style="color: #71717a; display: inline-block; width: 40px;">MA200</span> ${formatPrice(ma200Data.value)} <span style="color: #71717a;">Score</span> <span style="color: ${ma200Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma200_score)}</span></div>`
				}
			}

			html += `</div>`

			tooltip.innerHTML = html

			// Position tooltip
			const y = param.point.y
			let left = param.point.x + tooltipMargin
			if (left > chartContainerRef.current.clientWidth - tooltipWidth) {
				left = param.point.x - tooltipMargin - tooltipWidth
			}

			let top = y + tooltipMargin
			if (top > chartContainerRef.current.clientHeight - tooltipHeight) {
				top = y - tooltipHeight - tooltipMargin
			}

			tooltip.style.left = `${left}px`
			tooltip.style.top = `${top}px`
		})

		// Handle resize
		const handleResize = () => {
			if (chartContainerRef.current) {
				chart.applyOptions({
					width: chartContainerRef.current.clientWidth,
				})
			}
		}

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)

			// Remove tooltip
			if (
				chartContainerRef.current &&
				tooltip.parentNode === chartContainerRef.current
			) {
				chartContainerRef.current.removeChild(tooltip)
			}

			// Remove watermark
			watermark.detach()

			// Clean up chart and series refs
			chartRef.current = null
			candlestickSeriesRef.current = null
			volumeSeriesRef.current = null
			ma10SeriesRef.current = null
			ma20SeriesRef.current = null
			ma50SeriesRef.current = null
			ma100SeriesRef.current = null
			ma200SeriesRef.current = null

			try {
				chart.remove()
			} catch (error) {
				// Chart already disposed, ignore error
			}
		}
	}, [height, maVisibility, chartContainerRef.current, userViewportSet, isDataInitialized])

	// Update chart data when chartData changes
	useEffect(() => {
		if (!candlestickSeriesRef.current || !volumeSeriesRef.current) {
			return
		}

		// Update series data (even if empty - this clears the chart)
		candlestickSeriesRef.current.setData(chartData.candlestick)
		volumeSeriesRef.current.setData(chartData.volume)

		// Update MA series data - set to empty array if not visible
		if (ma10SeriesRef.current) {
			ma10SeriesRef.current.setData(maVisibility.ma10 ? chartData.ma10 : [])
		}
		if (ma20SeriesRef.current) {
			ma20SeriesRef.current.setData(maVisibility.ma20 ? chartData.ma20 : [])
		}
		if (ma50SeriesRef.current) {
			ma50SeriesRef.current.setData(maVisibility.ma50 ? chartData.ma50 : [])
		}
		if (ma100SeriesRef.current) {
			ma100SeriesRef.current.setData(maVisibility.ma100 ? chartData.ma100 : [])
		}
		if (ma200SeriesRef.current) {
			ma200SeriesRef.current.setData(maVisibility.ma200 ? chartData.ma200 : [])
		}

		// Smart viewport management
		if (chartRef.current && chartData.candlestick.length > 0) {
			// Mark data as initialized on first successful data load
			if (!isDataInitialized) {
				setIsDataInitialized(true)
			}

			// Only reset viewport if user hasn't manually set it OR this is initial data load
			if (!userViewportSet || !lastViewportRange) {
				if (
					viewportSizeOverride &&
					chartData.candlestick.length > viewportSizeOverride
				) {
					// Show only the last N candles
					const from =
						chartData.candlestick[
							chartData.candlestick.length - viewportSizeOverride
						].time
					const to =
						chartData.candlestick[chartData.candlestick.length - 1].time
					chartRef.current.timeScale().setVisibleRange({ from, to })
				} else {
					// Show last 40 candles by default
					const candlesToShow = Math.min(40, chartData.candlestick.length)
					const from = chartData.candlestick[chartData.candlestick.length - candlesToShow].time
					const to = chartData.candlestick[chartData.candlestick.length - 1].time
					chartRef.current.timeScale().setVisibleRange({ from, to })
				}
			} else {
				// User has set viewport - preserve it during live data updates
				try {
					const currentRange = chartRef.current.timeScale().getVisibleRange()
					if (
						!currentRange ||
						Math.abs(Number(currentRange.from) - Number(lastViewportRange.from)) > 1000
					) {
						chartRef.current.timeScale().setVisibleRange(lastViewportRange)
					}
				} catch (error) {
					// Failed to restore viewport, ignore
				}
			}
		}
	}, [
		chartData,
		viewportSizeOverride,
		userViewportSet,
		lastViewportRange,
		isDataInitialized,
		maVisibility,
	])

	if (!data || data.length === 0) {
		return (
			<div>
				{title && <h3 className="font-semibold mb-4">{title}</h3>}
				<div className="flex items-center justify-center h-[400px] text-muted-foreground">
					{noDataMessage}
				</div>
			</div>
		)
	}

	return (
		<div>
			{showControls && title && (
				<div className="mb-4">
					<h3 className="font-semibold">{title}</h3>
				</div>
			)}

			{/* Chart Container */}
			<div className="relative" style={{ height: `${height}px` }}>
				<div
					ref={chartContainerRef}
					className="absolute inset-0"
				/>
				
				{/* Overlay for current data */}
				{latestData && (
					<div
						className="absolute top-3 left-3 text-zinc-100 text-xs z-10 pointer-events-none"
						style={{
							WebkitFontSmoothing: 'antialiased',
							MozOsxFontSmoothing: 'grayscale',
						}}
					>
						<span className={cn("font-semibold", latestData.close_changed >= 0 ? "text-green-400" : "text-red-400")}>{latestData.symbol}</span> <span className={cn(latestData.close_changed >= 0 ? "text-green-400" : "text-red-400")}>{formatPrice(latestData.close)}</span> <span className={cn(latestData.close_changed >= 0 ? "text-green-600" : "text-red-600")}>{formatPercent(latestData.close_changed)}</span>
						<span className="mx-1"></span>
						<span className={cn(latestData.volume_changed >= 0 ? "text-green-400" : "text-red-400")}>{formatVolume(latestData.volume)}</span> <span className={cn(latestData.volume_changed >= 0 ? "text-green-600" : "text-red-600")}>{formatPercent(latestData.volume_changed)}</span>
						<span className="text-zinc-400 ml-2 text-xs">
							{(() => {
								try {
									if (!latestData.time || typeof latestData.time !== 'string') return '--'
									const date = parseUTCISOString(latestData.time)
									if (isNaN(date.getTime())) return '--'
									// Convert to Vietnam time and format
									const vietnamDate = new Date(date.getTime() + (7 * 60 * 60 * 1000))
									return vietnamDate.toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										timeZone: 'UTC' // Use UTC because we already shifted by +7
									})
								} catch {
									return '--'
								}
							})()}
						</span>
					</div>
				)}
			</div>
		</div>
	)
}
