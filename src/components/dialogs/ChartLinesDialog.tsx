import * as React from 'react'
import { PenLine, Download, Upload } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useChartLines } from '@/contexts/ChartLinesContext'
import { useAPI } from '@/contexts/APIContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { formatPrice, formatPercent } from '@/lib/format'
import { getChartLines } from '@/lib/chart-lines-storage'
import { SafeLocalStorage } from '@/lib/localStorage'
import { CHART_LINES_STORAGE_KEY } from '@/lib/constants'
import type { ChartLine } from '@/lib/chart-lines-storage'

export interface ChartLinesDialogProps {
	children: React.ReactNode
	ticker: string
}

export function ChartLinesDialog({ children, ticker }: ChartLinesDialogProps) {
	const { t } = useTranslation()
	const {
		addChartLine,
		deleteChartLine,
		getChartLinesByTicker,
		refreshChartLines,
	} = useChartLines()
	const {
		allTickersLastData,
		allCryptoTickersLastData,
		allGlobalTickersLastData,
	} = useAPI()
	const { info, error: logError } = useLogs()

	const [open, setOpen] = React.useState(false)
	const [price, setPrice] = React.useState('')
	const [note, setNote] = React.useState('')
	const [error, setError] = React.useState('')

	// File input ref for import
	const fileInputRef = React.useRef<HTMLInputElement>(null)

	// Get current price for reference
	const currentPrice = React.useMemo(() => {
		const data =
			allTickersLastData[ticker] ||
			allCryptoTickersLastData[ticker] ||
			allGlobalTickersLastData[ticker]
		if (!data || data.length === 0) return null
		return data[data.length - 1].close
	}, [allTickersLastData, allCryptoTickersLastData, allGlobalTickersLastData, ticker])

	// Get ticker data for formatting
	const tickerData = React.useMemo(() => {
		const data =
			allTickersLastData[ticker] ||
			allCryptoTickersLastData[ticker] ||
			allGlobalTickersLastData[ticker]
		if (!data || data.length === 0) return null
		return data[data.length - 1]
	}, [allTickersLastData, allCryptoTickersLastData, allGlobalTickersLastData, ticker])

	// Get existing lines for this ticker
	const existingLines = React.useMemo(() => {
		return getChartLinesByTicker(ticker)
	}, [ticker, getChartLinesByTicker])

	// Calculate distance
	const distance = React.useMemo(() => {
		if (!currentPrice || !price) return null
		const target = Number(price)
		if (Number.isNaN(target) || target <= 0) return null
		return {
			absolute: target - currentPrice,
			percent: ((target - currentPrice) / currentPrice) * 100,
		}
	}, [currentPrice, price])

	const handleSave = () => {
		const target = Number(price)
		if (!price || Number.isNaN(target)) {
			setError(t('dialogs.chartLines.validation.required'))
			return
		}
		if (target <= 0) {
			setError(t('dialogs.chartLines.validation.positive'))
			return
		}

		try {
			addChartLine({
				ticker,
				price: target,
				note: note.trim() || undefined,
			})
			setPrice('')
			setNote('')
			setError('')
			setOpen(false)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error'
			setError(`Failed to add line: ${errorMessage}`)
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (!newOpen) {
			setPrice('')
			setNote('')
			setError('')
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSave()
		}
	}

	// Export chart lines to JSON file
	const handleExport = () => {
		try {
			const allLines = getChartLines()
			const dataStr = JSON.stringify(allLines, null, 2)
			const dataBlob = new Blob([dataStr], { type: 'application/json' })

			const url = URL.createObjectURL(dataBlob)
			const link = document.createElement('a')
			link.href = url
			const now = new Date()
			const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
			link.download = `chart-lines-${timestamp}.json`

			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			info('Chart Lines', `Exported ${allLines.length} chart lines`)
		} catch (err) {
			console.error('Export failed:', err)
			logError('Chart Lines', 'Failed to export chart lines')
		}
	}

	// Import chart lines from JSON file
	const handleImport = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const importedLines = JSON.parse(text) as ChartLine[]

			// Validate structure
			if (!Array.isArray(importedLines)) {
				throw new Error('Invalid file format: expected array')
			}

			// Get existing lines
			const existingAllLines = getChartLines()

			// Build a Set of (ticker, price) keys from existing lines
			const existingKeys = new Set(
				existingAllLines.map((l) => `${l.ticker}:${l.price}`),
			)

			// Only add imported lines that don't have the same (ticker, price) combo
			const newLines = importedLines.filter(
				(l) => !existingKeys.has(`${l.ticker}:${l.price}`),
			)

			// Merge: keep all existing + add non-duplicate imports
			const merged = [...existingAllLines, ...newLines]
			SafeLocalStorage.setItem(
				CHART_LINES_STORAGE_KEY,
				JSON.stringify(merged),
			)

			// Refresh UI
			refreshChartLines()

			const skippedCount = importedLines.length - newLines.length
			info(
				'Chart Lines',
				`Imported ${importedLines.length} lines (${newLines.length} new, ${skippedCount} duplicate skipped)`,
			)
		} catch (err) {
			console.error('Import failed:', err)
			logError(
				'Chart Lines',
				`Failed to import chart lines: ${err instanceof Error ? err.message : 'Unknown error'}`,
			)
		} finally {
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md w-[90vw] flex flex-col overflow-hidden p-0">
				<DialogHeader className="flex-shrink-0 px-6 pt-6">
					<DialogTitle className="flex items-center gap-2">
						<PenLine className="h-5 w-5" />
						{t('dialogs.chartLines.title')}
					</DialogTitle>
				</DialogHeader>

				<Tabs
					defaultValue="add"
					className="flex-1 min-h-0 flex flex-col gap-0"
				>
					<TabsList className="mx-6 mb-4 grid grid-cols-3">
						<TabsTrigger value="add">
							{t('dialogs.chartLines.tabs.add')}
						</TabsTrigger>
						<TabsTrigger value="lines">
							{t('dialogs.chartLines.tabs.lines')} ({existingLines.length})
						</TabsTrigger>
						<TabsTrigger value="settings">
							{t('dialogs.chartLines.tabs.settings')}
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="add"
						className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 pb-4"
					>
						{/* Ticker Display */}
						<div className="text-center mb-2">
							<div className="font-mono font-bold text-2xl">{ticker}</div>
						</div>

						{/* Price Fields */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">
									{t('dialogs.chartLines.currentPrice')}
								</label>
								<div className="px-3 py-2 rounded-md border bg-muted/30 h-10 flex items-center">
									<span className="font-bold tabular-nums text-sm">
										{currentPrice !== null && tickerData
											? formatPrice(currentPrice, tickerData)
											: '-'}
									</span>
								</div>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="line-price"
									className="text-sm font-medium"
								>
									{t('dialogs.chartLines.price')} *
								</label>
								<Input
									id="line-price"
									type="number"
									value={price}
									onChange={(e) => {
										setPrice(e.target.value)
										setError('')
									}}
									onKeyDown={handleKeyDown}
									placeholder="e.g., 25000"
									autoFocus
									step="any"
									className="h-10"
								/>
							</div>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						{/* Distance Display */}
						{distance && tickerData && (
							<div className="p-3 rounded-md border bg-muted/30 space-y-1">
								<div className="text-sm font-medium text-muted-foreground">
									{t('dialogs.chartLines.distance')}
								</div>
								<div className="text-sm font-bold">
									{formatPercent(distance.percent)} (
									{distance.absolute >= 0 ? '+' : ''}
									{formatPrice(distance.absolute, tickerData)})
								</div>
							</div>
						)}

						{/* Note Input */}
						<div className="space-y-2">
							<label
								htmlFor="chart-line-note"
								className="text-sm font-medium text-muted-foreground"
							>
								{t('dialogs.chartLines.note.label')}
							</label>
							<Textarea
								id="chart-line-note"
								value={note}
								onChange={(e) => {
									if (e.target.value.length <= 200) setNote(e.target.value)
								}}
								placeholder={t('dialogs.chartLines.note.placeholder')}
								rows={2}
								className="resize-none"
							/>
							<div className="text-xs text-muted-foreground text-right">
								{note.length}/200
							</div>
						</div>
					</TabsContent>

					<TabsContent
						value="lines"
						className="flex-1 min-h-0 overflow-y-auto px-6 pb-4"
					>
						{existingLines.length === 0 ? (
							<div className="text-center text-muted-foreground py-8">
								{t('dialogs.chartLines.existingLines.empty')}
							</div>
						) : (
							<div className="space-y-2">
								{existingLines.map((line) => {
									const lineDistance = currentPrice
										? ((line.price - currentPrice) / currentPrice) * 100
										: null

									return (
										<div
											key={line.id}
											className="p-3 rounded-md border bg-muted/30 text-sm space-y-2"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<span className="text-gray-500">—</span>
													<span className="font-semibold">
														{formatPrice(
															line.price,
															tickerData || { mode: 'vn' },
														)}
													</span>
													{lineDistance !== null && (
														<span className="text-muted-foreground text-xs">
															{formatPercent(lineDistance)}
														</span>
													)}
												</div>
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0 text-destructive hover:text-destructive"
													onClick={() => deleteChartLine(line.id)}
													title={t('dialogs.chartLines.delete')}
												>
													&times;
												</Button>
											</div>
											{line.note && line.note.trim() && (
												<div className="text-xs text-muted-foreground italic">
													{line.note}
												</div>
											)}
										</div>
									)
								})}
							</div>
						)}
					</TabsContent>

					<TabsContent
						value="settings"
						className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 pb-4"
					>
						<div className="space-y-3">
							<Button
								variant="outline"
								className="w-full flex items-center gap-2 justify-center"
								onClick={handleExport}
							>
								<Download className="h-4 w-4" />
								{t('dialogs.chartLines.export')}
							</Button>
							<Button
								variant="outline"
								className="w-full flex items-center gap-2 justify-center"
								onClick={handleImport}
							>
								<Upload className="h-4 w-4" />
								{t('dialogs.chartLines.import')}
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							{t('dialogs.chartLines.settingsDescription')}
						</p>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json"
							onChange={handleFileChange}
							className="hidden"
						/>
					</TabsContent>
				</Tabs>

				<DialogFooter className="flex-shrink-0 border-t pt-4 px-6 pb-6">
					<div className="flex gap-2 w-full">
						<Button
							variant="outline"
							onClick={() => handleOpenChange(false)}
							className="flex-1"
						>
							{t('dialogs.chartLines.cancel')}
						</Button>
						<Button onClick={handleSave} className="flex-1">
							{t('dialogs.chartLines.save')}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
