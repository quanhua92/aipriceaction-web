import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingTreemap } from "@/components/echarts/TradingTreemap";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { DateControlWidget } from "@/components/widgets/DateControlWidget";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import type { Ticker } from "@/components/lists/SortableTickerList";

export const Route = createFileRoute("/heatmap")({
	component: HeatmapPage,
});

function HeatmapPage() {
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);
	const [chartTicker, setChartTicker] = React.useState<string | null>(null);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);

	const tickerSymbols = React.useMemo(() => sortedTickers.map((t) => t.symbol), [sortedTickers]);

	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = tickerSymbols.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, tickerSymbols]);

	const handleSelectTicker = (symbol: string) => {
		setFullscreenTicker(symbol);
	};

	const handleTreemapSelect = (symbol: string) => {
		setChartTicker(symbol);
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	return (
		<div className="space-y-6">
			{/* Section: Date Control */}
			<div className="p-3 md:p-4">
				<DateControlWidget />
			</div>

			{/* Section: Market Treemap */}
			<div className="p-3 md:p-4">
				<TradingTreemap
					defaultWatchlist={ALL_WATCHLIST_NAME}
					onSelectTicker={handleTreemapSelect}
				/>
			</div>

			{/* Section: Ticker Chart */}
			{chartTicker && (
				<div className="p-3 md:p-4">
					<TradingViewChart
						ticker={chartTicker}
						showControls={true}
						hideFullscreenButton={false}
					/>
				</div>
			)}

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
	);
}
