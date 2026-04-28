import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SafeLocalStorage } from "@/lib/localStorage";
import { useTranslation } from "@/hooks/useTranslation";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { ArrowLeftRight, Columns2, Rows2 } from "lucide-react";

interface TreemapControlBarProps {
	defaultTicker: string;
	selectedTicker: string | null;
	onTickerChange?: (ticker: string) => void;
	storageKeyPrefix: string;
}

interface TreemapControlState {
	showAdditionalChart: boolean;
	layout: "horizontal" | "vertical";
	swapped: boolean;
	chartHeight: number;
	referenceTicker: string;
}

const VALID_HEIGHTS = [300, 400, 500, 600, 700, 800] as const;

function makeDefaultState(defaultTicker: string): TreemapControlState {
	return {
		showAdditionalChart: false,
		layout: "horizontal",
		swapped: false,
		chartHeight: 500,
		referenceTicker: defaultTicker,
	};
}

function loadState(prefix: string, defaultTicker: string): TreemapControlState {
	const defaults = makeDefaultState(defaultTicker);
	const stored = SafeLocalStorage.getItem(`${prefix}-treemap-control`);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			return {
				showAdditionalChart:
					typeof parsed.showAdditionalChart === "boolean"
						? parsed.showAdditionalChart
						: defaults.showAdditionalChart,
				layout:
					parsed.layout === "horizontal" || parsed.layout === "vertical"
						? parsed.layout
						: defaults.layout,
				swapped: typeof parsed.swapped === "boolean"
					? parsed.swapped
					: defaults.swapped,
				chartHeight: VALID_HEIGHTS.includes(parsed.chartHeight)
					? parsed.chartHeight
					: defaults.chartHeight,
				referenceTicker:
					typeof parsed.referenceTicker === "string" && parsed.referenceTicker
						? parsed.referenceTicker
						: defaults.referenceTicker,
			};
		} catch {
			// fall through
		}
	}
	return { ...defaults };
}

export function TreemapChartBar({
	defaultTicker,
	selectedTicker,
	onTickerChange,
	storageKeyPrefix,
}: TreemapControlBarProps) {
	const { t } = useTranslation();

	const [state, setState] = React.useState<TreemapControlState>(() =>
		loadState(storageKeyPrefix, defaultTicker),
	);

	const updateState = (partial: Partial<TreemapControlState>) => {
		setState((prev) => {
			const next = { ...prev, ...partial };
			SafeLocalStorage.setItem(
				`${storageKeyPrefix}-treemap-control`,
				JSON.stringify(next),
			);
			return next;
		});
	};

	if (!selectedTicker) return null;

	const showBothCharts = state.showAdditionalChart;

	const chartGridClass = showBothCharts
		? state.layout === "horizontal"
			? "grid grid-cols-1 md:grid-cols-2 gap-3"
			: "grid grid-cols-1 gap-3"
		: "";

	return (
		<>
			{/* Control Bar */}
			<div className="flex items-center gap-3 px-3 py-2 md:px-4 border-t border-b bg-background/50">
				{/* Switch: Show Additional Chart */}
				<div className="flex items-center gap-2">
					<Label
						htmlFor={`${storageKeyPrefix}-additional-chart`}
						className="text-xs text-muted-foreground cursor-pointer select-none"
					>
						{t("common.treemapControl.referenceChart")}
					</Label>
					<Switch
						id={`${storageKeyPrefix}-additional-chart`}
						checked={state.showAdditionalChart}
						onCheckedChange={(checked) =>
							updateState({ showAdditionalChart: checked === true })
						}
					/>
				</div>

				{/* Layout toggle (only when additional chart is ON) */}
				{state.showAdditionalChart && (
					<>
						<Separator orientation="vertical" className="h-4" />
						<div className="flex items-center gap-1">
							<Button
								variant={
									state.layout === "horizontal" ? "default" : "outline"
								}
								size="icon-sm"
								onClick={() => updateState({ layout: "horizontal" })}
								title={t("common.treemapControl.horizontal")}
							>
								<Columns2 className="size-3.5" />
							</Button>
							<Button
								variant={
									state.layout === "vertical" ? "default" : "outline"
								}
								size="icon-sm"
								onClick={() => updateState({ layout: "vertical" })}
								title={t("common.treemapControl.vertical")}
							>
								<Rows2 className="size-3.5" />
							</Button>
							<Button
								variant={state.swapped ? "default" : "outline"}
								size="icon-sm"
								onClick={() => updateState({ swapped: !state.swapped })}
								title={t("common.treemapControl.swap")}
							>
								<ArrowLeftRight className="size-3.5" />
							</Button>
						</div>
					</>
				)}

				{/* Height select */}
				<Separator orientation="vertical" className="h-4" />
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground hidden sm:inline">
						{t("common.treemapControl.height")}
					</span>
					<Select
						value={String(state.chartHeight)}
						onValueChange={(val) => updateState({ chartHeight: Number(val) })}
					>
						<SelectTrigger size="sm" className="w-[80px] h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VALID_HEIGHTS.map((h) => (
								<SelectItem key={h} value={String(h)}>
									{h}px
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Charts Area */}
			<div className="p-3 md:p-4">
				{showBothCharts ? (
					<div className={chartGridClass}>
						<TradingViewChart
							ticker={state.swapped ? state.referenceTicker : selectedTicker}
							height={state.chartHeight}
							showControls={true}
							hideFullscreenButton={false}
							onTickerChange={(ticker) => updateState({ referenceTicker: ticker })}
						/>
						<TradingViewChart
							ticker={state.swapped ? selectedTicker : state.referenceTicker}
							height={state.chartHeight}
							showControls={true}
							hideFullscreenButton={false}
							onTickerChange={(ticker) => updateState({ referenceTicker: ticker })}
						/>
					</div>
				) : (
					<TradingViewChart
						ticker={selectedTicker}
						height={state.chartHeight}
						showControls={true}
						hideFullscreenButton={false}
						onTickerChange={onTickerChange}
					/>
				)}
			</div>
		</>
	);
}
