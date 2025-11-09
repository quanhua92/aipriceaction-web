import { useTicker } from '@/contexts/TickerContext'
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
import { useTranslation } from '@/hooks/useTranslation'

interface ChartSettingsDialogProps {
	children: React.ReactNode
}

export function ChartSettingsDialog({ children }: ChartSettingsDialogProps) {
	const { t } = useTranslation()
	const { maVisibility, setMaVisibility, resetMaVisibility } = useTicker()

	const handleMaToggle = (ma: keyof typeof maVisibility) => {
		setMaVisibility({
			...maVisibility,
			[ma]: !maVisibility[ma],
		})
	}

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Chart Settings</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Moving Averages Section */}
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
					</div>

					{/* Reset Button */}
					<div className="pt-2">
						<Button
							variant="outline"
							size="sm"
							onClick={resetMaVisibility}
							className="w-full"
						>
							Reset to Defaults
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
