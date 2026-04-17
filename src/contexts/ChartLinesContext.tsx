import * as React from 'react'
import {
	getChartLines,
	addChartLine as addChartLineToStorage,
	deleteChartLine as deleteChartLineFromStorage,
	type ChartLine,
} from '@/lib/chart-lines-storage'

interface ChartLinesContextValue {
	chartLines: ChartLine[]
	addChartLine: (line: Omit<ChartLine, 'id' | 'created_at'>) => ChartLine
	deleteChartLine: (id: string) => void
	getChartLinesByTicker: (ticker: string) => ChartLine[]
	refreshChartLines: () => void
}

const ChartLinesContext = React.createContext<ChartLinesContextValue | undefined>(
	undefined,
)

export function ChartLinesProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [chartLines, setChartLines] = React.useState<ChartLine[]>([])

	const refreshChartLines = React.useCallback(() => {
		const loadedLines = getChartLines()
		setChartLines(loadedLines)
	}, [])

	React.useEffect(() => {
		refreshChartLines()
	}, [refreshChartLines])

	const addChartLine = React.useCallback(
		(line: Omit<ChartLine, 'id' | 'created_at'>) => {
			const newLine = addChartLineToStorage(line)
			setChartLines((prev) => [...prev, newLine])
			return newLine
		},
		[],
	)

	const deleteChartLine = React.useCallback((id: string) => {
		deleteChartLineFromStorage(id)
		setChartLines((prev) => prev.filter((l) => l.id !== id))
	}, [])

	const getChartLinesByTicker = React.useCallback(
		(ticker: string) => {
			return chartLines.filter((l) => l.ticker === ticker)
		},
		[chartLines],
	)

	const value: ChartLinesContextValue = {
		chartLines,
		addChartLine,
		deleteChartLine,
		getChartLinesByTicker,
		refreshChartLines,
	}

	return (
		<ChartLinesContext.Provider value={value}>
			{children}
		</ChartLinesContext.Provider>
	)
}

export function useChartLines(): ChartLinesContextValue {
	const context = React.useContext(ChartLinesContext)
	if (context === undefined) {
		throw new Error(
			'useChartLines must be used within a ChartLinesProvider',
		)
	}
	return context
}
