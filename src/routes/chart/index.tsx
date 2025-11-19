import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import type { Ticker } from "@/components/lists/SortableTickerList";

export const Route = createFileRoute("/chart/")({
	component: ChartPage,
});

function ChartPage() {
	const { t } = useTranslation();

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);

	// Get ticker symbols array for navigation in fullscreen dialog
	const tickerSymbols = React.useMemo(() => {
		return sortedTickers.map(t => t.symbol);
	}, [sortedTickers]);

	// Get current index for fullscreen dialog
	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = tickerSymbols.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, tickerSymbols]);

	const handleSelectTicker = (symbol: string) => {
		setFullscreenTicker(symbol);
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	};

	return (
		<div className="space-y-8">
			<ChartPageContent />

			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<TradingViewChart initialTicker="VNINDEX" />
					<TradingViewChart initialTicker="VIC" />
					<TradingViewChart initialTicker="STB" />
					<TradingViewChart initialTicker="VIX" />
				</div>
			</div>

			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<BasicWatchList
							defaultGroup={ALL_WATCHLIST_NAME}
							maxHeight="500px"
							showMarketIndices={true}
							showControls={false}
							onSelectTicker={handleSelectTicker}
							onSortedTickersChange={handleSortedTickersChange}
						/>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">
							{t('common.watch.clickToViewFullscreen')}
						</p>
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

function ChartPageContent() {
	return (
		<div className="p-4 md:p-6">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">Chart</h1>
			</div>

			<div className="space-y-4">
				<BasicTickerWidget initialTicker="VNINDEX" />
			</div>
		</div>
	);
}
