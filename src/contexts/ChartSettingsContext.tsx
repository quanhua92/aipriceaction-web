import React from 'react'
import { Interval } from '@/lib/api-client'
import { DEFAULT_CHART_LIMIT, DEFAULT_DESKTOP_CHART_LIMIT, MAX_CHART_LIMIT, CHART_SETTINGS_STORAGE_KEY } from '@/lib/constants'
import { SafeLocalStorage } from '@/lib/localStorage'

export interface MaVisibility {
	ma10: boolean
	ma20: boolean
	ma50: boolean
	ma100: boolean
	ma200: boolean
}

export const MACD_HEIGHT_OPTIONS = [40, 60, 80, 100, 120, 150, 180, 200, 250] as const
export type MacdHeight = (typeof MACD_HEIGHT_OPTIONS)[number]

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
	macdHeight: MacdHeight
	setMacdHeight: (height: MacdHeight) => void
	startDate?: string
	setStartDate: (date?: string) => void
	endDate?: string
	setEndDate: (date?: string) => void
	priceLineWidth: number
	setPriceLineWidth: (width: number) => void
	rulerVisible: boolean
	setRulerVisible: (visible: boolean) => void
	rulerTimeA?: string
	setRulerTimeA: (time?: string) => void
	rulerTimeB?: string
	setRulerTimeB: (time?: string) => void
	clearRuler: () => void
	showAlertLines: boolean
	setShowAlertLines: (visible: boolean) => void
	showChartLines: boolean
	setShowChartLines: (visible: boolean) => void
}

/** Shape of data persisted to localStorage */
interface PersistedChartSettings {
	interval: string
	limit: number
	maVisibility: MaVisibility
	macdVisible: boolean
	macdHeight: MacdHeight
	priceLineWidth: number
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
		() => {
			const saved = persisted.current.limit
			if (saved === undefined || saved === null) return typeof window !== 'undefined' && window.innerWidth >= 768 ? DEFAULT_DESKTOP_CHART_LIMIT : DEFAULT_CHART_LIMIT
			return saved > MAX_CHART_LIMIT ? MAX_CHART_LIMIT : saved
		}
	)
	const [height, setHeight] = React.useState<number>(() => {
		if (typeof window === 'undefined') return 400
		const w = window.innerWidth
		if (w >= 1024) return 500
		if (w >= 768) return 400
		return 300
	})
	const [maVisibility, setMaVisibility] = React.useState<MaVisibility>(
		() => persisted.current.maVisibility ?? getDefaultMaVisibility(Interval.Daily)
	)
	const [macdVisible, setMacdVisible] = React.useState<boolean>(
		() => persisted.current.macdVisible ?? true
	)
	const [macdHeight, setMacdHeight] = React.useState<MacdHeight>(
		() => {
			const saved = persisted.current.macdHeight
			return saved && MACD_HEIGHT_OPTIONS.includes(saved) ? saved : 40
		}
	)
	const [startDate, setStartDate] = React.useState<string | undefined>(undefined)
	const [endDate, setEndDate] = React.useState<string | undefined>(undefined)
	const [rulerVisible, setRulerVisible] = React.useState<boolean>(false)
	const [priceLineWidth, setPriceLineWidth] = React.useState<number>(() => persisted.current.priceLineWidth ?? 2)
	const [rulerTimeA, setRulerTimeA] = React.useState<string | undefined>(undefined)
	const [rulerTimeB, setRulerTimeB] = React.useState<string | undefined>(undefined)
	const [showAlertLines, setShowAlertLines] = React.useState<boolean>(true)
	const [showChartLines, setShowChartLines] = React.useState<boolean>(true)

	// Persist settings to localStorage when they change
	React.useEffect(() => {
		savePersistedSettings({
			interval,
			limit,
			maVisibility,
			macdVisible,
			macdHeight,
			priceLineWidth,
		})
	}, [interval, limit, maVisibility, macdVisible, macdHeight, priceLineWidth])

	// Update MA visibility when interval changes
	const prevIntervalRef = React.useRef(interval)
	React.useEffect(() => {
		if (prevIntervalRef.current !== interval) {
			prevIntervalRef.current = interval
			setMaVisibility(getDefaultMaVisibility(interval))
		}
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
		macdHeight,
		setMacdHeight,
		priceLineWidth,
		setPriceLineWidth,
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
		showAlertLines,
		setShowAlertLines,
		showChartLines,
		setShowChartLines,
	}), [interval, limit, height, maVisibility, macdVisible, macdHeight, priceLineWidth, startDate, endDate, resetMaVisibility, rulerVisible, rulerTimeA, rulerTimeB, clearRuler, showAlertLines, showChartLines])

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
