import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { TradingTreemap } from "@/components/echarts/TradingTreemap";
import { TreemapChartBar } from "@/components/echarts/TreemapChartBar";
import { HeroCTACarousel } from "@/components/HeroCTACarousel";
import { HomeChartBar } from "@/components/HomeChartBar";
import { BasicTopPerformers } from "@/components/lists/BasicTopPerformers";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import type { Ticker } from "@/components/lists/SortableTickerList";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TickerSearchBar } from "@/components/TickerSearchBar";
import { TrendSignal } from "@/components/TrendSignal";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { RecentAlertsWidget } from "@/components/widgets/RecentAlertsWidget";
import { RRGWidget } from "@/components/widgets/RRGWidget";
import { VolumeProfileWidget } from "@/components/widgets/VolumeProfileWidget";
import { useTranslation } from "@/hooks/useTranslation";
import {
	ALL_WATCHLIST_NAME,
	HOME_CHART_TICKERS_STORAGE_KEY,
	LANDING_CHART_TICKERS_COUNT,
} from "@/lib/constants";
import { SafeLocalStorage } from "@/lib/localStorage";

export const Route = createFileRoute("/")({ component: HomePage });

const DEFAULT_HOME_TICKERS = [
	"VNINDEX",
	"VIC",
	"STB",
	"MSB",
	"FPT",
	"VNM",
	"HPG",
	"MWG",
] as const;

function HomePage() {
	const { t } = useTranslation();

	// Chart tickers state with localStorage persistence
	const [chartTickers, setChartTickers] = React.useState<string[]>(() => {
		try {
			const stored = SafeLocalStorage.getItem(HOME_CHART_TICKERS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (
					Array.isArray(parsed) &&
					parsed.length === LANDING_CHART_TICKERS_COUNT
				) {
					return parsed;
				}
			}
		} catch {
			// Ignore parse errors
		}
		return [...DEFAULT_HOME_TICKERS];
	});

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(
		null,
	);
	const [treemapTicker, setTreemapTicker] = React.useState<string | null>(null);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);
	const [treemapTickerSymbols, setTreemapTickerSymbols] = React.useState<
		string[]
	>([]);
	const [alertTickerSymbols, setAlertTickerSymbols] = React.useState<string[]>(
		[],
	);
	const [isAlertFullscreen, setIsAlertFullscreen] = React.useState(false);

	// Swap chart/treemap position
	const [treemapOrder, setTreemapOrder] = React.useState<
		"chart-first" | "treemap-first"
	>(() => {
		const stored = SafeLocalStorage.getItem("home-treemap-order");
		return stored === "treemap-first" ? "treemap-first" : "chart-first";
	});
	const handleSwapTreemapPosition = React.useCallback(() => {
		setTreemapOrder((prev) => {
			const next = prev === "chart-first" ? "treemap-first" : "chart-first";
			SafeLocalStorage.setItem("home-treemap-order", next);
			return next;
		});
	}, []);

	// Get ticker symbols array for navigation in fullscreen dialog
	const tickerSymbols = React.useMemo(() => {
		if (isAlertFullscreen && alertTickerSymbols.length > 0)
			return alertTickerSymbols;
		if (treemapTickerSymbols.length > 0) return treemapTickerSymbols;
		return sortedTickers.map((t) => t.symbol);
	}, [
		isAlertFullscreen,
		alertTickerSymbols,
		treemapTickerSymbols,
		sortedTickers,
	]);

	// Get current index for fullscreen dialog
	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = tickerSymbols.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, tickerSymbols]);

	const handleSelectTicker = (symbol: string) => {
		setIsAlertFullscreen(false);
		setTreemapTickerSymbols([]);
		setFullscreenTicker(symbol);
	};

	const handleAlertFullscreenClick = (ticker: string) => {
		setIsAlertFullscreen(true);
		setFullscreenTicker(ticker);
	};

	const handleAlertTickersChange = React.useCallback((tickers: string[]) => {
		setAlertTickerSymbols(tickers);
	}, []);

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	const handleTreemapSelect = (symbol: string) => {
		setTreemapTicker(symbol);
	};

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	};

	// Handler for chart ticker changes with localStorage persistence
	const handleChartTickerChange = (index: number) => (symbol: string) => {
		setChartTickers((prev) => {
			const updated = [...prev];
			updated[index] = symbol;
			SafeLocalStorage.setItem(
				HOME_CHART_TICKERS_STORAGE_KEY,
				JSON.stringify(updated),
			);
			return updated;
		});
	};

	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
				<div className="container mx-auto p-6 md:p-8">
					<div className="max-w-4xl mx-auto text-center space-y-4">
						<h1 className="text-3xl md:text-4xl font-bold leading-relaxed bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
							{t("common.home.welcomeTitle")}
						</h1>
						<p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
							{t("common.home.welcomeDescription")}
						</p>
						<HeroCTACarousel />
					</div>
				</div>
			</div>

			{/* Ticker Search Bar */}
			<div className="container mx-auto px-4 md:px-8">
				<TickerSearchBar onSelectTicker={handleSelectTicker} />
			</div>

			{/* Section: Recent Triggered Alerts */}
			<RecentAlertsWidget
				onFullscreenClick={handleAlertFullscreenClick}
				onAlertTickersChange={handleAlertTickersChange}
			/>

			{/* Section: Ticker Info + Volume Profile */}
			<div className="p-4 md:p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<BasicTickerWidget
						ticker={chartTickers[0]}
						onTickerChange={handleChartTickerChange(0)}
						onFullscreenClick={() => setFullscreenTicker(chartTickers[0])}
					/>
					<VolumeProfileWidget
						ticker={chartTickers[0]}
						onTickerChange={handleChartTickerChange(0)}
					/>
				</div>
			</div>

			{/* Section 1: Charts Grid */}
			<HomeChartBar
				chartTickers={chartTickers}
				onChartTickerChange={(index, symbol) =>
					handleChartTickerChange(index)(symbol)
				}
				storageKeyPrefix="home"
			/>

			{/* Section 2: Watchlist + Trend Signals */}
			<div className="p-2 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<BasicWatchList
							defaultGroup={ALL_WATCHLIST_NAME}
							maxHeight="800px"
							showMarketIndices={true}
							showControls={false}
							onSelectTicker={handleSelectTicker}
							onSortedTickersChange={handleSortedTickersChange}
						/>
					</div>
					<div>
						<TrendSignal />
					</div>
				</div>
			</div>

			{/* Section 2.5: Treemap Ticker Chart + Market Treemap */}
			<div className="flex flex-col">
				<div>
					<TreemapChartBar
						defaultTicker="VNINDEX"
						selectedTicker={treemapTicker}
						onTickerChange={handleTreemapSelect}
						storageKeyPrefix="home"
						onSwapClicked={handleSwapTreemapPosition}
					/>
				</div>
				<div
					className={`p-3 md:p-4 border-t ${treemapOrder === "treemap-first" ? "order-first" : ""}`}
				>
					<TradingTreemap
						defaultWatchlist={ALL_WATCHLIST_NAME}
						onSelectTicker={handleTreemapSelect}
					/>
				</div>
			</div>

			{/* Section 2.6: Relative Rotation Graph */}
			<div className="p-3 md:p-4 border-t">
				<RRGWidget defaultGroup={ALL_WATCHLIST_NAME} />
			</div>

			{/* Section 3: Top Performers + Market Matrix */}
			<div className="p-2 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<BasicTopPerformers defaultTopCount={10} showControls={true} />
					</div>
					<div>
						<MarketMatrix />
					</div>
				</div>
			</div>

			{/* Fullscreen Dialog */}
			<ChartFullscreenDialog
				ticker={fullscreenTicker}
				onClose={handleCloseFullscreen}
				tickerList={tickerSymbols}
				currentIndex={fullscreenTickerIndex}
			/>
		</div>
	);
}
