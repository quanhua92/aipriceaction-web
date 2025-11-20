import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import type { Ticker } from "@/components/lists/SortableTickerList";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	LayoutGrid,
	LayoutList,
	MoreVertical,
} from "lucide-react";

export const Route = createFileRoute("/chart/")({
	component: ChartPage,
});

type LayoutMode = "grid" | "vertical";

interface ChartPageLayout {
	chartCount: number;
	layoutMode: LayoutMode;
	chartTickers: string[];
}

const DEFAULT_LAYOUT: ChartPageLayout = {
	chartCount: 2,
	layoutMode: "grid",
	chartTickers: ["VIC", "VNINDEX", "ACB", "BCM", "BID", "CTG", "DGC", "FPT", "GAS", "GVR"],
};

function ChartPage() {

	// Layout state
	const [layout, setLayout] = React.useState<ChartPageLayout>(DEFAULT_LAYOUT);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);

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

	// Handler for watchlist ticker selection - always update first chart
	const handleSelectTicker = (symbol: string) => {
		setLayout((prev) => {
			const newTickers = [...prev.chartTickers];
			newTickers[0] = symbol; // Always update first chart
			return { ...prev, chartTickers: newTickers };
		});
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	};

	// Get grid columns class based on chart count and layout mode
	const getGridClass = () => {
		if (layout.layoutMode === "vertical") {
			return "grid grid-cols-1";
		}

		switch (layout.chartCount) {
			case 1:
				return "grid grid-cols-1";
			case 2:
				return "grid grid-cols-1 md:grid-cols-2";
			case 3:
				return "grid grid-cols-1 md:grid-cols-2";
			case 4:
				return "grid grid-cols-1 md:grid-cols-2";
			case 5:
			case 6:
				return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
			case 7:
			case 8:
			case 9:
				return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
			case 10:
				return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
			default:
				return "grid grid-cols-1 md:grid-cols-2";
		}
	};

	// Get first chart ticker for syncing with BasicTickerWidget
	const activeChartTicker = layout.chartTickers[0] || "VNINDEX";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] min-h-screen lg:h-[calc(100vh-4rem)] overflow-auto lg:overflow-hidden">
			{/* Left Sidebar - BasicWatchList */}
			<div className="h-auto lg:h-full border-r bg-background p-2 lg:p-4 flex flex-col overflow-hidden">
				<div className="flex items-center justify-between mb-2 lg:mb-4">
					<h2 className="text-base lg:text-lg font-semibold">Watchlist</h2>
				</div>
				<BasicWatchList
					defaultGroup={ALL_WATCHLIST_NAME}
					maxHeight="calc(100vh - 10rem)"
					showMarketIndices={true}
					showControls={false}
					onSelectTicker={handleSelectTicker}
					onSortedTickersChange={handleSortedTickersChange}
					className="flex-1"
				/>
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

						{/* Layout mode toggle */}
						<div className="flex items-center gap-1">
							<Button
								variant={layout.layoutMode === "grid" ? "default" : "outline"}
								size="sm"
								onClick={() => updateLayout({ layoutMode: "grid" })}
								disabled={layout.chartCount === 1}
								className="h-7 lg:h-8 px-2 lg:px-3 text-xs lg:text-sm"
							>
								<LayoutGrid className="h-3.5 w-3.5 lg:h-4 lg:w-4 lg:mr-1" />
								<span className="hidden sm:inline">Grid</span>
							</Button>
							<Button
								variant={layout.layoutMode === "vertical" ? "default" : "outline"}
								size="sm"
								onClick={() => updateLayout({ layoutMode: "vertical" })}
								disabled={layout.chartCount === 1}
								className="h-7 lg:h-8 px-2 lg:px-3 text-xs lg:text-sm"
							>
								<LayoutList className="h-3.5 w-3.5 lg:h-4 lg:w-4 lg:mr-1" />
								<span className="hidden sm:inline">Vertical</span>
							</Button>
						</div>
					</div>
				</div>

				{/* Charts Grid */}
				<div className="overflow-auto p-2 lg:p-4 min-h-[400px]">
					<div className={`${getGridClass()} gap-2 lg:gap-4 auto-rows-fr`}>
						{Array.from({ length: layout.chartCount }).map((_, index) => {
							const ticker = layout.chartTickers[index] || "VNINDEX";

							return (
								<div
									key={index}
									className="rounded-lg overflow-hidden min-h-[250px] lg:min-h-[300px]"
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

			{/* Right Sidebar - BasicTickerWidget */}
			<div className="h-auto lg:h-full border-l bg-background p-2 lg:p-4 flex flex-col overflow-hidden">
				<div className="flex items-center justify-between mb-2 lg:mb-4">
					<h2 className="text-base lg:text-lg font-semibold">Ticker Info</h2>
				</div>
				<div className="overflow-auto">
					<BasicTickerWidget
						ticker={activeChartTicker}
					/>
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
