import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingTreemap } from "@/components/echarts/TradingTreemap";
import { TreemapChartBar } from "@/components/echarts/TreemapChartBar";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { DateControlWidget } from "@/components/widgets/DateControlWidget";
import { RecentAlertsWidget } from "@/components/widgets/RecentAlertsWidget";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import { TickerSearchBar } from "@/components/TickerSearchBar";
import type { Ticker } from "@/components/lists/SortableTickerList";

export const Route = createFileRoute("/heatmap")({
	component: HeatmapPage,
});

function HeatmapPage() {
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);
	const [treemapTicker, setTreemapTicker] = React.useState<string | null>(null);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);
	const [alertTickerSymbols, setAlertTickerSymbols] = React.useState<string[]>([]);
	const [isAlertFullscreen, setIsAlertFullscreen] = React.useState(false);

	const tickerSymbols = React.useMemo(() => {
		if (isAlertFullscreen && alertTickerSymbols.length > 0) return alertTickerSymbols;
		return sortedTickers.map((t) => t.symbol);
	}, [isAlertFullscreen, alertTickerSymbols, sortedTickers]);

	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = tickerSymbols.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, tickerSymbols]);

	const handleSelectTicker = (symbol: string) => {
		setIsAlertFullscreen(false);
		setFullscreenTicker(symbol);
	};

	const handleAlertFullscreenClick = (ticker: string) => {
		setIsAlertFullscreen(true);
		setFullscreenTicker(ticker);
	};

	const handleAlertTickersChange = React.useCallback((tickers: string[]) => {
		setAlertTickerSymbols(tickers);
	}, []);

	const handleTreemapSelect = (symbol: string) => {
		setTreemapTicker(symbol);
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	return (
		<>
			{/* Ticker Search Bar */}
			<div className="container mx-auto px-4 md:px-8 pt-4">
				<TickerSearchBar onSelectTicker={handleSelectTicker} />
			</div>

			<div className="space-y-6">
			{/* Section: Recent Alerts */}
			<div className="p-3 md:p-4">
				<RecentAlertsWidget
					onFullscreenClick={handleAlertFullscreenClick}
					onAlertTickersChange={handleAlertTickersChange}
				/>
			</div>

			{/* Section: Date Control */}
			<div className="p-3 md:p-4">
				<DateControlWidget />
			</div>

			{/* Section: Ticker Chart */}
			<TreemapChartBar
				defaultTicker="VNINDEX"
				selectedTicker={treemapTicker}
				onTickerChange={handleTreemapSelect}
				storageKeyPrefix="heatmap"
			/>

			{/* Section: Market Treemap */}
			<div className="p-3 md:p-4">
				<TradingTreemap
					defaultWatchlist={ALL_WATCHLIST_NAME}
					onSelectTicker={handleTreemapSelect}
				/>
			</div>

			{/* Section: Watchlist */}
			<div className="p-2 md:p-6 border-t">
				<BasicWatchList
					defaultGroup={ALL_WATCHLIST_NAME}
					maxHeight="800px"
					showMarketIndices={true}
					showControls={false}
					onSelectTicker={handleSelectTicker}
					onSortedTickersChange={setSortedTickers}
				/>
			</div>

			{/* Fullscreen Dialog */}
			<ChartFullscreenDialog
				ticker={fullscreenTicker}
				onClose={handleCloseFullscreen}
				tickerList={tickerSymbols}
				currentIndex={fullscreenTickerIndex}
			/>
		</div>
		</>
	);
}
