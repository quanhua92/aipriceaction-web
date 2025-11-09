import { Interval } from '@/lib/api-client'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

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
}: ChartControlBarProps) {
	// Calculate hidden intervals for dropdown menu
	const desktopHiddenIntervals = ALL_INTERVALS.filter(
		(i) => !visibleIntervals.includes(i),
	)
	const mobileHiddenIntervals = ALL_INTERVALS.filter(
		(i) => !mobileVisibleIntervals.includes(i),
	)

	const renderIntervalButton = (int: Interval, isMobile: boolean = false) => (
		<Button
			key={int}
			variant="ghost"
			size="sm"
			onClick={() => onIntervalChange(int)}
			className={`px-2 py-1 h-7 text-xs font-medium transition-colors ${
				interval === int
					? 'bg-primary text-primary-foreground hover:bg-primary/90'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'
			}`}
		>
			{int}
		</Button>
	)

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			{/* Ticker Selection Button */}
			{showTickerSelect && (
				<>
					<SelectTickerDialog onSelectTicker={onTickerChange}>
						<Button variant="outline" size="sm" className="h-7 text-xs">
							{ticker}
						</Button>
					</SelectTickerDialog>
					<Separator orientation="vertical" className="h-6 mx-1" />
				</>
			)}

			{/* Desktop Interval Buttons */}
			<div className="hidden md:flex gap-0.5">
				{visibleIntervals.map((int) => renderIntervalButton(int))}
			</div>

			{/* Mobile Interval Buttons */}
			<div className="flex md:hidden gap-0.5">
				{mobileVisibleIntervals.map((int) => renderIntervalButton(int, true))}
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
		</div>
	)
}
