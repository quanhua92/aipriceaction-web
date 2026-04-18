import { CHART_LINES_STORAGE_KEY } from './constants'
import { SafeLocalStorage } from './localStorage'

export interface ChartLine {
	id: string
	ticker: string
	price: number
	note?: string
	created_at: string
}

export function getChartLines(): ChartLine[] {
	try {
		const stored = SafeLocalStorage.getItem(CHART_LINES_STORAGE_KEY)
		if (!stored) return []
		const parsed = JSON.parse(stored) as unknown[]
		if (!Array.isArray(parsed)) return []

		// Filter out invalid entries (e.g. from a bad import)
		const valid = parsed.filter(
			(item): item is ChartLine =>
				typeof item === 'object' && item !== null &&
				typeof (item as Record<string, unknown>).id === 'string' &&
				typeof (item as Record<string, unknown>).ticker === 'string' &&
				typeof (item as Record<string, unknown>).price === 'number',
		)

		// If any items were filtered out, persist the clean data back
		if (valid.length !== parsed.length) {
			SafeLocalStorage.setItem(CHART_LINES_STORAGE_KEY, JSON.stringify(valid))
		}

		return valid
	} catch (error) {
		console.error('Failed to get chart lines from localStorage:', error)
		return []
	}
}

function generateId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function addChartLine(
	line: Omit<ChartLine, 'id' | 'created_at'>,
): ChartLine {
	const newLine: ChartLine = {
		...line,
		id: generateId(),
		created_at: new Date().toISOString(),
	}

	const lines = getChartLines()
	lines.push(newLine)

	try {
		SafeLocalStorage.setItem(CHART_LINES_STORAGE_KEY, JSON.stringify(lines))
		return newLine
	} catch (error) {
		console.error('Failed to add chart line to localStorage:', error)
		throw error
	}
}

export function deleteChartLine(id: string): void {
	const lines = getChartLines()
	const filtered = lines.filter((l) => l.id !== id)

	try {
		SafeLocalStorage.setItem(CHART_LINES_STORAGE_KEY, JSON.stringify(filtered))
	} catch (error) {
		console.error('Failed to delete chart line from localStorage:', error)
		throw error
	}
}

export function getChartLinesByTicker(ticker: string): ChartLine[] {
	const lines = getChartLines()
	return lines.filter((l) => l.ticker === ticker)
}
