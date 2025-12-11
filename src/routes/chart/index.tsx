import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { VolumeProfileWidget } from "@/components/widgets/VolumeProfileWidget";
import { DateControlWidget } from "@/components/widgets/DateControlWidget";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TrendSignal } from "@/components/TrendSignal";
import { BasicBackTestWidget } from "@/components/widgets/BasicBackTestWidget";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import {
	Collapsible,
	CollapsibleContent,
} from "@/components/ui/collapsible";
import type { Ticker } from "@/components/lists/SortableTickerList";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MoreVertical, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

export const Route = createFileRoute("/chart/")({
	component: ChartPage,
});

interface ChartPageLayout {
	chartCount: number;
	gridColumns: number;
	chartTickers: string[];
}

const DEFAULT_LAYOUT: ChartPageLayout = {
	chartCount: 2,
	gridColumns: 1,
	chartTickers: ["VIC", "VNINDEX", "ACB", "BCM", "BID", "CTG", "DGC", "FPT", "GAS", "GVR"],
};

function ChartPage() {

	// Layout state
	const [layout, setLayout] = React.useState<ChartPageLayout>(DEFAULT_LAYOUT);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);

	// Track active ticker for right sidebar (by symbol, like Watch page)
	const [activeTicker, setActiveTicker] = React.useState<string>("VNINDEX");

	// Sidebar visibility state
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(true);
	const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(true);

	// Get ticker symbols array for navigation in fullscreen dialog
	const tickerSymbols = React.useMemo(() => {
		return sortedTickers.map((t) => t.symbol);
	}, [sortedTickers]);

	// Get current index for fullscreen dialog
	const fullscreenTickerIndex = React.useMemo(() => {
		if (!fullscreenTicker) return 0;
		const index = tickerSymbols.indexOf(fullscreenTicker);
		return index !== -1 ? index : 0;
	}, [fullscreenTicker, tickerSymbols]);

	// Update layout helper
	const updateLayout = (updates: Partial<ChartPageLayout>) => {
		setLayout((prev) => ({ ...prev, ...updates }));
	};

	// Handler for watchlist ticker selection - open fullscreen dialog + sync chart + sidebar
	const handleSelectTicker = (symbol: string) => {
		setActiveTicker(symbol); // Update right sidebar widgets
		setFullscreenTicker(symbol); // Open fullscreen dialog
		setLayout((prev) => {
			const newTickers = [...prev.chartTickers];
			newTickers[0] = symbol; // Update FIRST chart to match selection
			return { ...prev, chartTickers: newTickers };
		});
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	};

	// Handler for clicking on a chart (updates right sidebar)
	const handleChartClick = (ticker: string) => {
		setActiveTicker(ticker);
	};

	// Get grid columns class based on gridColumns setting
	const getGridClass = () => {
		return `grid grid-cols-${layout.gridColumns}`;
	};

	// Dynamic grid layout for main layout
	const mainGridLayoutClass = React.useMemo(() => {
		if (isLeftSidebarOpen && isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[320px_1fr_380px]";
		} else if (isLeftSidebarOpen && !isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[320px_1fr_48px]";
		} else if (!isLeftSidebarOpen && isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[48px_1fr_380px]";
		} else if (!isLeftSidebarOpen && !isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[48px_1fr_48px]";
		} else {
			return "grid-cols-1";
		}
	}, [isLeftSidebarOpen, isRightSidebarOpen]);

	// Reset activeTicker when it's no longer in displayed charts
	React.useEffect(() => {
		const currentTickers = layout.chartTickers.slice(0, layout.chartCount);
		if (!currentTickers.includes(activeTicker)) {
			setActiveTicker(layout.chartTickers[0] || "VNINDEX");
		}
	}, [layout.chartCount, layout.chartTickers, activeTicker]);

	return (
		<div className={`grid ${mainGridLayoutClass} min-h-screen`}>
			{/* Left Sidebar - BasicWatchList */}
			<div className={`h-auto lg:h-full border-r bg-background flex flex-col overflow-hidden transition-all duration-300 ${isLeftSidebarOpen ? 'p-2 lg:p-4' : 'p-2'}`}>
				{isLeftSidebarOpen ? (
					<>
						<div className="flex justify-end mb-2 lg:mb-4">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
								className="h-8 w-8 p-0 hover:bg-muted transition-colors"
								title="Collapse sidebar"
							>
								<PanelLeftClose className="h-4 w-4" />
							</Button>
						</div>
					</>
				) : (
					<div className="flex justify-center">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
							className="h-8 w-8 p-0 hover:bg-muted transition-colors"
							title="Expand sidebar"
						>
							<PanelLeftOpen className="h-4 w-4" />
						</Button>
					</div>
				)}

				<Collapsible open={isLeftSidebarOpen} onOpenChange={setIsLeftSidebarOpen}>
					{isLeftSidebarOpen && (
						<CollapsibleContent className="flex-1 flex flex-col min-h-0 gap-4">
							<BasicWatchList
								defaultGroup={ALL_WATCHLIST_NAME}
								maxHeight="calc(100vh - 10rem)"
								showMarketIndices={true}
								showControls={false}
								onSelectTicker={handleSelectTicker}
								onSortedTickersChange={handleSortedTickersChange}
								className="flex-1"
							/>
							<DateControlWidget className="mt-4 lg:order-first lg:mt-0" />
						</CollapsibleContent>
					)}
				</Collapsible>
			</div>

			{/* Middle Column - Charts */}
			<div className="flex flex-col overflow-hidden">
				{/* Chart Controls */}
				<div className="border-b bg-background p-2 lg:p-4">
					<div className="flex flex-wrap items-center gap-2 lg:gap-4">
						{/* Chart count selector: 1-4 quick buttons */}
						<div className="flex items-center gap-1">
							<span className="text-xs lg:text-sm text-muted-foreground mr-1 lg:mr-2 hidden sm:inline">Charts:</span>
							{[1, 2, 3, 4].map((count) => (
								<Button
									key={count}
									variant={layout.chartCount === count ? "default" : "outline"}
									size="sm"
									onClick={() => updateLayout({ chartCount: count })}
									className="h-7 w-7 lg:h-8 lg:w-8 p-0 text-xs lg:text-sm"
								>
									{count}
								</Button>
							))}

							{/* Dropdown for 5-10 */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant={layout.chartCount > 4 ? "default" : "outline"}
										size="sm"
										className="h-7 w-7 lg:h-8 lg:w-8 p-0"
									>
										{layout.chartCount > 4 ? layout.chartCount : <MoreVertical className="h-3.5 w-3.5 lg:h-4 lg:w-4" />}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{[5, 6, 7, 8, 9, 10].map((count) => (
										<DropdownMenuItem
											key={count}
											onClick={() => updateLayout({ chartCount: count })}
										>
											{count} Charts
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<Separator orientation="vertical" className="h-4 lg:h-6 hidden sm:block" />

						{/* Column selector */}
						<div className="flex items-center gap-1">
							<span className="text-xs lg:text-sm text-muted-foreground mr-1 lg:mr-2 hidden sm:inline">Columns:</span>
							{[1, 2, 3, 4, 5, 6].map((col) => (
								<Button
									key={col}
									variant={layout.gridColumns === col ? "default" : "outline"}
									size="sm"
									onClick={() => updateLayout({ gridColumns: col })}
									className="h-7 w-7 lg:h-8 lg:w-8 p-0 text-xs lg:text-sm"
								>
									{col}
								</Button>
							))}
						</div>
					</div>
				</div>

				{/* Charts Grid */}
				<div className="flex-1 p-4 md:p-6">
					<div className={`${getGridClass()} gap-2 lg:gap-4 auto-rows-fr`}>
						{Array.from({ length: layout.chartCount }).map((_, index) => {
							const ticker = layout.chartTickers[index] || "VNINDEX";

							return (
								<div
									key={index}
									onClick={() => handleChartClick(ticker)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											handleChartClick(ticker);
										}
									}}
									className={`rounded-lg overflow-hidden min-h-[250px] lg:min-h-[300px] cursor-pointer transition-all ${
										activeTicker === ticker
											? 'shadow-sm shadow-primary/10'
											: 'hover:shadow-xs'
									}`}
								>
									<TradingViewChart
										ticker={ticker}
										showControls={true}
										viewportSizeOverride={300}
										onTickerChange={(newTicker) => {
											setLayout((prev) => {
												const newTickers = [...prev.chartTickers];
												newTickers[index] = newTicker;
												return { ...prev, chartTickers: newTickers };
											});
										}}
									/>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Right Sidebar - Tabs */}
			<div className="h-auto lg:h-full border-l bg-background flex flex-col overflow-hidden transition-all duration-300">
				<div className="flex justify-start pt-2 px-2 lg:pt-4 lg:px-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
						className="h-8 w-8 p-0 hover:bg-muted transition-colors"
						title={isRightSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
					>
						{isRightSidebarOpen ? (
							<PanelRightClose className="h-4 w-4" />
						) : (
							<PanelRightOpen className="h-4 w-4" />
						)}
					</Button>
				</div>

				{isRightSidebarOpen && (
					<Tabs defaultValue="ticker" className="flex-1 flex flex-col min-h-0">
						<TabsList className="w-[calc(100%-1rem)] lg:w-[calc(100%-2rem)] mx-2 lg:mx-4 mt-2 lg:mt-4 shrink-0 h-9 lg:h-10 gap-1.5">
							<TabsTrigger
								value="ticker"
								className="flex-1 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted"
							>
								Ticker Info
							</TabsTrigger>
							<TabsTrigger
								value="matrix"
								className="flex-1 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted"
							>
								Market Matrix
							</TabsTrigger>
							<TabsTrigger
								value="signals"
								className="flex-1 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted"
							>
								Signals
							</TabsTrigger>
							<TabsTrigger
								value="backtest"
								className="flex-1 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted"
							>
								Backtesting
							</TabsTrigger>
						</TabsList>

						<TabsContent value="ticker" forceMount className="flex-1 min-h-0 overflow-auto p-2 lg:p-4 space-y-4 data-[state=inactive]:hidden">
							<BasicTickerWidget
								ticker={activeTicker}
								onTickerChange={handleSelectTicker}
							/>
							<VolumeProfileWidget
								ticker={activeTicker}
								onTickerChange={handleSelectTicker}
								maxHeight="600px"
							/>
						</TabsContent>

						<TabsContent value="matrix" forceMount className="flex-1 min-h-0 overflow-auto p-2 lg:p-4 data-[state=inactive]:hidden">
							<MarketMatrix />
						</TabsContent>

						<TabsContent value="signals" forceMount className="flex-1 min-h-0 overflow-auto data-[state=inactive]:hidden">
							<TrendSignal />
						</TabsContent>

						<TabsContent value="backtest" forceMount className="flex-1 min-h-0 overflow-auto p-2 lg:p-4 data-[state=inactive]:hidden">
							<BasicBackTestWidget />
						</TabsContent>
					</Tabs>
				)}
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
