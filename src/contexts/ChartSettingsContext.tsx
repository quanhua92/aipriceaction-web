import React from 'react'
import { Interval } from '@/lib/api-client'
import { DEFAULT_CHART_LIMIT, CHART_SETTINGS_STORAGE_KEY } from '@/lib/constants'
import { SafeLocalStorage } from '@/lib/localStorage'

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
	macdVisible: boolean
	setMacdVisible: (visible: boolean) => void
	startDate?: string
	setStartDate: (date?: string) => void
	endDate?: string
	setEndDate: (date?: string) => void
	rulerVisible: boolean
	setRulerVisible: (visible: boolean) => void
	rulerTimeA?: string
	setRulerTimeA: (time?: string) => void
	rulerTimeB?: string
	setRulerTimeB: (time?: string) => void
	clearRuler: () => void
}

/** Shape of data persisted to localStorage */
interface PersistedChartSettings {
	interval: string
	limit: number
	maVisibility: MaVisibility
	macdVisible: boolean
}

const ChartSettingsContext = React.createContext<ChartSettingsState | undefined>(
	undefined
)

/**
 * Get default MA visibility based on interval
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
		ma200: false,
	}
}

/** Load persisted settings from localStorage */
function loadPersistedSettings(): Partial<PersistedChartSettings> {
	const raw = SafeLocalStorage.getItem(CHART_SETTINGS_STORAGE_KEY)
	if (!raw) return {}
	try {
		return JSON.parse(raw) as Partial<PersistedChartSettings>
	} catch {
		return {}
	}
}

/** Save settings to localStorage */
function savePersistedSettings(settings: PersistedChartSettings) {
	SafeLocalStorage.setItem(CHART_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function ChartSettingsProvider({ children }: { children: React.ReactNode }) {
	const persisted = React.useRef(loadPersistedSettings())

	const [interval, setInterval] = React.useState<Interval>(
		() => {
			const saved = persisted.current.interval
			return saved ? (saved as Interval) : Interval.Daily
		}
	)
	const [limit, setLimit] = React.useState<number>(
		() => persisted.current.limit ?? DEFAULT_CHART_LIMIT
	)
	const [height, setHeight] = React.useState<number>(
		typeof window !== 'undefined' && window.innerWidth >= 768 ? 400 : 300
	)
	const [maVisibility, setMaVisibility] = React.useState<MaVisibility>(
		() => persisted.current.maVisibility ?? getDefaultMaVisibility(Interval.Daily)
	)
	const [macdVisible, setMacdVisible] = React.useState<boolean>(
		() => persisted.current.macdVisible ?? true
	)
	const [startDate, setStartDate] = React.useState<string | undefined>(undefined)
	const [endDate, setEndDate] = React.useState<string | undefined>(undefined)
	const [rulerVisible, setRulerVisible] = React.useState<boolean>(false)
	const [rulerTimeA, setRulerTimeA] = React.useState<string | undefined>(undefined)
	const [rulerTimeB, setRulerTimeB] = React.useState<string | undefined>(undefined)

	// Persist settings to localStorage when they change
	React.useEffect(() => {
		savePersistedSettings({
			interval,
			limit,
			maVisibility,
			macdVisible,
		})
	}, [interval, limit, maVisibility, macdVisible])

	// Update MA visibility when interval changes
	React.useEffect(() => {
		setMaVisibility(getDefaultMaVisibility(interval))
	}, [interval])

	const resetMaVisibility = React.useCallback(() => {
		setMaVisibility(getDefaultMaVisibility(interval))
	}, [interval])

	const clearRuler = React.useCallback(() => {
		setRulerTimeA(undefined)
		setRulerTimeB(undefined)
	}, [])

	const value: ChartSettingsState = React.useMemo(() => ({
		interval,
		setInterval,
		limit,
		setLimit,
		height,
		setHeight,
		maVisibility,
		setMaVisibility,
		resetMaVisibility,
		macdVisible,
		setMacdVisible,
		startDate,
		setStartDate,
		endDate,
		setEndDate,
		rulerVisible,
		setRulerVisible,
		rulerTimeA,
		setRulerTimeA,
		rulerTimeB,
		setRulerTimeB,
		clearRuler,
	}), [interval, limit, height, maVisibility, macdVisible, startDate, endDate, resetMaVisibility, rulerVisible, rulerTimeA, rulerTimeB, clearRuler])

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
