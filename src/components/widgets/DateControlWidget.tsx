import * as React from 'react'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useAPI } from '@/contexts/APIContext'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/DateInput'
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	RotateCcw,
} from 'lucide-react'

interface DateControlWidgetProps {
	className?: string
}

/**
 * Get date range: +10 and -10 calendar days from reference date
 */
function getDateRange(dateStr: string): { startDate: string; endDate: string } {
	const date = new Date(dateStr)
	const start = new Date(date)
	const end = new Date(date)
	start.setDate(date.getDate() - 10)
	end.setDate(date.getDate() + 10)
	return {
		startDate: start.toISOString().split('T')[0],
		endDate: end.toISOString().split('T')[0],
	}
}

export function DateControlWidget({ className }: DateControlWidgetProps) {
	const { endDate, setEndDate } = useChartSettings()
	const { getTickers } = useAPI()

	// Store trading days for navigation
	const [tradingDays, setTradingDays] = React.useState<string[]>([])

	// Fetch VNINDEX trading days around current endDate
	const fetchTradingDays = React.useCallback(
		async (referenceDate: string) => {
			const { startDate, endDate: rangeEndDate } = getDateRange(referenceDate)

			try {
				const response = await getTickers('DateControlWidget.fetch', {
					symbol: 'VNINDEX',
					start_date: startDate,
					end_date: rangeEndDate,
				})

				const days = response['VNINDEX']
					?.map((d) => d.time.split('T')[0])
					.sort() // ascending order

				setTradingDays(days || [])
				return days || []
			} catch (error) {
				console.error('Failed to fetch trading days:', error)
				return []
			}
		},
		[getTickers]
	)

	// Fetch trading days when endDate changes
	React.useEffect(() => {
		const referenceDate = endDate || new Date().toISOString().split('T')[0]
		fetchTradingDays(referenceDate)
	}, [endDate, fetchTradingDays])

	// Navigate using trading days array
	const moveDate = React.useCallback(
		async (offset: number) => {
			const currentDate = endDate || new Date().toISOString().split('T')[0]

			if (!tradingDays.length) {
				// No trading days loaded, fetch first
				const days = await fetchTradingDays(currentDate)
				if (!days.length) return

				const nearestIndex = days.findIndex((d) => d >= currentDate)
				if (nearestIndex !== -1) {
					setEndDate(days[nearestIndex])
				}
				return
			}

			const currentIndex = tradingDays.findIndex((d) => d === currentDate)

			if (currentIndex === -1) {
				// Current date not in list, snap to nearest
				const nearestIndex = tradingDays.findIndex((d) => d >= currentDate)
				if (nearestIndex !== -1) {
					setEndDate(tradingDays[nearestIndex])
				} else if (tradingDays.length > 0) {
					setEndDate(tradingDays[tradingDays.length - 1])
				}
				return
			}

			const newIndex = currentIndex + offset

			// Within range - use trading days array
			if (newIndex >= 0 && newIndex < tradingDays.length) {
				setEndDate(tradingDays[newIndex])
			} else {
				// Beyond range - calculate target date and fetch new range
				const targetDate = tradingDays[newIndex < 0 ? 0 : tradingDays.length - 1]
				const days = await fetchTradingDays(targetDate)

				if (days.length > 0) {
					// Find the target date in new range and move from there
					const targetIndex = days.findIndex((d) => d === targetDate)
					if (targetIndex !== -1) {
						const finalIndex = targetIndex + (newIndex < 0 ? newIndex : newIndex - tradingDays.length + 1)
						const clampedIndex = Math.max(0, Math.min(days.length - 1, finalIndex))
						setEndDate(days[clampedIndex])
					}
				}
			}
		},
		[tradingDays, endDate, setEndDate, fetchTradingDays]
	)

	// Handle date input change - set directly, useEffect will fetch new trading days
	const handleDateChange = React.useCallback(
		(newDate: string | undefined) => {
			// Set directly - no snapping on manual input
			// useEffect will fetch trading days for this date range
			setEndDate(newDate)
		},
		[setEndDate]
	)

	// Snap to nearest trading day after trading days are loaded
	React.useEffect(() => {
		if (!endDate || tradingDays.length === 0) return

		// Check if current endDate is already a trading day
		if (tradingDays.includes(endDate)) return

		// Find nearest trading day
		const nearestIndex = tradingDays.findIndex((d) => d >= endDate)
		if (nearestIndex !== -1) {
			setEndDate(tradingDays[nearestIndex])
		} else {
			// If date is after all trading days, use the last one
			setEndDate(tradingDays[tradingDays.length - 1])
		}
	}, [tradingDays]) // Only run when tradingDays changes, not endDate

	// Compute navigation constraints
	// Only disable forward when at today or future (not at array boundary)
	const today = new Date().toISOString().split('T')[0]
	const isAtToday = !endDate || endDate >= today

	// Never disable back button (can always go further into history)
	const isAtStart = false
	const isAtEnd = isAtToday

	return (
		<div className={`border rounded-lg p-4 bg-card space-y-3 ${className || ''}`}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium">Date Control</h3>
				{endDate && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setEndDate(undefined)}
						className="h-7 text-xs"
					>
						<RotateCcw className="h-3.5 w-3.5 mr-1" />
						Live
					</Button>
				)}
			</div>

			{/* DateInput with calendar picker - show today as default */}
			<DateInput value={endDate || today} onChange={handleDateChange} />

			{/* Navigation buttons */}
			<div className="flex items-center justify-center gap-1">
				<Button
					variant="outline"
					size="sm"
					onClick={() => moveDate(-5)}
					disabled={isAtStart}
					className="h-8 w-8 p-0"
					title="Back 5 trading days"
				>
					<ChevronsLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => moveDate(-1)}
					disabled={isAtStart}
					className="h-8 w-8 p-0"
					title="Previous trading day"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => moveDate(1)}
					disabled={isAtEnd}
					className="h-8 w-8 p-0"
					title="Next trading day"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => moveDate(5)}
					disabled={isAtEnd}
					className="h-8 w-8 p-0"
					title="Forward 5 trading days"
				>
					<ChevronsRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}
