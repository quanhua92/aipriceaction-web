import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { TrendSignal } from "@/components/TrendSignal";
import { VolumeProfileWidget } from "@/components/widgets/VolumeProfileWidget";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { RecentAlertsWidget } from "@/components/widgets/RecentAlertsWidget";
import { RRGWidget } from "@/components/widgets/RRGWidget";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { TradingTreemap } from "@/components/echarts/TradingTreemap";
import { TreemapChartBar } from "@/components/echarts/TreemapChartBar";
import { HeroCTACarousel } from "@/components/HeroCTACarousel";
import { BasicTopPerformers } from "@/components/lists/BasicTopPerformers";
import { CRYPTO_WATCHLIST_NAME, CRYPTO_CHART_TICKERS_STORAGE_KEY } from "@/lib/constants";
import { SafeLocalStorage } from "@/lib/localStorage";
import { useTranslation } from "@/hooks/useTranslation";
import type { Ticker } from "@/components/lists/SortableTickerList";

export const Route = createFileRoute("/crypto")({ component: CryptoPage });

const DEFAULT_CRYPTO_TICKERS = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'TONUSDT'] as const;

function CryptoPage() {
	const { t } = useTranslation();

	// Chart tickers state with localStorage persistence
	const [chartTickers, setChartTickers] = React.useState<string[]>(() => {
		try {
			const stored = SafeLocalStorage.getItem(CRYPTO_CHART_TICKERS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed) && parsed.length === 4) {
					return parsed;
				}
			}
		} catch {
			// Ignore parse errors
		}
		return [...DEFAULT_CRYPTO_TICKERS];
	});

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);
	const [treemapTicker, setTreemapTicker] = React.useState<string | null>(null);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);
	const [treemapTickerSymbols, setTreemapTickerSymbols] = React.useState<string[]>([]);

	// Get ticker symbols array for navigation in fullscreen dialog
	const tickerSymbols = React.useMemo(() => {
		if (treemapTickerSymbols.length > 0) return treemapTickerSymbols;
		return sortedTickers.map(t => t.symbol);
	}, [treemapTickerSymbols, sortedTickers]);

	// Get current index for fullscreen dialog
	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = tickerSymbols.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, tickerSymbols]);

	const handleSelectTicker = (symbol: string) => {
		setTreemapTickerSymbols([]);
		setFullscreenTicker(symbol);
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	}

	const handleTreemapSelect = (symbol: string) => {
		setTreemapTicker(symbol);
	};

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	}

	// Handler for chart ticker changes with localStorage persistence
	const handleChartTickerChange = (index: number) => (symbol: string) => {
		setChartTickers(prev => {
			const updated = [...prev];
			updated[index] = symbol;
			SafeLocalStorage.setItem(CRYPTO_CHART_TICKERS_STORAGE_KEY, JSON.stringify(updated));
			return updated;
		});
	};

	return (
		<div className="space-y-8">
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

			{/* Section: Recent Triggered Alerts */}
			<RecentAlertsWidget />

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
			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
					<TradingViewChart ticker={chartTickers[0]} onTickerChange={handleChartTickerChange(0)} />
					<TradingViewChart ticker={chartTickers[1]} onTickerChange={handleChartTickerChange(1)} />
					<TradingViewChart ticker={chartTickers[2]} onTickerChange={handleChartTickerChange(2)} />
					<TradingViewChart ticker={chartTickers[3]} onTickerChange={handleChartTickerChange(3)} />
				</div>
			</div>

			{/* Section 2: Watchlist + Trend Signals */}
			<div className="p-2 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<BasicWatchList
							defaultSectionFilter="crypto"
							maxHeight="800px"
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

			{/* Section 2.5: Market Treemap */}
			<div className="p-3 md:p-4 border-t">
				<TradingTreemap defaultWatchlist={CRYPTO_WATCHLIST_NAME} onSelectTicker={handleTreemapSelect} />
			</div>

			{/* Section 2.5.1: Treemap Ticker Chart */}
			<TreemapChartBar
				defaultTicker="BTCUSDT"
				selectedTicker={treemapTicker}
				onTickerChange={handleTreemapSelect}
				storageKeyPrefix="crypto"
			/>

			{/* Section 2.6: Relative Rotation Graph */}
			<div className="p-3 md:p-4 border-t">
				<RRGWidget defaultGroup={CRYPTO_WATCHLIST_NAME} />
			</div>

			{/* Section 3: Top Performers + Market Matrix */}
			<div className="p-2 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<BasicTopPerformers
							defaultGroup={CRYPTO_WATCHLIST_NAME}
							defaultSectionFilter="crypto"
							defaultTopCount={10}
							showControls={true}
						/>
					</div>
					<div>
						<MarketMatrix defaultWatchlist={CRYPTO_WATCHLIST_NAME} />
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
	)
}
