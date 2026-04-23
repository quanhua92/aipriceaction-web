import { useTranslation } from "@/hooks/useTranslation";
import { TickerProvider, useTicker } from "@/contexts/TickerContext";
import {
	useChartSettings,
	MaVisibility,
} from "@/contexts/ChartSettingsContext";
import { useAPI } from "@/contexts/APIContext";
import { useAlert } from "@/contexts/AlertContext";
import { useChartLines } from "@/contexts/ChartLinesContext";
import * as React from "react";
import { Interval } from "@/lib/api-client";
import { BaseTradingViewChart } from "./BaseTradingViewChart";
import type {
	CreatePriceLineOptions,
	SeriesMarker,
	Time,
} from "lightweight-charts";
import { ChartControlBar } from "./ChartControlBar";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { getTickerMode } from "@/lib/ticker-utils";
import { StockData } from "@/lib/api-client";
import { MARKET_INDICES } from "@/lib/constants";

interface TradingViewChartProps {
	// Visual configuration
	title?: string;
	height?: number;
	showControls?: boolean;

	// Ticker control
	initialTicker?: string; // Static setup only
	ticker?: string; // External control
	onTickerChange?: (ticker: string) => void;

	// Settings control (optional - defaults to global settings)
	interval?: Interval;
	onIntervalChange?: (interval: Interval) => void;
	limit?: number;
	setLimit?: (limit: number) => void;
	setHeight?: (height: number) => void;
	maVisibility?: MaVisibility;
	setMaVisibility?: (visibility: MaVisibility) => void;
	resetMaVisibility?: () => void;
	startDate?: string;
	setStartDate?: (date?: string) => void;
	endDate?: string;
	setEndDate?: (date?: string) => void;
	endDateOverride?: string | null; // Local endDate override (for dialogs)

	// NEW: Cache support props
	cacheData?: StockData[];
	cacheMetadata?: {
		symbol: string;
		interval: Interval;
		startDate: string;
		endDate: string;
		mode: "vn" | "crypto" | "yahoo";
	};

	// Overlay: markers and price lines
	overlay?: {
		markers?: SeriesMarker<Time>[];
		priceLines?: CreatePriceLineOptions[];
	};

	// Viewport preservation for Playground
	preserveViewport?: boolean;

	// Infinite history scroll
	infiniteHistory?: boolean;

	// Hide fullscreen button (e.g. when inside ChartFullscreenDialog)
	hideFullscreenButton?: boolean;

	// Show alert price lines on chart (default: true)
	showAlertLines?: boolean;

	// Show chart lines on chart (default: true)
	showChartLines?: boolean;

	// Interval selector customization
	visibleIntervals?: Interval[];
	mobileVisibleIntervals?: Interval[];
	disabledIntervals?: Interval[];
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
	preserveViewport = false,
	infiniteHistory = true,
	hideFullscreenButton = false,
	showAlertLines: propsShowAlertLines,
	showChartLines: propsShowChartLines,
	visibleIntervals,
	mobileVisibleIntervals,
	disabledIntervals,
	...visualProps
}: TradingViewChartProps) {
	const { t } = useTranslation();
	const globalSettings = useChartSettings();
	const { priceLineWidth } = globalSettings;
	const showAlertLines = propsShowAlertLines ?? globalSettings.showAlertLines;
	const showChartLines = propsShowChartLines ?? globalSettings.showChartLines;
	const { selectedTicker, setSelectedTicker } = useTicker();
	const {
		allTickersLastData,
		allCryptoTickersLastData,
		allGlobalTickersLastData,
		tickers: stockTickers,
		cryptoTickers,
		globalTickers,
		tickerNames,
		cryptoTickerNames,
		globalTickerNames,
	} = useAPI();

	// Build alert price lines for current ticker
	const { getAlertsByTickerSymbol } = useAlert();
	const alertPriceLines = React.useMemo(() => {
		if (!selectedTicker) return [];
		const tickerAlerts = getAlertsByTickerSymbol(selectedTicker);
		if (tickerAlerts.length === 0) return [];

		return tickerAlerts.map((alert) => ({
			price: alert.target_price,
			color: '#eab308',
			lineWidth: priceLineWidth as 1 | 2 | 3 | 4,
			lineStyle: 2 as const,
			axisLabelVisible: true,
			title: alert.triggered ? '🔔' : '',
			id: `alert-${alert.id}`,
		}));
	}, [selectedTicker, getAlertsByTickerSymbol, priceLineWidth]);

	// Build chart line price lines for current ticker
	const { getChartLinesByTicker: getChartLinesByTickerSymbol } = useChartLines();
	const chartLinePriceLines = React.useMemo(() => {
		if (!selectedTicker) return [];
		const tickerLines = getChartLinesByTickerSymbol(selectedTicker);
		if (tickerLines.length === 0) return [];

		return tickerLines.map((line) => ({
			price: line.price,
			color: '#9ca3af',
			lineWidth: priceLineWidth as 1 | 2 | 3 | 4,
			lineStyle: 2 as const,
			axisLabelVisible: true,
			title: '',
			id: `chartline-${line.id}`,
		}));
	}, [selectedTicker, getChartLinesByTickerSymbol, priceLineWidth]);

	// Resolve ticker name for overlay display
	const resolvedTickerName = React.useMemo(() => {
		if (!selectedTicker) return null;
		const names = { ...tickerNames, ...cryptoTickerNames, ...globalTickerNames };
		const name = names[selectedTicker];
		if (!name) return null;
		return name;
	}, [selectedTicker, tickerNames, cryptoTickerNames, globalTickerNames]);

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(
		null,
	);

	// Use global settings as defaults, override with props if provided
	const currentInterval = interval ?? globalSettings.interval;
	const currentHeight = height ?? globalSettings.height;
	const currentMaVisibility = maVisibility ?? globalSettings.maVisibility;
	const handleIntervalChange = onIntervalChange ?? globalSettings.setInterval;

	// Fullscreen handlers
	const handleFullscreenClick = () => {
		setFullscreenTicker(selectedTicker);
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	// Create sorted tickerList for fullscreen dialog navigation (sorted by value = volume * close)
	const navigationTickers = React.useMemo(() => {
		// Check if current ticker is crypto
		const tickerMode = selectedTicker
			? getTickerMode(selectedTicker, stockTickers, globalTickers, cryptoTickers)
			: 'vn';
		const isCrypto = tickerMode === 'crypto';
		const isGlobal = tickerMode === 'yahoo';

		// For crypto: iterate over cryptoTickers (known list)
		if (isCrypto) {
			const tickersWithValue = cryptoTickers
				.map((ticker) => {
					const data = allCryptoTickersLastData[ticker.symbol];
					if (!data || data.length === 0) return null;
					const latestData = data[0];
					if (
						latestData?.close_changed === null ||
						latestData?.close_changed === undefined
					) {
						return null;
					}
					const value = (latestData.close ?? 0) * (latestData.volume ?? 0);
					return { symbol: ticker.symbol, value };
				})
				.filter(
					(item): item is { symbol: string; value: number } => item !== null,
				);

			tickersWithValue.sort((a, b) => b.value - a.value);
			return tickersWithValue.map((t) => t.symbol);
		}

		// For global/yahoo: iterate over globalTickers (known list)
		if (isGlobal) {
			const tickersWithValue = globalTickers
				.map((ticker) => {
					const data = allGlobalTickersLastData[ticker.symbol];
					if (!data || data.length === 0) return null;
					const latestData = data[0];
					if (
						latestData?.close_changed === null ||
						latestData?.close_changed === undefined
					) {
						return null;
					}
					const value = (latestData.close ?? 0) * (latestData.volume ?? 0);
					return { symbol: ticker.symbol, value };
				})
				.filter(
					(item): item is { symbol: string; value: number } => item !== null,
				);

			tickersWithValue.sort((a, b) => b.value - a.value);
			return tickersWithValue.map((t) => t.symbol);
		}

		// For stocks: create a Set of all known stock ticker symbols for fast lookup
		const knownTickerSymbols = new Set(stockTickers.map((t) => t.symbol));

		const tickersWithValue = Object.entries(allTickersLastData)
			.filter(([symbol, data]) => {
				if (!knownTickerSymbols.has(symbol)) return false;
				return (
					data &&
					data.length > 0 &&
					data[0]?.close_changed !== null &&
					data[0]?.close_changed !== undefined
				);
			})
			.map(([symbol, data]) => {
				const latestData = data[0];
				const value = (latestData.close ?? 0) * (latestData.volume ?? 0);
				return { symbol, value };
			});

		// Sort by value (highest first)
		tickersWithValue.sort((a, b) => b.value - a.value);

		// Extract symbols
		let symbols = tickersWithValue.map((t) => t.symbol);

		// Move market indices to front (keep original order: VNINDEX, VN30)
		symbols = symbols.filter((s) => !MARKET_INDICES.includes(s as any));
		symbols.unshift(...MARKET_INDICES);

		return symbols;
	}, [
		selectedTicker,
		stockTickers,
		cryptoTickers,
		globalTickers,
		allTickersLastData,
		allCryptoTickersLastData,
		allGlobalTickersLastData,
		MARKET_INDICES,
	]);

	// Get current index for fullscreen dialog
	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = navigationTickers.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, navigationTickers]);

	return (
		<>
			<div>
				{showControls && (
					<ChartControlBar
						ticker={selectedTicker}
						interval={currentInterval}
						onIntervalChange={handleIntervalChange}
						onTickerChange={(newTicker) => {
							setSelectedTicker(newTicker);
							onTickerChange?.(newTicker);
						}}
						showTickerSelect={true}
						onFullscreenClick={hideFullscreenButton ? undefined : handleFullscreenClick}
						visibleIntervals={visibleIntervals}
						mobileVisibleIntervals={mobileVisibleIntervals}
						disabledIntervals={disabledIntervals}
					/>
				)}
				<BaseTradingViewChart
					{...visualProps}
					overlay={{
						...visualProps.overlay,
						priceLines: [
							...(visualProps.overlay?.priceLines ?? []),
							...(showChartLines ? chartLinePriceLines : []),
							...(showAlertLines ? alertPriceLines : []),
						],
					}}
					height={currentHeight}
					maVisibility={currentMaVisibility}
					noDataMessage={t("common.noDataAvailable")}
					tickerName={resolvedTickerName}
					preserveViewport={preserveViewport}
					infiniteHistory={infiniteHistory}
				/>
			</div>

			{/* Fullscreen Dialog */}
			<ChartFullscreenDialog
				ticker={fullscreenTicker}
				onClose={handleCloseFullscreen}
				tickerList={navigationTickers}
				currentIndex={fullscreenTickerIndex}
			/>
		</>
	);
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
	);
}
