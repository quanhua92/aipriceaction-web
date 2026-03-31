import {
	type CandlestickData,
	CandlestickSeries,
	ColorType,
	CrosshairMode,
	createChart,
	createTextWatermark,
	type HistogramData,
	HistogramSeries,
	type IChartApi,
	type ISeriesApi,
	type LineData,
	LineSeries,
	type Time,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MA_CONFIG, MA_SERIES_OPTIONS } from "./utils/chartConfig";
import { useChartSettings } from "@/contexts/ChartSettingsContext";
import { useTicker } from "@/contexts/TickerContext";
import { type StockData } from "@/lib/api-client";
import { INTRADAY_INTERVALS } from "@/lib/constants";
import {
	formatPercent,
	formatPrice,
	formatVolume,
	getMarketDecimalPlaces,
	getOptimalDecimalPlaces,
	getResponsiveViewportSize,
	parseUTCISOString,
	toVietnamUnixTime,
	formatToVietnamDateTimeShort,
	formatToVietnamDateShort,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { TOOLTIP_MARGIN, TOOLTIP_WIDTH, TOOLTIP_HEIGHT } from "@/lib/constants";
import { RulerSection } from "./RulerSection";
import { createTooltipElement } from "@/lib/tooltipStyles";
import { useLogs } from "@/contexts/LogsContext";
import { getChangeColors, getVolumeColor, getVolumePercentColor, getMAColor, getBasicChangeColor } from "@/lib/chartColors";
import { formatTooltipDate } from "@/lib/chartDateUtils";
import { transformStockDataToChartData, type ChartData } from "@/lib/chartDataTransform";

interface BaseTradingViewChartProps {
	title?: string;
	height?: number;
	showControls?: boolean;
		noDataMessage?: string;
	maVisibility?: {
		ma10: boolean;
		ma20: boolean;
		ma50: boolean;
		ma100: boolean;
		ma200: boolean;
	};
}

export function BaseTradingViewChart({
	title,
	height: heightProp,
	showControls = true,
	noDataMessage = "No data available",
	maVisibility: maVisibilityProp,
}: BaseTradingViewChartProps) {
	// Get global settings
	const { interval, rulerVisible, macdVisible, macdHeight, ...globalSettings } = useChartSettings();

	// Initialize logging
	const { info } = useLogs();

	// Helper function to check if current interval is intraday
	const isIntradayInterval = INTRADAY_INTERVALS.includes(interval);

	// Always use context for data
	const { loading, error, chartData: data } = useTicker();
	const height = heightProp ?? globalSettings.height;
	const maVisibility = maVisibilityProp ?? globalSettings.maVisibility;

	// Get latest data for overlay
	const latestData = data && data.length > 0 ? data[data.length - 1] : null;

	// Helper function to calculate optimal minMove for chart
	const getOptimalMinMove = (price: number, mode?: string): number => {
		if (mode === "vn") return 1; // Vietnamese stocks

		const marketDecimals = getMarketDecimalPlaces(mode);
		if (marketDecimals !== undefined) {
			return Math.pow(10, -marketDecimals);
		}

		// Use dynamic precision for crypto and other markets
		const decimalPlaces = getOptimalDecimalPlaces(price);
		return Math.pow(10, -decimalPlaces);
	};

	// Show loading state when using context
	if (loading) {
		return (
			<div
				className="flex items-center justify-center"
				style={{ height: `${height}px` }}
			>
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">
					Loading chart data...
				</span>
			</div>
		);
	}

	// Show error state when using context
	if (error) {
		return <div className="text-center py-8 text-destructive">{error}</div>;
	}
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const tooltipRef = useRef<HTMLElement | null>(null);
	const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
	const ma10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const ma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const ma100SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const ma200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const macdHistogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
	const macdLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const prevDataLengthRef = useRef<number>(0);

	// Dynamic ref mapping for MA series
	const maSeriesRefs = {
		ma10: ma10SeriesRef,
		ma20: ma20SeriesRef,
		ma50: ma50SeriesRef,
		ma100: ma100SeriesRef,
		ma200: ma200SeriesRef,
	} as const;

	const [isDataInitialized, setIsDataInitialized] = useState(false);
	const [crosshairData, setCrosshairData] = useState<StockData | null>(null);
	const [clickedCrosshairData, setClickedCrosshairData] =
		useState<StockData | null>(null);
	// Use ref to track current crosshair lock state for immediate access in event handlers
	const clickedCrosshairRef = useRef<StockData | null>(null);
	// Track locked crosshair position coordinates for built-in crosshair methods
	const [lockedCrosshairPosition, setLockedCrosshairPosition] = useState<{
		price: number;
		horizontalPosition: Time;
	} | null>(null);
	const lockedCrosshairPositionRef = useRef<{
		price: number;
		horizontalPosition: Time;
	} | null>(null);
	const [containerWidth, setContainerWidth] = useState(0);

	// Helper function to create chart (called from data useEffect)
	const createChartWithContext = () => {
		if (!chartContainerRef.current || chartRef.current) {
			return null;
		}

		const symbol = data?.[0]?.symbol ?? 'unknown';

		// Create new chart
		const chart = createChart(chartContainerRef.current, {
			width: chartContainerRef.current.clientWidth,
			height: height,
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: "#71717a",
				attributionLogo: false,
			},
			grid: {
				vertLines: { visible: false },
				horzLines: { visible: false },
			},
			crosshair: {
				mode: CrosshairMode.Hidden, // Start hidden, enable after data loads
			},
			rightPriceScale: {
				borderColor: "#27272a",
				scaleMargins: {
					top: 0.1,
					bottom: 0.25, // Reserve 25% for volume
				},
			},
			timeScale: {
				borderColor: "#27272a",
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
		});

		chartRef.current = chart;

		// Log chart creation
		info(`[BaseChart][${symbol}] Chart created`, {
			width: chartContainerRef.current.clientWidth,
			height,
			timestamp: Date.now()
		});

		// Add candlestick series with custom price formatter
		const candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: "#1e8c82",
			downColor: "#d94040",
			borderVisible: false,
			wickUpColor: "#1e8c82",
			wickDownColor: "#d94040",
			priceFormat: {
				type: "custom",
				formatter: (price: number) => {
					// Use the latest data to determine format mode
					const currentData =
						data && data.length > 0 ? data[data.length - 1] : null;
					return formatPrice(price, currentData);
				},
				minMove: latestData
					? getOptimalMinMove(latestData.close, latestData.mode)
					: 0.001,
			},
		});
		candlestickSeriesRef.current = candlestickSeries;

		// Add volume series on secondary scale
		const volumeSeries = chart.addSeries(HistogramSeries, {
			priceFormat: {
				type: "volume",
			},
			priceScaleId: "volume", // Use separate scale for volume
		});
		volumeSeriesRef.current = volumeSeries;

		// Configure volume scale to use bottom 20% of chart
		volumeSeries.priceScale().applyOptions({
			scaleMargins: {
				top: 0.8,
				bottom: 0,
			},
		});

		// Add moving average series (initially empty) using configuration
		MA_CONFIG.forEach(({ key, color }) => {
			const series = chart.addSeries(LineSeries, {
				color,
				...MA_SERIES_OPTIONS,
			});
			// Dynamic ref mapping for backward compatibility
			maSeriesRefs[key as keyof typeof maSeriesRefs].current = series;
		});

		// Add MACD pane if enabled
		if (macdVisible) {
			const macdPane = chart.addPane();
			macdPane.setHeight(macdHeight);

			macdHistogramSeriesRef.current = chart.addSeries(HistogramSeries, {
				priceScaleId: "macd_histogram",
			}, 1);
			macdHistogramSeriesRef.current.priceScale().applyOptions({
				scaleMargins: { top: 0.2, bottom: 0.0 },
			});

			macdLineSeriesRef.current = chart.addSeries(LineSeries, {
				color: "#2563eb",
				lineWidth: 1,
				priceScaleId: "macd",
				lastValueVisible: false,
				priceLineVisible: false,
			}, 1);

			macdSignalSeriesRef.current = chart.addSeries(LineSeries, {
				color: "#ea580c",
				lineWidth: 1,
				priceScaleId: "macd",
				lastValueVisible: false,
				priceLineVisible: false,
			}, 1);

			// Hide price scale for MACD line/signal (keep histogram scale visible)
			macdLineSeriesRef.current.priceScale().applyOptions({ visible: false });
			macdSignalSeriesRef.current.priceScale().applyOptions({ visible: false });
		}

		// Create watermark using official API
		const watermark = createTextWatermark(chart.panes()[0], {
			horzAlign: "center",
			vertAlign: "center",
			lines: [
				{
					text: "aipriceaction.com",
					color: "rgba(113, 113, 122, 0.15)",
					fontSize: 20,
				},
			],
		});

		// Create tooltip element using extracted styles
		const tooltip = createTooltipElement();
		tooltipRef.current = tooltip;
		chartContainerRef.current.appendChild(tooltip);

		// Store watermark for cleanup
		(chartRef.current as any)._watermark = watermark;

		// Unified tooltip building function
		const buildTooltipHTML = (currentDataPoint: StockData, paramTime: any) => {
			// Format date with time (timestamp is already in Vietnam time)
			const dateStr = formatTooltipDate(paramTime);

			// Find chart data for this time
			const candleData = chartData.candlestick.find(
				(d) => d.time === paramTime,
			);
			const volumeData = chartData.volume.find((d) => d.time === paramTime);
			const ma10Data = chartData.ma10.find((d) => d.time === paramTime);
			const ma20Data = chartData.ma20.find((d) => d.time === paramTime);
			const ma50Data = chartData.ma50.find((d) => d.time === paramTime);
			const ma100Data = chartData.ma100.find((d) => d.time === paramTime);
			const ma200Data = chartData.ma200.find((d) => d.time === paramTime);

			if (!candleData) return null;

			// Use close_changed from StockData
			let priceChangePercent = "";
			if (
				currentDataPoint.close_changed !== null &&
				currentDataPoint.close_changed !== undefined
			) {
				const change = currentDataPoint.close_changed;
				const changeColor = getBasicChangeColor(change);
				priceChangePercent = `<span style="color: ${changeColor}; font-size: 9px;">${formatPercent(change)}</span>`;
			}

			// Use volume_changed from StockData
			let volumeChangePercent = "";
			if (
				currentDataPoint.volume_changed !== null &&
				currentDataPoint.volume_changed !== undefined
			) {
				const volChange = currentDataPoint.volume_changed;
				const volChangeColor = getBasicChangeColor(volChange);
				volumeChangePercent = `<span style="color: ${volChangeColor}; font-size: 9px;">${formatPercent(volChange)}</span>`;
			}

			// Get ticker symbol from the current chart
			const tickerSymbol = data.length > 0 ? data[0].symbol : "";

			// Build tooltip HTML
			let html = `
				<div style="display: flex; justify-content: space-between; align-items: center; color: #a1a1aa; font-size: 10px; margin-bottom: 4px;">
					<span style="font-weight: bold;">${tickerSymbol}</span>
					<span>${dateStr}</span>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 10px;">
					<div><span style="color: #a1a1aa;">O</span> ${formatPrice(candleData.open, currentDataPoint)}</div>
					<div><span style="color: #a1a1aa;">C</span> ${formatPrice(candleData.close, currentDataPoint)} ${priceChangePercent}</div>
					<div><span style="color: #a1a1aa;">H</span> <span style="color: #16a34a;">${formatPrice(candleData.high, currentDataPoint)}</span></div>
					<div><span style="color: #a1a1aa;">L</span> <span style="color: #dc2626;">${formatPrice(candleData.low, currentDataPoint)}</span></div>
			`;

			// Add volume if available
			if (volumeData) {
				html += `
					<div style="grid-column: 1 / -1;"><span style="color: #a1a1aa;">Vol</span> ${formatVolume(volumeData.value)} ${volumeChangePercent}</div>
				`;
			}

			// Add moving averages in 2-column grid (only show visible MAs)
			if (ma10Data || ma20Data || ma50Data || ma100Data || ma200Data) {
				html += `<div style="grid-column: 1 / -1; margin-top: 4px; padding-top: 4px; border-top: 1px solid #27272a;"></div>`;

				if (
					ma10Data &&
					maVisibility.ma10 &&
					currentDataPoint?.ma10_score !== null &&
					currentDataPoint?.ma10_score !== undefined
				) {
					const ma10Color = getMAColor(currentDataPoint.ma10_score);
					html += `<div><span style="color: #dc2626; display: inline-block; width: 40px;">MA10</span> ${formatPrice(ma10Data.value, currentDataPoint)}</div>`;
					html += `<div><span style="color: #dc2626; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma10Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma10_score)}</span></div>`;
				}
				if (
					ma20Data &&
					maVisibility.ma20 &&
					currentDataPoint?.ma20_score !== null &&
					currentDataPoint?.ma20_score !== undefined
				) {
					const ma20Color = getMAColor(currentDataPoint.ma20_score);
					html += `<div><span style="color: #16a34a; display: inline-block; width: 40px;">MA20</span> ${formatPrice(ma20Data.value, currentDataPoint)}</div>`;
					html += `<div><span style="color: #16a34a; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma20Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma20_score)}</span></div>`;
				}
				if (
					ma50Data &&
					maVisibility.ma50 &&
					currentDataPoint?.ma50_score !== null &&
					currentDataPoint?.ma50_score !== undefined
				) {
					const ma50Color = getMAColor(currentDataPoint.ma50_score);
					html += `<div><span style="color: #2563eb; display: inline-block; width: 40px;">MA50</span> ${formatPrice(ma50Data.value, currentDataPoint)}</div>`;
					html += `<div><span style="color: #2563eb; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma50Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma50_score)}</span></div>`;
				}
				if (
					ma100Data &&
					maVisibility.ma100 &&
					currentDataPoint?.ma100_score !== null &&
					currentDataPoint?.ma100_score !== undefined
				) {
					const ma100Color = getMAColor(currentDataPoint.ma100_score);
					html += `<div><span style="color: #a1a1aa; display: inline-block; width: 40px;">MA100</span> ${formatPrice(ma100Data.value, currentDataPoint)}</div>`;
					html += `<div><span style="color: #a1a1aa; display: inline-block; width: 40px;">Score</span> <span style="color: ${ma100Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma100_score)}</span></div>`;
				}
				if (
					ma200Data &&
					maVisibility.ma200 &&
					currentDataPoint?.ma200_score !== null &&
					currentDataPoint?.ma200_score !== undefined
				) {
					const ma200Color = getMAColor(currentDataPoint.ma200_score);
					html += `<div style="grid-column: 1 / -1;"><span style="color: #71717a; display: inline-block; width: 40px;">MA200</span> ${formatPrice(ma200Data.value, currentDataPoint)} <span style="color: #71717a;">Score</span> <span style="color: ${ma200Color}; font-size: 9px;">${formatPercent(currentDataPoint.ma200_score)}</span></div>`;
				}
			}

			return html + `</div>`;
		};

		// Add click handler to lock crosshair position
		const handleChartClick = (param: any) => {
			const currentLockedRef = clickedCrosshairRef.current; // Get current ref value


			// TOGGLE LOGIC: Always handle toggle first, before any validation
			if (currentLockedRef) {
				setClickedCrosshairData(null);
				clickedCrosshairRef.current = null; // Update ref immediately
				setLockedCrosshairPosition(null); // Clear locked position
				lockedCrosshairPositionRef.current = null; // Clear ref immediately
				setCrosshairData(null);
				// Clear built-in crosshair position
				chartRef.current?.clearCrosshairPosition();
				// Clear tooltip completely when clearing to prevent hover from immediately showing
				tooltipRef.current!.innerHTML = "";
				tooltipRef.current!.style.display = "none";
				return;
			}

			// After unlocking, only proceed with locking if we have valid data
			if (!param.time || !data || data.length === 0) {
				info(`[BaseChart][${symbol}] Click ignored - missing time or data`);
				return;
			}

			// Find the data point at the clicked position
			const currentIndex = chartData.candlestick.findIndex(
				(d) => d.time === param.time,
			);
			const clickedDataPoint = currentIndex >= 0 ? data[currentIndex] : null;


			if (clickedDataPoint) {
				setClickedCrosshairData(clickedDataPoint);
				clickedCrosshairRef.current = clickedDataPoint; // Update ref immediately

				// Store locked position for built-in crosshair methods
				const lockedPosition = {
					price: clickedDataPoint.close,
					horizontalPosition: param.time as Time,
				};

				setLockedCrosshairPosition(lockedPosition);
				lockedCrosshairPositionRef.current = lockedPosition; // Update ref immediately

				// Set built-in crosshair position to show dotted lines
				chartRef.current?.setCrosshairPosition(
					lockedPosition.price,
					lockedPosition.horizontalPosition,
					candlestickSeriesRef.current!
				);

				// Show tooltip at clicked position, similar to hover
				tooltipRef.current!.style.display = "block";

				// Get data from all series for clicked position
				const candleData = chartData.candlestick.find(
					(d) => d.time === param.time,
				);

				if (!candleData) {
					tooltipRef.current!.style.display = "none";
					return;
				}

				// Use unified tooltip builder
				const html = buildTooltipHTML(clickedDataPoint, param.time);
				if (html) {
					tooltipRef.current!.innerHTML = html;
				} else {
					tooltipRef.current!.style.display = "none";
					return;
				}

				// Position tooltip at clicked position (same logic as hover)
				const y = param.point.y;
				let left = param.point.x + TOOLTIP_MARGIN;
				if (chartContainerRef.current && left > chartContainerRef.current.clientWidth - TOOLTIP_WIDTH) {
					left = param.point.x - TOOLTIP_MARGIN - TOOLTIP_WIDTH;
				}

				let top = y + TOOLTIP_MARGIN;
				if (chartContainerRef.current && top > chartContainerRef.current.clientHeight - TOOLTIP_HEIGHT) {
					top = y - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;
				}

				tooltipRef.current!.style.left = `${left}px`;
				tooltipRef.current!.style.top = `${top}px`;
			}
		};

		// Subscribe to chart click events
		chart.subscribeClick(handleChartClick);

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

				// If there's a locked crosshair, restore built-in crosshair position and show tooltip
				if (clickedCrosshairRef.current && lockedCrosshairPositionRef.current) {
					// Restore built-in crosshair position when hovering out of bounds
					chartRef.current?.setCrosshairPosition(
						lockedCrosshairPositionRef.current.price,
						lockedCrosshairPositionRef.current.horizontalPosition,
						candlestickSeriesRef.current!
					);

					// Convert the locked position time to Vietnam timezone Unix timestamp for chart display
					const lockedDateTime = parseUTCISOString(
						clickedCrosshairRef.current.time,
					);
					const lockedChartTime = toVietnamUnixTime(lockedDateTime) as Time;

					// Use unified tooltip builder for locked position
					const tooltipHTML = buildTooltipHTML(
						clickedCrosshairRef.current,
						lockedChartTime,
					);
					if (tooltipHTML) {
						tooltipRef.current!.innerHTML = tooltipHTML;

						// Position tooltip in default location (top-right of chart)
						const left =
							chartContainerRef.current.clientWidth -
							TOOLTIP_WIDTH -
							TOOLTIP_MARGIN;
						const top = TOOLTIP_MARGIN;

						tooltipRef.current!.style.left = `${left}px`;
						tooltipRef.current!.style.top = `${top}px`;
						tooltipRef.current!.style.display = "block";
					} else {
						info(`[BaseChart][${clickedCrosshairRef.current?.symbol ?? 'unknown'}] Locked tooltip HTML generation failed`);
						tooltipRef.current!.style.display = "none";
					}

					// IMPORTANT: Keep crosshair data for overlay display when locked
					setCrosshairData(clickedCrosshairRef.current);
					return;
				} else {
					// No locked crosshair, hide tooltip and clear crosshair data
					tooltipRef.current!.style.display = "none";
					setCrosshairData(null);
					return;
				}
			}

			tooltipRef.current!.style.display = "block";

			// Get data from all series
			const candleData = param.seriesData.get(candlestickSeries) as
				| CandlestickData
				| undefined;

			if (!candleData) {
				info(`[BaseChart][${symbol}] Hover ignored - no candle data`);
				tooltipRef.current!.style.display = "none";
				setCrosshairData(null);
				return;
			}

			// Find current index in original data to get change percentages
			const currentIndex = chartData.candlestick.findIndex(
				(d) => d.time === param.time,
			);
			const currentDataPoint = currentIndex >= 0 ? data[currentIndex] : null;

			if (!currentDataPoint) {
				tooltipRef.current!.style.display = "none";
				setCrosshairData(null);
				return;
			}

			// Update crosshair data for overlay
			setCrosshairData(currentDataPoint);

			// Use unified tooltip building function
			const html = buildTooltipHTML(currentDataPoint, param.time);
			if (html) {
				tooltipRef.current!.innerHTML = html;
			} else {
				info(`[BaseChart][${currentDataPoint.symbol}] Hover tooltip HTML generation failed`);
				tooltipRef.current!.style.display = "none";
				return;
			}

			// Position tooltip
			const y = param.point.y;
			let left = param.point.x + TOOLTIP_MARGIN;
			const leftAdjusted =
				chartContainerRef.current && left > chartContainerRef.current.clientWidth - TOOLTIP_WIDTH;
			if (leftAdjusted) {
				left = param.point.x - TOOLTIP_MARGIN - TOOLTIP_WIDTH;
			}

			let top = y + TOOLTIP_MARGIN;
			const topAdjusted =
				chartContainerRef.current && top > chartContainerRef.current.clientHeight - TOOLTIP_HEIGHT;
			if (topAdjusted) {
				top = y - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;
			}

			tooltipRef.current!.style.left = `${left}px`;
			tooltipRef.current!.style.top = `${top}px`;
		});

		// Handle resize using ResizeObserver to detect container size changes
		const handleResize = () => {
			if (chartContainerRef.current) {
				const width = chartContainerRef.current.clientWidth;
				setContainerWidth(width);
				chart.applyOptions({
					width,
				});
			}
		};

		// Use ResizeObserver to watch container size changes (e.g., grid column changes)
		const resizeObserver = new ResizeObserver(() => {
			handleResize();
		});

		if (chartContainerRef.current) {
			resizeObserver.observe(chartContainerRef.current);
			// Set initial width
			const initialWidth = chartContainerRef.current.clientWidth;
			setContainerWidth(initialWidth);
			info(`[BaseChart][${symbol}] Container size observed`, {
				width: initialWidth,
				responsiveViewportSize: getResponsiveViewportSize(initialWidth)
			});
		}

		// Also listen to window resize for fullscreen/browser resize
		window.addEventListener("resize", handleResize);

		// Store cleanup handlers
		(chartRef.current as any)._cleanupHandlers = {
			handleResize,
			resizeObserver,
		};

		// Layer 2: Immediate crosshair clearing after chart creation
		requestAnimationFrame(() => {
			chartRef.current?.clearCrosshairPosition();
			setCrosshairData(null);
			if (tooltipRef.current) {
				tooltipRef.current.innerHTML = "";
				tooltipRef.current.style.display = "none";
			}
		});

		return chart;
	};

	// Reset data initialization flag when data changes
	// Note: We intentionally preserve viewport position for comparison across tickers
	useEffect(() => {
		const symbol = data?.[0]?.symbol ?? 'unknown';
		info(`[BaseChart][${symbol}] Data changed, resetting initialization`, {
			dataLength: data?.length ?? 0
		});
		setIsDataInitialized(false);
	}, [data]);

	// Destroy and recreate chart when MACD visibility changes
	// (addPane is called during chart creation, so we must rebuild)
	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;

		// Clean up resize listeners
		const cleanupHandlers = (chartRef.current as any)?._cleanupHandlers;
		if (cleanupHandlers) {
			window.removeEventListener("resize", cleanupHandlers.handleResize);
			cleanupHandlers.resizeObserver.disconnect();
		}
		// Remove tooltip
		if (
			chartContainerRef.current &&
			tooltipRef.current &&
			tooltipRef.current.parentNode === chartContainerRef.current
		) {
			chartContainerRef.current.removeChild(tooltipRef.current);
		}
		// Remove watermark
		const watermark = (chartRef.current as any)?._watermark;
		if (watermark) watermark.detach();

		chart.remove();
		chartRef.current = null;
		candlestickSeriesRef.current = null;
		volumeSeriesRef.current = null;
		ma10SeriesRef.current = null;
		ma20SeriesRef.current = null;
		ma50SeriesRef.current = null;
		ma100SeriesRef.current = null;
		ma200SeriesRef.current = null;
		macdHistogramSeriesRef.current = null;
		macdLineSeriesRef.current = null;
		macdSignalSeriesRef.current = null;

		setIsDataInitialized(false);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [macdVisible, macdHeight]);

	// Keep ref in sync with state for immediate access in event handlers
	useEffect(() => {
		clickedCrosshairRef.current = clickedCrosshairData;
	}, [clickedCrosshairData]);

	// Keep position ref in sync with state for immediate access in event handlers
	useEffect(() => {
		lockedCrosshairPositionRef.current = lockedCrosshairPosition;
	}, [lockedCrosshairPosition]);

	// Calculate responsive viewport size
	const responsiveViewportSize = useMemo(() => {
		return containerWidth > 0 ? getResponsiveViewportSize(containerWidth) : 60;
	}, [containerWidth]);

	// Transform data to TradingView format
	const chartData = useMemo((): ChartData => {
		return transformStockDataToChartData(data);
	}, [data]);

	// Cleanup effect - only runs on unmount
	useEffect(() => {
		return () => {
			// Clean up resize listeners
			const cleanupHandlers = (chartRef.current as any)?._cleanupHandlers;
			if (cleanupHandlers) {
				window.removeEventListener("resize", cleanupHandlers.handleResize);
				cleanupHandlers.resizeObserver.disconnect();
			}

			// Remove tooltip
			if (
				chartContainerRef.current &&
				tooltipRef.current &&
				tooltipRef.current.parentNode === chartContainerRef.current
			) {
				chartContainerRef.current.removeChild(tooltipRef.current);
			}

			// Remove watermark
			const watermark = (chartRef.current as any)?._watermark;
			if (watermark) {
				watermark.detach();
			}

			// Clean up chart
			const chart = chartRef.current;
			chartRef.current = null;
			tooltipRef.current = null;
			candlestickSeriesRef.current = null;
			volumeSeriesRef.current = null;
			ma10SeriesRef.current = null;
			ma20SeriesRef.current = null;
			ma50SeriesRef.current = null;
			ma100SeriesRef.current = null;
			ma200SeriesRef.current = null;
			macdHistogramSeriesRef.current = null;
			macdLineSeriesRef.current = null;
			macdSignalSeriesRef.current = null;

			if (chart) {
				try {
					chart.remove();
				} catch (error) {
					// Chart already disposed, ignore error
				}
			}
		};
	}, []);

	// Layer 2: useLayoutEffect for immediate crosshair clearing
	useLayoutEffect(() => {
		if (chartRef.current && !isDataInitialized) {
			chartRef.current?.clearCrosshairPosition();
			setCrosshairData(null);
			if (tooltipRef.current) {
				tooltipRef.current.innerHTML = "";
				tooltipRef.current.style.display = "none";
			}
		}
	}, [isDataInitialized]);

	// Update chart data when chartData changes
	// Creates chart if it doesn't exist yet (single useEffect approach)
	useEffect(() => {
		// Create chart first if it doesn't exist
		if (!chartRef.current) {
			const createdChart = createChartWithContext();
			if (!createdChart) {
				// Chart creation failed, return early
				return;
			}
		}

		if (!candlestickSeriesRef.current || !volumeSeriesRef.current) {
			return;
		}

		// Save current viewport before setData resets it (only after initial load)
		const prevDataLength = prevDataLengthRef.current;
		const savedLogicalRange = isDataInitialized && chartRef.current
			? chartRef.current.timeScale().getVisibleLogicalRange()
			: null;

		// Update series data (even if empty - this clears the chart)
		candlestickSeriesRef.current.setData(chartData.candlestick);
		volumeSeriesRef.current.setData(chartData.volume);

		// Update MA series data - set to empty array if not visible
		if (ma10SeriesRef.current) {
			ma10SeriesRef.current.setData(maVisibility.ma10 ? chartData.ma10 : []);
		}
		if (ma20SeriesRef.current) {
			ma20SeriesRef.current.setData(maVisibility.ma20 ? chartData.ma20 : []);
		}
		if (ma50SeriesRef.current) {
			ma50SeriesRef.current.setData(maVisibility.ma50 ? chartData.ma50 : []);
		}
		if (ma100SeriesRef.current) {
			ma100SeriesRef.current.setData(maVisibility.ma100 ? chartData.ma100 : []);
		}
		if (ma200SeriesRef.current) {
			ma200SeriesRef.current.setData(maVisibility.ma200 ? chartData.ma200 : []);
		}

		// Update MACD series data
		if (macdHistogramSeriesRef.current) {
			macdHistogramSeriesRef.current.setData(chartData.macdHistogram);
		}
		if (macdLineSeriesRef.current) {
			macdLineSeriesRef.current.setData(chartData.macdLine);
		}
		if (macdSignalSeriesRef.current) {
			macdSignalSeriesRef.current.setData(chartData.macdSignal);
		}

		// Restore viewport after all setData calls (prevents zoom/scroll reset on subsequent updates)
		if (savedLogicalRange && chartRef.current && prevDataLength > 0) {
			const newDataLength = chartData.candlestick.length;
			const addedBars = newDataLength - prevDataLength;

			if (addedBars > 0 && savedLogicalRange.to >= prevDataLength - 1) {
				// New bars appended and user was viewing the right edge — shift viewport right
				chartRef.current.timeScale().setVisibleLogicalRange({
					from: savedLogicalRange.from + addedBars,
					to: savedLogicalRange.to + addedBars,
				});
			} else if (addedBars < 0 && savedLogicalRange.to > newDataLength - 1) {
				// Bars removed (e.g. Playground "Back") and viewport extends beyond new data — clamp
				chartRef.current.timeScale().setVisibleLogicalRange({
					from: Math.min(savedLogicalRange.from, Math.max(0, newDataLength - (savedLogicalRange.to - savedLogicalRange.from))),
					to: newDataLength - 1,
				});
			} else {
				// User viewing historical data or same bar count — restore same logical position
				chartRef.current.timeScale().setVisibleLogicalRange(savedLogicalRange);
			}
		}
		// Update ref for next render
		prevDataLengthRef.current = chartData.candlestick.length;

		// Set initial viewport only on first data load
		// IMPORTANT: Wait for containerWidth to be set by ResizeObserver before initializing viewport
		if (chartRef.current && chartData.candlestick.length > 0 && !isDataInitialized && containerWidth > 0) {
			const symbol = data?.[0]?.symbol ?? 'unknown';

			// Log viewport initialization start
			info(`[BaseChart][${symbol}] Initializing viewport`, {
				dataLength: chartData.candlestick.length,
				responsiveViewportSize,
				containerWidth
			});

			const viewportSize = Math.min(responsiveViewportSize, chartData.candlestick.length); // Show responsive number of bars or all if less
			const startIndex = Math.max(0, chartData.candlestick.length - viewportSize);
			const from = chartData.candlestick[startIndex].time;
			const to = chartData.candlestick[chartData.candlestick.length - 1].time;

			info(`[BaseChart][${symbol}] Viewport calculation`, {
				viewportSize,
				startIndex,
				fromTime: from,
				toTime: to
			});

			chartRef.current.timeScale().setVisibleRange({ from, to });

			info(`[BaseChart][${symbol}] Viewport initialized successfully`);

			// Layer 3: Enhanced viewport clearing with additional safeguards
			// Clear crosshair immediately
			chartRef.current?.clearCrosshairPosition();
			setCrosshairData(null);

			// Hide tooltip when clearing crosshair
			if (tooltipRef.current) {
				tooltipRef.current.innerHTML = "";
				tooltipRef.current.style.display = "none";
			}

			// Additional safeguard: Clear crosshair again in next frame
			requestAnimationFrame(() => {
				chartRef.current?.clearCrosshairPosition();
			});

			// Enable crosshair after everything is properly initialized
			chartRef.current.applyOptions({
				crosshair: {
					mode: CrosshairMode.Normal,
				},
			});

			setIsDataInitialized(true);

			info(`[BaseChart][${symbol}] Data initialization complete`);
		}
	}, [
		chartData,
		maVisibility,
		isDataInitialized,
		responsiveViewportSize,
		containerWidth,
	]);

	// Update candlestick series price format when data changes
	useEffect(() => {
		if (candlestickSeriesRef.current && data && data.length > 0) {
			const currentData = data[data.length - 1];
			candlestickSeriesRef.current.applyOptions({
				priceFormat: {
					type: "custom",
					formatter: (price: number) => {
						return formatPrice(price, currentData);
					},
					minMove: getOptimalMinMove(currentData.close, currentData.mode),
				},
			});
		}
	}, [data, getOptimalMinMove]);

	if (!data || data.length === 0) {
		return (
			<div>
				{title && <h3 className="font-semibold mb-4">{title}</h3>}
				<div className="flex items-center justify-center h-[400px] text-muted-foreground">
					{noDataMessage}
				</div>
			</div>
		);
	}

	return (
		<div>
			{showControls && title && (
				<div className="mb-4">
					<h3 className="font-semibold">{title}</h3>
				</div>
			)}

			{/* Ruler Section - Above Chart */}
			{rulerVisible && (
				<div className="bg-muted/50 border-b px-2">
					<RulerSection
						data={data}
						crosshairData={crosshairData ?? clickedCrosshairData}
						latestData={latestData}
					/>
				</div>
			)}

			{/* Chart Container */}
			<div className="relative overflow-hidden" style={{ height: `${height}px` }}>
				<div ref={chartContainerRef} className="absolute inset-0" />

				{/* Overlay for current/crosshair data */}
				{(() => {
					const displayData =
						crosshairData ?? clickedCrosshairData ?? latestData;
					if (!displayData) return null;

					// Build MA values array for visible MAs only
					const maValues = [];
					if (maVisibility.ma10 && displayData.ma10 != null) {
						maValues.push({
							label: "MA10",
							value: displayData.ma10,
							color: "#dc2626",
						});
					}
					if (maVisibility.ma20 && displayData.ma20 != null) {
						maValues.push({
							label: "MA20",
							value: displayData.ma20,
							color: "#16a34a",
						});
					}
					if (maVisibility.ma50 && displayData.ma50 != null) {
						maValues.push({
							label: "MA50",
							value: displayData.ma50,
							color: "#2563eb",
						});
					}

					return (
						<div>
							{/* First line - Symbol, Price, Volume, Timestamp */}
							<div
								className={cn(
									"absolute top-3 left-3 text-zinc-100 z-10 pointer-events-none",
									displayData.symbol && displayData.symbol.length >= 4
										? "text-[11px]"
										: "text-[12px]",
								)}
								style={{
									WebkitFontSmoothing: "antialiased",
									MozOsxFontSmoothing: "grayscale",
								}}
							>
								{(() => {
									const change = displayData.close_changed ?? 0;
									const colors = getChangeColors(change);
									return (
										<>
											<span className={cn("font-semibold", colors.symbol)}>
												{displayData.symbol}
											</span>{" "}
											<span className={cn(colors.price)}>
												{formatPrice(displayData.close, displayData)}
											</span>{" "}
											<span className={cn(colors.percent)}>
												{formatPercent(change)}
											</span>
										</>
									);
								})()}
								<span className="mx-1"></span>
								<span className={cn(getVolumeColor(displayData.volume_changed ?? 0))}>
									{formatVolume(displayData.volume)}
								</span>{" "}
								<span className={cn(getVolumePercentColor(displayData.volume_changed ?? 0))}>
									{formatPercent(displayData.volume_changed ?? 0)}
								</span>
								<span className="text-zinc-400 ml-2">
									{(() => {
										try {
											if (
												!displayData.time ||
												typeof displayData.time !== "string"
											)
												return "--";
											const date = parseUTCISOString(displayData.time);
											return isIntradayInterval
												? formatToVietnamDateTimeShort(date)
												: formatToVietnamDateShort(date);
										} catch {
											return "--";
										}
									})()}
								</span>
							</div>

							{/* Second line - MA values */}
							{maValues.length > 0 && (
								<div
									className={cn(
										"absolute top-7 left-3 text-zinc-100 z-10 pointer-events-none",
										"text-[9px]",
									)}
									style={{
										WebkitFontSmoothing: "antialiased",
										MozOsxFontSmoothing: "grayscale",
										opacity: 0.8,
									}}
								>
									{maValues.map((ma, index) => (
										<span key={ma.label}>
											<span style={{ color: ma.color }}>{ma.label}:</span>
											<span style={{ color: ma.color, marginLeft: "2px" }}>
												{formatPrice(ma.value, displayData)}
											</span>
											{index < maValues.length - 1 && (
												<span className="mx-1"></span>
											)}
										</span>
									))}
								</div>
							)}
						</div>
					);
				})()}

				{/* MACD pane label overlay */}
				{macdVisible && (
					<div
						className="absolute left-2 z-10 pointer-events-none text-[9px] tracking-wide"
						style={{ bottom: 28, color: '#71717a', fontFamily: 'monospace' }}
					>
						MACD(12,26,9){' '}
						<span style={{ color: '#2563eb' }}>━</span>{' '}
						<span style={{ color: '#ea580c' }}>━</span>
					</div>
				)}
			</div>
		</div>
	);
}
