import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { TrendSignal } from "@/components/TrendSignal";
import { VolumeProfileWidget } from "@/components/widgets/VolumeProfileWidget";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { RecentAlertsWidget } from "@/components/widgets/RecentAlertsWidget";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { ALL_WATCHLIST_NAME, HOME_CHART_TICKERS_STORAGE_KEY } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";
import type { Ticker } from "@/components/lists/SortableTickerList";

export const Route = createFileRoute("/")({ component: HomePage });

const DEFAULT_HOME_TICKERS = ['VNINDEX', 'VIC', 'STB', 'MSB'] as const;

function HomePage() {
	const { t } = useTranslation();

	// Chart tickers state with localStorage persistence - SSR-safe initialization
	const [chartTickers, setChartTickers] = React.useState<string[]>([...DEFAULT_HOME_TICKERS]);

	// Load stored chart tickers on client-side mount
	React.useEffect(() => {
		if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem(HOME_CHART_TICKERS_STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					if (Array.isArray(parsed) && parsed.length === 4) {
						setChartTickers(parsed);
					}
				} catch (error) {
					console.error("Failed to parse stored chart tickers:", error);
				}
			}
		}
	}, []);

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

	// Handler for chart ticker changes with localStorage persistence
	const handleChartTickerChange = (index: number) => (symbol: string) => {
		setChartTickers(prev => {
			const updated = [...prev];
			updated[index] = symbol;
			localStorage.setItem(HOME_CHART_TICKERS_STORAGE_KEY, JSON.stringify(updated));
			return updated;
		});
	};

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
						<Link to="/ai">
							<Button size="lg" className="mt-4 gap-2">
								<Brain className="h-5 w-5" />
								{t("common.home.tryAIContext")}
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
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
							defaultGroup={ALL_WATCHLIST_NAME}
							maxHeight="500px"
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

			{/* Section 3: Market Matrix */}
			<div className="p-2 md:p-6 border-t">
				<MarketMatrix />
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
