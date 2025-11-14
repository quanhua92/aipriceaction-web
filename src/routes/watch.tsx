import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import { useChartSettings } from "@/contexts/ChartSettingsContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Ticker } from "@/components/lists/SortableTickerList";
import type { Interval } from "@/lib/api-client";

export const Route = createFileRoute("/watch")({
	component: WatchPage,
});

function WatchPage() {
	const { t } = useTranslation();
	const globalSettings = useChartSettings();

	// State for watchlist
	const [selectedSector, setSelectedSector] = React.useState(ALL_WATCHLIST_NAME);
	const [sortedTickers, setSortedTickers] = React.useState<Ticker[]>([]);

	// Pagination state
	const [currentPage, setCurrentPage] = React.useState(0);
	const [pageSize, setPageSize] = React.useState(10);

	// Grid columns state
	const [columns, setColumns] = React.useState<1 | 2 | 3 | 4 | 5 | 6>(2);

	// Fullscreen dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(null);

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
		setFullscreenTicker(symbol);
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

	// Grid column classes
	const gridColsClass = {
		1: "grid-cols-1",
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-3",
		4: "grid-cols-1 md:grid-cols-4",
		5: "grid-cols-1 md:grid-cols-5",
		6: "grid-cols-1 md:grid-cols-6",
	}[columns];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="p-4 md:p-6">
				<h1 className="text-2xl font-bold">{t('common.watch.title')}</h1>
				<p className="text-sm text-muted-foreground mt-1">
					{t('common.watch.description')}
				</p>
			</div>

			{/* Watchlist + Controls Section */}
			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left: BasicWatchList */}
					<div className="lg:col-span-1">
						<BasicWatchList
							defaultGroup={ALL_WATCHLIST_NAME}
							maxHeight="500px"
							showMarketIndices={true}
							showControls={false}
							onSelectTicker={handleSelectTicker}
							onSectorChange={handleSectorChange}
							onSortedTickersChange={handleSortedTickersChange}
						/>
					</div>

					{/* Right: Controls Panel */}
					<div className="lg:col-span-2 space-y-4">
						{/* Global Interval Control */}
						<div className="p-4 border rounded-lg bg-muted/30">
							<h3 className="text-sm font-semibold mb-3">{t('common.watch.globalSettings')}</h3>
							<div className="flex flex-wrap items-center gap-4">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium text-muted-foreground">{t('common.watch.interval')}:</span>
									<Select
										value={globalSettings.interval}
										onValueChange={handleIntervalChange}
									>
										<SelectTrigger className="w-28 h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1m">1 Minute</SelectItem>
											<SelectItem value="5m">5 Minutes</SelectItem>
											<SelectItem value="15m">15 Minutes</SelectItem>
											<SelectItem value="30m">30 Minutes</SelectItem>
											<SelectItem value="1H">1 Hour</SelectItem>
											<SelectItem value="4H">4 Hours</SelectItem>
											<SelectItem value="1D">1 Day</SelectItem>
											<SelectItem value="1W">1 Week</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						{/* Page Size + Columns Controls */}
						<div className="p-4 border rounded-lg bg-muted/30">
							<h3 className="text-sm font-semibold mb-3">{t('common.watch.gridLayout')}</h3>
							<div className="space-y-3">
								{/* Page Size */}
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium text-muted-foreground min-w-[100px]">
										{t('common.watch.chartsPerPage')}:
									</span>
									<div className="flex gap-1">
										{[10, 20, 30].map((size) => (
											<Button
												key={size}
												variant={pageSize === size ? "default" : "outline"}
												size="sm"
												onClick={() => handlePageSizeChange(String(size))}
												className="h-8 px-4"
											>
												{size}
											</Button>
										))}
									</div>
								</div>

								{/* Columns - hidden on mobile */}
								<div className="hidden md:flex items-center gap-2">
									<span className="text-sm font-medium text-muted-foreground min-w-[100px]">
										{t('common.watch.columns')}:
									</span>
									<div className="flex gap-1">
										{[1, 2, 3, 4, 5, 6].map((col) => (
											<Button
												key={col}
												variant={columns === col ? "default" : "outline"}
												size="sm"
												onClick={() => handleColumnsChange(String(col))}
												className="h-8 px-3"
											>
												{col}
											</Button>
										))}
									</div>
								</div>
							</div>
						</div>

						{/* Stats */}
						<div className="p-4 border rounded-lg bg-muted/30">
							<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
								<div>
									<span className="text-muted-foreground">{t('common.watch.sector')}: </span>
									<span className="font-semibold">{selectedSector}</span>
								</div>
								<div>
									<span className="text-muted-foreground">{t('common.watch.totalTickers')}: </span>
									<span className="font-semibold">{sortedTickers.length}</span>
								</div>
								<div>
									<span className="text-muted-foreground">{t('common.watch.page')}: </span>
									<span className="font-semibold">
										{totalPages > 0 ? currentPage + 1 : 0} / {totalPages}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Pagination Controls - Top */}
			<div className="px-4 md:px-6">
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
			<div className="p-4 md:p-6 border-t">
				{paginatedTickers.length > 0 ? (
					<div className={`grid ${gridColsClass} gap-4`}>
						{paginatedTickers.map((ticker) => (
							<div key={ticker.symbol} className="border rounded-lg p-3 bg-card">
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
			</div>

			{/* Pagination Controls - Bottom */}
			<div className="px-4 md:px-6 pb-6">
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
