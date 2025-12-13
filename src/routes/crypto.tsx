import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { TrendSignal } from "@/components/TrendSignal";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { HeroCTACarousel } from "@/components/HeroCTACarousel";
import { CRYPTO_WATCHLIST_NAME } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import type { Ticker } from "@/components/lists/SortableTickerList";

export const Route = createFileRoute("/crypto")({ component: CryptoPage });

function CryptoPage() {
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
	}

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	}

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	}

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
				<div className="container mx-auto p-6 md:p-8">
					<div className="max-w-4xl mx-auto text-center space-y-4">
						<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
							{t("common.home.welcomeTitle")}
						</h1>
						<p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
							{t("common.home.welcomeDescription")}
						</p>
						<HeroCTACarousel />
					</div>
				</div>
			</div>
			{/* Section 1: Charts Grid */}
			<div className="p-4 md:p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
					<TradingViewChart initialTicker="BTC" />
					<TradingViewChart initialTicker="ETH" />
					<TradingViewChart initialTicker="XRP" />
					<TradingViewChart initialTicker="TON" />
				</div>
			</div>

			{/* Section 2: Watchlist + Trend Signals */}
			<div className="p-2 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<BasicWatchList
							defaultGroup={CRYPTO_WATCHLIST_NAME}
							maxHeight="500px"
							showMarketIndices={true}
							showControls={false}
							onSelectTicker={handleSelectTicker}
							onSortedTickersChange={handleSortedTickersChange}
						/>
					</div>
					<div>
						<TrendSignal defaultWatchlist={CRYPTO_WATCHLIST_NAME} />
					</div>
				</div>
			</div>

			{/* Section 3: Market Matrix */}
			<div className="p-2 md:p-6 border-t">
				<MarketMatrix defaultWatchlist={CRYPTO_WATCHLIST_NAME} />
			</div>

			{/* Fullscreen Dialog */}
			<ChartFullscreenDialog
				ticker={fullscreenTicker}
				onClose={handleCloseFullscreen}
				tickerList={tickerSymbols}
				currentIndex={fullscreenTickerIndex}
			/>
		</div>
	)
}
