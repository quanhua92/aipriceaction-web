import React from 'react'
import { useChartSettings, MaVisibility } from '@/contexts/ChartSettingsContext'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { TRADING_DAYS_PER_YEAR } from '@/lib/constants'

interface ChartSettingsDialogProps {
	children: React.ReactNode
}

const LIMIT_OPTIONS = [
	{ value: '30', label: '30 records' },
	{ value: '90', label: '90 records' },
	{ value: '180', label: '180 records' },
	{ value: TRADING_DAYS_PER_YEAR.toString(), label: `${TRADING_DAYS_PER_YEAR} records (1 year)` },
	{ value: (TRADING_DAYS_PER_YEAR * 2).toString(), label: `${TRADING_DAYS_PER_YEAR * 2} records (2 years)` },
	{ value: (TRADING_DAYS_PER_YEAR * 3).toString(), label: `${TRADING_DAYS_PER_YEAR * 3} records (3 years)` },
]

const HEIGHT_OPTIONS = [
	{ value: '200', label: '200px' },
	{ value: '300', label: '300px' },
	{ value: '400', label: '400px' },
	{ value: '500', label: '500px' },
	{ value: '600', label: '600px' },
]

export function ChartSettingsDialog({ children }: ChartSettingsDialogProps) {
	const { t } = useTranslation()
	const {
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
	} = useChartSettings()

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
		setLimit(TRADING_DAYS_PER_YEAR)
	}

	// Convert string date to Date object for calendar
	const startDateObj = startDate ? new Date(startDate) : undefined
	const endDateObj = endDate ? new Date(endDate) : undefined

	// Handle date selection from calendar
	const handleStartDateSelect = (date: Date | undefined) => {
		setStartDate(date ? format(date, 'yyyy-MM-dd') : undefined)
	}

	const handleEndDateSelect = (date: Date | undefined) => {
		setEndDate(date ? format(date, 'yyyy-MM-dd') : undefined)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Chart Settings</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Two-Column Layout */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Left Column: Moving Averages */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium">Moving Averages</h3>
							<div className="space-y-3">
								{/* MA10 */}
								<div className="flex items-center space-x-2">
									<Checkbox
										id="ma10"
										checked={maVisibility.ma10}
										onCheckedChange={() => handleMaToggle('ma10')}
									/>
									<Label
										htmlFor="ma10"
										className="text-sm font-normal cursor-pointer flex items-center gap-2"
									>
										<span className="w-8 h-0.5 bg-[#dc2626]" />
										MA10
									</Label>
								</div>

								{/* MA20 */}
								<div className="flex items-center space-x-2">
									<Checkbox
										id="ma20"
										checked={maVisibility.ma20}
										onCheckedChange={() => handleMaToggle('ma20')}
									/>
									<Label
										htmlFor="ma20"
										className="text-sm font-normal cursor-pointer flex items-center gap-2"
									>
										<span className="w-8 h-0.5 bg-[#16a34a]" />
										MA20
									</Label>
								</div>

								{/* MA50 */}
								<div className="flex items-center space-x-2">
									<Checkbox
										id="ma50"
										checked={maVisibility.ma50}
										onCheckedChange={() => handleMaToggle('ma50')}
									/>
									<Label
										htmlFor="ma50"
										className="text-sm font-normal cursor-pointer flex items-center gap-2"
									>
										<span className="w-8 h-0.5 bg-[#2563eb]" />
										MA50
									</Label>
								</div>

								{/* MA100 */}
								<div className="flex items-center space-x-2">
									<Checkbox
										id="ma100"
										checked={maVisibility.ma100}
										onCheckedChange={() => handleMaToggle('ma100')}
									/>
									<Label
										htmlFor="ma100"
										className="text-sm font-normal cursor-pointer flex items-center gap-2"
									>
										<span className="w-8 h-0.5 bg-[#a1a1aa]" />
										MA100
									</Label>
								</div>

								{/* MA200 */}
								<div className="flex items-center space-x-2">
									<Checkbox
										id="ma200"
										checked={maVisibility.ma200}
										onCheckedChange={() => handleMaToggle('ma200')}
									/>
									<Label
										htmlFor="ma200"
										className="text-sm font-normal cursor-pointer flex items-center gap-2"
									>
										<span className="w-8 h-0.5 bg-[#71717a]" />
										MA200
									</Label>
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
									<Popover>
										<PopoverTrigger asChild>
											<Button
												id="start-date"
												variant="outline"
												className="w-full justify-start text-left font-normal"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{startDateObj ? (
													format(startDateObj, 'PPP')
												) : (
													<span className="text-muted-foreground">Pick a date</span>
												)}
												{startDateObj && (
													<X
														className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
														onClick={(e) => {
															e.stopPropagation()
															handleStartDateSelect(undefined)
														}}
													/>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={startDateObj}
												onSelect={handleStartDateSelect}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
								</div>

								{/* End Date */}
								<div className="space-y-2">
									<Label htmlFor="end-date" className="text-sm">
										End Date
									</Label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												id="end-date"
												variant="outline"
												className="w-full justify-start text-left font-normal"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{endDateObj ? (
													format(endDateObj, 'PPP')
												) : (
													<span className="text-muted-foreground">Pick a date</span>
												)}
												{endDateObj && (
													<X
														className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
														onClick={(e) => {
															e.stopPropagation()
															handleEndDateSelect(undefined)
														}}
													/>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={endDateObj}
												onSelect={handleEndDateSelect}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
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
