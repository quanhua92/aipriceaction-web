import React from 'react'
import { Interval } from '@/lib/api-client'

export interface MaVisibility {
	ma10: boolean
	ma20: boolean
	ma50: boolean
	ma100: boolean
	ma200: boolean
}

interface ChartSettingsState {
	interval: Interval
	setInterval: (interval: Interval) => void
	limit: number
	setLimit: (limit: number) => void
	height: number
	setHeight: (height: number) => void
	maVisibility: MaVisibility
	setMaVisibility: (visibility: MaVisibility) => void
	resetMaVisibility: () => void
	startDate?: string
	setStartDate: (date?: string) => void
	endDate?: string
	setEndDate: (date?: string) => void
}

const ChartSettingsContext = React.createContext<ChartSettingsState | undefined>(
	undefined
)

/**
 * Get default MA visibility based on interval
 * For intervals < 1H: MA10, MA20, MA50 enabled; MA100, MA200 disabled
 * For intervals >= 1H: MA10, MA20, MA50, MA100 enabled; MA200 disabled
 * MA200 is always hidden by default
 */
function getDefaultMaVisibility(interval: Interval): MaVisibility {
	const shortIntervals = [
		Interval.Minute,
		Interval.Minutes5,
		Interval.Minutes15,
		Interval.Minutes30,
	]

	const isShortInterval = shortIntervals.includes(interval)

	return {
		ma10: true,
		ma20: true,
		ma50: true,
		ma100: !isShortInterval,
		ma200: false, // Always hidden by default
	}
}

export function ChartSettingsProvider({ children }: { children: React.ReactNode }) {
	const [interval, setInterval] = React.useState<Interval>(Interval.Daily)
	const [limit, setLimit] = React.useState<number>(252)
	const [height, setHeight] = React.useState<number>(300)
	const [maVisibility, setMaVisibility] = React.useState<MaVisibility>(() =>
		getDefaultMaVisibility(Interval.Daily)
	)
	const [startDate, setStartDate] = React.useState<string | undefined>(undefined)
	const [endDate, setEndDate] = React.useState<string | undefined>(undefined)

	// Update MA visibility when interval changes
	React.useEffect(() => {
		setMaVisibility(getDefaultMaVisibility(interval))
	}, [interval])

	const resetMaVisibility = () => {
		setMaVisibility(getDefaultMaVisibility(interval))
	}

	const value: ChartSettingsState = {
		interval,
		setInterval,
		limit,
		setLimit,
		height,
		setHeight,
		maVisibility,
		setMaVisibility,
		resetMaVisibility,
		startDate,
		setStartDate,
		endDate,
		setEndDate,
	}

	return (
		<ChartSettingsContext.Provider value={value}>
			{children}
		</ChartSettingsContext.Provider>
	)
}

export function useChartSettings() {
	const context = React.useContext(ChartSettingsContext)
	if (context === undefined) {
		throw new Error('useChartSettings must be used within a ChartSettingsProvider')
	}
	return context
}