import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists/BasicWatchList";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { VolumeProfileWidget } from "@/components/widgets/VolumeProfileWidget";
import { DateControlWidget } from "@/components/widgets/DateControlWidget";
import { BasicBackTestWidget } from "@/components/widgets/BasicBackTestWidget";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TrendSignal } from "@/components/TrendSignal";
import { BasicTopPerformers } from "@/components/lists/BasicTopPerformers";
import {
	ALL_WATCHLIST_NAME,
	CUSTOM_WATCHLISTS_STORAGE_KEY,
	WATCH_LEFT_SIDEBAR_OPEN_KEY,
	WATCH_RIGHT_SIDEBAR_OPEN_KEY,
} from "@/lib/constants";
import { useChartSettings } from "@/contexts/ChartSettingsContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useLogs } from "@/contexts/LogsContext";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Collapsible,
	CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Upload, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { Ticker } from "@/components/lists/SortableTickerList";
import type { Interval } from "@/lib/api-client";
import { getCustomWatchlists, type CustomWatchlists } from "@/lib/watchlist-storage";

export const Route = createFileRoute("/watch")({
	component: WatchPage,
});

function WatchPage() {
	const { t } = useTranslation();
	const globalSettings = useChartSettings();
	const { info, error: logError } = useLogs();

	// State for watchlist
	const [selectedSector, setSelectedSector] = React.useState(ALL_WATCHLIST_NAME);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);

	
	// Pagination state
	const [currentPage, setCurrentPage] = React.useState(0);
	const [pageSize, setPageSize] = React.useState(10);

	// Grid columns state - responsive default: 1 on mobile, 2 on desktop
	const [columns, setColumns] = React.useState<1 | 2 | 3 | 4 | 5 | 6>(typeof window !== 'undefined' && window.innerWidth >= 768 ? 2 : 1);

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);

	// Active ticker for right sidebar (last clicked/interacted)
	const [activeTicker, setActiveTicker] = React.useState<string>("VNINDEX");

	// Sidebar visibility state
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(true);
	const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(true);

	// Calculate pagination
	const totalPages = Math.ceil(sortedTickers.length / pageSize);
	const paginatedTickers = React.useMemo(() => {
		const start = currentPage * pageSize;
		const end = start + pageSize;
		return sortedTickers.slice(start, end);
	}, [sortedTickers, currentPage, pageSize]);

	// Reset to first page when sector, sorting, or page size changes
	React.useEffect(() => {
		setCurrentPage(0);
	}, [selectedSector, sortedTickers, pageSize]);

	// Handlers
	const handleSectorChange = (sector: string) => {
		setSelectedSector(sector);
	};

	const handleSortedTickersChange = (tickers: Ticker[]) => {
		setSortedTickers(tickers);
	};

	const handlePageSizeChange = (size: string) => {
		setPageSize(Number(size));
	};

	const handleColumnsChange = (cols: string) => {
		setColumns(Number(cols) as 2 | 3 | 4);
	};

	const handleIntervalChange = (interval: Interval) => {
		globalSettings.setInterval(interval);
	};

	const handlePreviousPage = () => {
		setCurrentPage((prev) => Math.max(0, prev - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
	};

	const handleFirstPage = () => {
		setCurrentPage(0);
	};

	const handleLastPage = () => {
		setCurrentPage(totalPages - 1);
	};

	const handleSelectTicker = (symbol: string) => {
		setActiveTicker(symbol); // Update right sidebar
		setFullscreenTicker(symbol); // Open fullscreen dialog
	};

	// Handler for clicking on a chart (updates right sidebar only, no fullscreen)
	const handleChartClick = (symbol: string) => {
		setActiveTicker(symbol);
	};

	const handleCloseFullscreen = () => {
		setFullscreenTicker(null);
	};

	
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

	// Grid column classes for chart area
	const gridColsClass = {
		1: "grid-cols-1",
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-3",
		4: "grid-cols-1 md:grid-cols-4",
		5: "grid-cols-1 md:grid-cols-5",
		6: "grid-cols-1 md:grid-cols-6",
	}[columns];

	// Dynamic grid layout for main layout
	const mainGridLayoutClass = React.useMemo(() => {
		if (isLeftSidebarOpen && isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[380px_1fr_380px]";
		} else if (isLeftSidebarOpen && !isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[380px_1fr_48px]";
		} else if (!isLeftSidebarOpen && isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[48px_1fr_380px]";
		} else if (!isLeftSidebarOpen && !isRightSidebarOpen) {
			return "grid-cols-1 lg:grid-cols-[48px_1fr_48px]";
		} else {
			return "grid-cols-1";
		}
	}, [isLeftSidebarOpen, isRightSidebarOpen]);

	return (
		<div className="flex flex-col min-h-screen">
			
			{/* 3-Column Layout */}
			<div className={`grid ${mainGridLayoutClass} flex-1`}>
				{/* Left Sidebar - Watchlist */}
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
							<>
								<CollapsibleContent className="flex-1 flex flex-col min-h-0 gap-4">
									<BasicWatchList
										defaultGroup={ALL_WATCHLIST_NAME}
										maxHeight="calc(100vh - 12rem)"
										showMarketIndices={true}
										showControls={false}
										onSelectTicker={handleSelectTicker}
										onSectorChange={handleSectorChange}
										onSortedTickersChange={handleSortedTickersChange}
										className="flex-1"
									/>
									<DateControlWidget className="mt-4 lg:order-first lg:mt-0" />
								</CollapsibleContent>
							</>
						)}
					</Collapsible>
				</div>

				{/* Middle Column - Charts */}
				<div className="flex flex-col overflow-hidden">
					{/* Chart Controls Header */}
					<div className="border-b bg-background p-2 lg:p-4">
						<div className="flex flex-wrap items-center gap-2 lg:gap-4">
							{/* Charts per page selector */}
							<div className="flex items-center gap-1">
								<span className="text-xs lg:text-sm text-muted-foreground mr-1 lg:mr-2 hidden sm:inline">
									Charts:
								</span>
								{[10, 20, 30].map((size) => (
									<Button
										key={size}
										variant={pageSize === size ? "default" : "outline"}
										size="sm"
										onClick={() => handlePageSizeChange(String(size))}
										className="h-7 w-7 lg:h-8 lg:w-8 p-0 text-xs lg:text-sm"
									>
										{size}
									</Button>
								))}
							</div>

							<Separator orientation="vertical" className="h-4 lg:h-6 hidden sm:block" />

							{/* Column selector */}
							<div className="flex items-center gap-1">
								<span className="text-xs lg:text-sm text-muted-foreground mr-1 lg:mr-2 hidden sm:inline">
									Columns:
								</span>
								{[1, 2, 3, 4, 5, 6].map((col) => (
									<Button
										key={col}
										variant={columns === col ? "default" : "outline"}
										size="sm"
										onClick={() => handleColumnsChange(String(col))}
										className="h-7 w-7 lg:h-8 lg:w-8 p-0 text-xs lg:text-sm"
									>
										{col}
									</Button>
								))}
							</div>

													</div>
					</div>

					{/* Charts Area */}
					<div className="flex-1 p-4 md:p-6 overflow-auto">
						{/* Pagination Top */}
						<div className="mb-4">
							<PaginationControls
								currentPage={currentPage}
								totalPages={totalPages}
								onPrevious={handlePreviousPage}
								onNext={handleNextPage}
								onFirst={handleFirstPage}
								onLast={handleLastPage}
								t={t}
							/>
						</div>

						{/* Chart Grid */}
						{paginatedTickers.length > 0 ? (
							<div className={`grid ${gridColsClass} gap-4`}>
								{paginatedTickers.map((ticker) => (
									<div
										key={ticker.symbol}
										onClick={() => handleChartClick(ticker.symbol)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												handleChartClick(ticker.symbol);
											}
										}}
										className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
											activeTicker === ticker.symbol
												? 'shadow-sm shadow-primary/10'
												: 'hover:shadow-xs'
										}`}
									>
										<TradingViewChart
											initialTicker={ticker.symbol}
											showControls={true}
											height={300}
										/>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<p>{t('common.watch.noTickersToDisplay')}</p>
								<p className="text-sm mt-1">{t('common.watch.selectWatchlist')}</p>
							</div>
						)}

						{/* Pagination Bottom */}
						<div className="mt-4">
							<PaginationControls
								currentPage={currentPage}
								totalPages={totalPages}
								onPrevious={handlePreviousPage}
								onNext={handleNextPage}
								onFirst={handleFirstPage}
								onLast={handleLastPage}
								t={t}
							/>
						</div>

						{/* Stats Bar */}
						<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-4">
							<span>{t('common.watch.sector')}: <strong className="text-foreground">{selectedSector}</strong></span>
							<span>{t('common.watch.totalTickers')}: <strong className="text-foreground">{sortedTickers.length}</strong></span>
							<span>{t('common.watch.page')}: <strong className="text-foreground">{totalPages > 0 ? currentPage + 1 : 0}/{totalPages}</strong></span>
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
						<div className="w-[calc(100%-1rem)] lg:w-[calc(100%-2rem)] mx-2 lg:mx-4 mt-2 lg:mt-4 shrink-0">
							<TabsList className="w-full h-auto gap-1.5 flex-wrap">
										<TabsTrigger
											value="ticker"
											className="px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted whitespace-nowrap"
										>
											Ticker Info
										</TabsTrigger>
										<TabsTrigger
											value="matrix"
											className="px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted whitespace-nowrap"
										>
											Market Matrix
										</TabsTrigger>
										<TabsTrigger
											value="signals"
											className="px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted whitespace-nowrap"
										>
											Signals
										</TabsTrigger>
										<TabsTrigger
											value="performers"
											className="px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted whitespace-nowrap"
										>
											Top Performers
										</TabsTrigger>
										<TabsTrigger
											value="backtest"
											className="px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:hover:bg-green-700 data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted whitespace-nowrap"
										>
											Backtesting
										</TabsTrigger>
									</TabsList>
						</div>

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

									<TabsContent value="performers" forceMount className="flex-1 min-h-0 overflow-auto p-2 lg:p-4 data-[state=inactive]:hidden">
										<BasicTopPerformers
											maxItems={10}
											showControls={true}
										/>
									</TabsContent>

									<TabsContent value="backtest" forceMount className="flex-1 min-h-0 overflow-auto p-2 lg:p-4 data-[state=inactive]:hidden">
										<BasicBackTestWidget />
									</TabsContent>
								</Tabs>
	)}
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

// Pagination Controls Component
interface PaginationControlsProps {
	currentPage: number;
	totalPages: number;
	onPrevious: () => void;
	onNext: () => void;
	onFirst: () => void;
	onLast: () => void;
	t: (key: string) => string;
}

function PaginationControls({
	currentPage,
	totalPages,
	onPrevious,
	onNext,
	onFirst,
	onLast,
	t,
}: PaginationControlsProps) {
	const isFirstPage = currentPage === 0;
	const isLastPage = currentPage === totalPages - 1 || totalPages === 0;

	return (
		<div className="flex items-center justify-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={onFirst}
				disabled={isFirstPage}
				className="h-8 w-8 p-0"
				title="First page"
			>
				<ChevronsLeft className="h-4 w-4" />
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={onPrevious}
				disabled={isFirstPage}
				className="h-8 px-3"
			>
				<ChevronLeft className="h-4 w-4 mr-1" />
				<span className="hidden sm:inline">{t('common.watch.previous')}</span>
			</Button>

			<div className="px-4 py-1 text-sm font-medium bg-muted rounded-md min-w-[100px] text-center">
				{totalPages > 0 ? currentPage + 1 : 0} / {totalPages}
			</div>

			<Button
				variant="outline"
				size="sm"
				onClick={onNext}
				disabled={isLastPage}
				className="h-8 px-3"
			>
				<span className="hidden sm:inline">{t('common.watch.next')}</span>
				<ChevronRight className="h-4 w-4 ml-1" />
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={onLast}
				disabled={isLastPage}
				className="h-8 w-8 p-0"
				title="Last page"
			>
				<ChevronsRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
