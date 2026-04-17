import { Interval } from '@/lib/api-client'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { ChartSettingsDialog } from '@/components/dialogs/ChartSettingsDialog'
import { QuickAddWatchListDialog } from '@/components/dialogs/QuickAddWatchListDialog'
import { QuickAddAlertDialog } from '@/components/dialogs/QuickAddAlertDialog'
import { ChartLinesDialog } from '@/components/dialogs/ChartLinesDialog'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTicker } from '@/contexts/TickerContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Settings, Maximize2, Plus, Loader2, Star, Bell, Download, Ruler, PenLine } from 'lucide-react'

interface ChartControlBarProps {
	// Required controlled props
	ticker: string
	interval: Interval
	onTickerChange: (ticker: string) => void
	onIntervalChange: (interval: Interval) => void

	// Optional UI customization
	showTickerSelect?: boolean // Default: true
	visibleIntervals?: Interval[] // Desktop visible intervals
	mobileVisibleIntervals?: Interval[] // Mobile visible intervals
	className?: string
	onFullscreenClick?: () => void
}

const DEFAULT_VISIBLE_INTERVALS: Interval[] = [
	Interval.Minutes15,
	Interval.Hourly,
	Interval.Daily,
	Interval.Weekly,
]

const DEFAULT_MOBILE_VISIBLE_INTERVALS: Interval[] = [
	Interval.Minutes15,
	Interval.Hourly,
	Interval.Daily,
]

const ALL_INTERVALS: Interval[] = [
	Interval.Minute,
	Interval.Minutes5,
	Interval.Minutes15,
	Interval.Minutes30,
	Interval.Hourly,
	Interval.Hours4,
	Interval.Daily,
	Interval.Weekly,
	Interval.BiWeekly,
	Interval.Monthly,
]

export function ChartControlBar({
	ticker,
	interval,
	onTickerChange,
	onIntervalChange,
	showTickerSelect = true,
	visibleIntervals = DEFAULT_VISIBLE_INTERVALS,
	mobileVisibleIntervals = DEFAULT_MOBILE_VISIBLE_INTERVALS,
	className = '',
	onFullscreenClick,
}: ChartControlBarProps) {
	const { t } = useTranslation()
	const { loadMoreHistoricalData, loadingMore, chartData } = useTicker()
	const chartEndDate = chartData[chartData.length - 1]?.time?.split('T')[0]
	const {
		interval: globalInterval,
		setInterval: setGlobalInterval,
		rulerVisible,
		setRulerVisible,
	} = useChartSettings()

	// Use global interval if no specific interval provided
	const currentInterval = interval ?? globalInterval
	const handleIntervalChange = onIntervalChange ?? setGlobalInterval

	// Create dynamic visible intervals that include the current selection
	const createDynamicVisibleIntervals = (baseIntervals: Interval[]) => {
		const intervalsSet = new Set(baseIntervals)

		// If current interval is not in base intervals (non-common), hide 15m to make space
		const isNonCommonInterval = !baseIntervals.includes(currentInterval)
		if (isNonCommonInterval) {
			intervalsSet.delete(Interval.Minutes15)
		}

		// Always include the current interval
		intervalsSet.add(currentInterval)

		const mergedIntervals = Array.from(intervalsSet)
		// Sort by position in ALL_INTERVALS to maintain chronological order
		return mergedIntervals.sort(
			(a, b) => ALL_INTERVALS.indexOf(a) - ALL_INTERVALS.indexOf(b)
		)
	}

	const dynamicDesktopVisibleIntervals = createDynamicVisibleIntervals(visibleIntervals)
	const dynamicMobileVisibleIntervals = createDynamicVisibleIntervals(mobileVisibleIntervals)

	// Calculate hidden intervals for dropdown menu (excluding dynamically visible ones)
	const desktopHiddenIntervals = ALL_INTERVALS.filter(
		(i) => !dynamicDesktopVisibleIntervals.includes(i),
	)
	const mobileHiddenIntervals = ALL_INTERVALS.filter(
		(i) => !dynamicMobileVisibleIntervals.includes(i),
	)

	const renderIntervalButton = (int: Interval, _isMobile: boolean = false) => {
		const isMediumInterval = int === Interval.Minutes15 || int === Interval.Minutes30
		return (
			<Button
				key={int}
				variant="ghost"
				size="sm"
				onClick={() => handleIntervalChange(int)}
				className={`${isMediumInterval ? 'px-1' : 'px-2'} py-1 h-7 text-xs font-medium transition-colors ${
					currentInterval === int
						? 'bg-primary text-primary-foreground hover:bg-primary/90'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'
				}`}
			>
				{int}
			</Button>
		)
	}

	return (
		<div className={`flex items-center gap-0.5 ${className}`}>
			{/* Ticker Selection Button */}
			{showTickerSelect && (
				<>
					<SelectTickerDialog onSelectTicker={onTickerChange} endDate={chartEndDate}>
						<Button
							variant="outline"
							size="sm"
							className={`h-7 ${ticker.length > 4 ? 'text-[10px] px-1' : 'text-xs px-1.5'}`}
						>
							{ticker}
						</Button>
					</SelectTickerDialog>
					<Separator orientation="vertical" className="h-6" />
				</>
			)}

			{/* Desktop Interval Buttons */}
			<div className="hidden md:flex gap-px">
				{dynamicDesktopVisibleIntervals.map((int) => renderIntervalButton(int))}
			</div>

			{/* Mobile Interval Buttons */}
			<div className="flex md:hidden gap-px">
				{dynamicMobileVisibleIntervals.map((int) => renderIntervalButton(int, true))}
			</div>

			{/* More Menu - Desktop (shows hidden intervals only) */}
			{desktopHiddenIntervals.length > 0 && (
				<div className="hidden md:block">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-[80px]">
							{desktopHiddenIntervals.map((int) => (
								<DropdownMenuItem
									key={int}
									onClick={() => onIntervalChange(int)}
									className={`text-xs cursor-pointer ${
										interval === int
											? 'bg-primary text-primary-foreground'
											: ''
									}`}
								>
									{int}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}

			{/* More Menu - Mobile (shows hidden intervals) */}
			{mobileHiddenIntervals.length > 0 && (
				<div className="block md:hidden">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-[80px]">
							{mobileHiddenIntervals.map((int) => (
								<DropdownMenuItem
									key={int}
									onClick={() => onIntervalChange(int)}
									className={`text-xs cursor-pointer ${
										interval === int
											? 'bg-primary text-primary-foreground'
											: ''
									}`}
								>
									{int}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}

			{/* Right-aligned buttons group */}
			<div className="ml-auto flex items-center gap-0.5">
				{/* Fullscreen Button (if provided) */}
				{onFullscreenClick && (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={onFullscreenClick}
						title="Open fullscreen chart"
					>
						<Maximize2 className="h-4 w-4" />
					</Button>
				)}

				{/* Chart Lines Button - Add/Manage Chart Lines */}
				<ChartLinesDialog ticker={ticker}>
					<Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add chart line">
						<PenLine className="h-4 w-4" />
						<span className="sr-only">Add chart line</span>
					</Button>
				</ChartLinesDialog>

				{/* Bell Button - Add Alert */}
				<QuickAddAlertDialog ticker={ticker}>
					<Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add price alert">
						<Bell className="h-4 w-4" />
						<span className="sr-only">Add price alert</span>
					</Button>
				</QuickAddAlertDialog>

				{/* Star Button - Add to Watchlist */}
				<QuickAddWatchListDialog ticker={ticker}>
					<Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add to watchlist">
						<Star className="h-4 w-4" />
						<span className="sr-only">Add to watchlist</span>
					</Button>
				</QuickAddWatchListDialog>

				{/* Ruler Button */}
				<Button
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0"
					title="Toggle ruler"
					onClick={() => setRulerVisible(!rulerVisible)}
				>
					<Ruler className="h-4 w-4" />
				</Button>

				{/* Load More Button - Icon Only */}
				<Button
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0"
					onClick={loadMoreHistoricalData}
					disabled={loadingMore}
					title="Load more historical bars"
				>
					{loadingMore ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Download className="h-4 w-4" />
					)}
				</Button>

				{/* Settings Button - Top Right (hidden for now) */}
				{/* <ChartSettingsDialog>
					<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
						<Settings className="h-4 w-4" />
					</Button>
				</ChartSettingsDialog> */}
			</div>
		</div>
	)
}
