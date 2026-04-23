import React from 'react'
import { useChartSettings, MACD_HEIGHT_OPTIONS } from '@/contexts/ChartSettingsContext'
import { useAPI } from '@/contexts/APIContext'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DateInput } from '@/components/DateInput'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { DEFAULT_CHART_LIMIT } from '@/lib/constants'

interface ChartSettingsDialogProps {
	children: React.ReactNode
}

const LIMIT_OPTIONS = [
	{ value: '20', label: '20 bars' },
	{ value: '30', label: '30 bars' },
	{ value: '50', label: '50 bars' },
	{ value: '75', label: '75 bars' },
	{ value: '100', label: '100 bars' },
	{ value: '150', label: '150 bars' },
	{ value: '200', label: '200 bars' },
	{ value: '256', label: '256 bars' },
]

const HEIGHT_OPTIONS = [
	{ value: '200', label: '200px' },
	{ value: '300', label: '300px' },
	{ value: '400', label: '400px' },
	{ value: '500', label: '500px' },
	{ value: '600', label: '600px' },
]

export function ChartSettingsDialog({ children }: ChartSettingsDialogProps) {
	const {
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
		startDate,
		setStartDate,
		endDate,
		setEndDate,
		priceLineWidth,
		setPriceLineWidth,
	} = useChartSettings()
	const { ema, setEma } = useAPI()

	const [open, setOpen] = React.useState(false)

	const handleMaToggle = (ma: keyof typeof maVisibility) => {
		setMaVisibility({
			...maVisibility,
			[ma]: !maVisibility[ma],
		})
	}

	const handleClearFilters = () => {
		setStartDate(undefined)
		setEndDate(undefined)
		setLimit(DEFAULT_CHART_LIMIT)
		setPriceLineWidth(2)
		setHeight(typeof window !== 'undefined' && window.innerWidth >= 1024 ? 500 : window.innerWidth >= 768 ? 400 : 300)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Chart Settings</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4 max-h-[85vh] overflow-y-auto">
					{/* Two-Column Layout */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Left Column: Moving Averages */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium">Moving Averages</h3>
							<div className="flex items-center justify-between pb-2">
								<Label htmlFor="ema-toggle" className="text-sm cursor-pointer">Use EMA</Label>
								<Switch id="ema-toggle" checked={ema} onCheckedChange={(checked) => setEma(checked === true)} />
							</div>
							<div className="space-y-3">
								{/* MA10 */}
								<div className="flex items-center justify-between">
									<Label htmlFor="ma10" className="text-sm cursor-pointer flex items-center gap-2">
										<span className="w-8 h-0.5 bg-[#dc2626]" />
										MA10
									</Label>
									<Switch id="ma10" checked={maVisibility.ma10} onCheckedChange={() => handleMaToggle('ma10')} />
								</div>

								{/* MA20 */}
								<div className="flex items-center justify-between">
									<Label htmlFor="ma20" className="text-sm cursor-pointer flex items-center gap-2">
										<span className="w-8 h-0.5 bg-[#16a34a]" />
										MA20
									</Label>
									<Switch id="ma20" checked={maVisibility.ma20} onCheckedChange={() => handleMaToggle('ma20')} />
								</div>

								{/* MA50 */}
								<div className="flex items-center justify-between">
									<Label htmlFor="ma50" className="text-sm cursor-pointer flex items-center gap-2">
										<span className="w-8 h-0.5 bg-[#2563eb]" />
										MA50
									</Label>
									<Switch id="ma50" checked={maVisibility.ma50} onCheckedChange={() => handleMaToggle('ma50')} />
								</div>

								{/* MA100 */}
								<div className="flex items-center justify-between">
									<Label htmlFor="ma100" className="text-sm cursor-pointer flex items-center gap-2">
										<span className="w-8 h-0.5 bg-[#a1a1aa]" />
										MA100
									</Label>
									<Switch id="ma100" checked={maVisibility.ma100} onCheckedChange={() => handleMaToggle('ma100')} />
								</div>

								{/* MA200 */}
								<div className="flex items-center justify-between">
									<Label htmlFor="ma200" className="text-sm cursor-pointer flex items-center gap-2">
										<span className="w-8 h-0.5 bg-[#71717a]" />
										MA200
									</Label>
									<Switch id="ma200" checked={maVisibility.ma200} onCheckedChange={() => handleMaToggle('ma200')} />
								</div>
							</div>

							{/* MACD Indicator */}
							<div className="pt-2 border-t mt-2">
								<h3 className="text-sm font-medium mb-3">Indicators</h3>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<Switch
												id="macd"
												checked={macdVisible}
												onCheckedChange={(checked) => setMacdVisible(checked === true)}
											/>
											<Label
												htmlFor="macd"
												className="text-sm font-normal cursor-pointer flex items-center gap-2"
											>
												<span className="flex gap-0.5">
													<span className="w-3 h-0.5 bg-[#2563eb]" />
													<span className="w-3 h-0.5 bg-[#ea580c]" />
												</span>
												MACD (12, 26, 9)
											</Label>
										</div>
										{macdVisible && (
											<Select
												value={String(macdHeight)}
												onValueChange={(val) => setMacdHeight(Number(val) as any)}
											>
												<SelectTrigger className="w-[70px] h-7 text-xs">
												<SelectValue />
											</SelectTrigger>
												<SelectContent>
													{MACD_HEIGHT_OPTIONS.map((h) => (
														<SelectItem key={h} value={String(h)}>{h}px</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									</div>
								</div>
							</div>

							{/* Reset MA Button */}
							<div className="pt-2 space-y-2">
								<Button
									variant="outline"
									size="sm"
									onClick={resetMaVisibility}
									className="w-full"
								>
									Reset MA to Defaults
								</Button>
								<Button
									variant="default"
									size="sm"
									onClick={() => setOpen(false)}
									className="w-full"
								>
									Close
								</Button>
							</div>
						</div>

						{/* Right Column: Data Filters */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium">Data Filters</h3>
							<div className="space-y-3">
								{/* Start Date */}
								<div className="space-y-2">
									<Label htmlFor="start-date" className="text-sm">
										Start Date
									</Label>
									<DateInput
										id="start-date"
										value={startDate}
										onChange={setStartDate}
									/>
								</div>

								{/* End Date */}
								<div className="space-y-2">
									<Label htmlFor="end-date" className="text-sm">
										End Date
									</Label>
									<DateInput
										id="end-date"
										value={endDate}
										onChange={setEndDate}
									/>
								</div>

								{/* Limit */}
								<div className="space-y-2">
									<Label htmlFor="limit" className="text-sm">
										Limit
									</Label>
									<Select
										value={limit.toString()}
										onValueChange={(value) => setLimit(parseInt(value))}
									>
										<SelectTrigger id="limit" className="w-full">
											<SelectValue placeholder="Select limit" />
										</SelectTrigger>
										<SelectContent>
											{LIMIT_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

							{/* Height */}
							<div className="space-y-2">
								<Label htmlFor="height" className="text-sm">
									Height
								</Label>
								<Select
									value={height.toString()}
									onValueChange={(value) => setHeight(parseInt(value))}
								>
									<SelectTrigger id="height" className="w-full">
										<SelectValue placeholder="Select height" />
									</SelectTrigger>
									<SelectContent>
										{HEIGHT_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Price Line Width */}
							<div className="space-y-2">
								<Label htmlFor="price-line-width" className="text-sm">
									Price Line Width
								</Label>
								<Select
									value={priceLineWidth.toString()}
									onValueChange={(value) => setPriceLineWidth(parseInt(value))}
								>
									<SelectTrigger id="price-line-width" className="w-full">
										<SelectValue placeholder="Select width" />
									</SelectTrigger>
									<SelectContent>
										{[1, 2, 3, 4].map((w) => (
											<SelectItem key={w} value={w.toString()}>
												{w}px
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Clear Filters Button */}
							<div className="pt-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleClearFilters}
									className="w-full"
								>
									Clear All Filters
								</Button>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
