import * as React from "react";
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

interface HomeChartBarProps {
	chartTickers: string[];
	onChartTickerChange: (index: number, symbol: string) => void;
	storageKeyPrefix: string;
}

interface HomeChartBarState {
	visibleCount: number;
	columns: 1 | 2 | 3 | 4 | 5 | 6;
	chartHeight: number;
}

const VALID_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const VALID_HEIGHTS = [300, 400, 500, 600, 700, 800] as const;
const VALID_COLUMNS = [1, 2, 3, 4, 5, 6] as const;

function makeDefaultState(): HomeChartBarState {
	return {
		visibleCount: 2,
		columns: 2,
		chartHeight: 400,
	};
}

function loadState(prefix: string): HomeChartBarState {
	const defaults = makeDefaultState();
	const stored = SafeLocalStorage.getItem(`${prefix}-home-chart-control`);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			return {
				visibleCount: VALID_COUNTS.includes(parsed.visibleCount)
					? parsed.visibleCount
					: defaults.visibleCount,
				columns: VALID_COLUMNS.includes(parsed.columns)
					? parsed.columns
					: defaults.columns,
				chartHeight: VALID_HEIGHTS.includes(parsed.chartHeight)
					? parsed.chartHeight
					: defaults.chartHeight,
			};
		} catch {
			// fall through
		}
	}
	return { ...defaults };
}

export function HomeChartBar({
	chartTickers,
	onChartTickerChange,
	storageKeyPrefix,
}: HomeChartBarProps) {
	const { t } = useTranslation();

	const [state, setState] = React.useState<HomeChartBarState>(() =>
		loadState(storageKeyPrefix),
	);

	const updateState = (partial: Partial<HomeChartBarState>) => {
		setState((prev) => {
			const next = { ...prev, ...partial };
			SafeLocalStorage.setItem(
				`${storageKeyPrefix}-home-chart-control`,
				JSON.stringify(next),
			);
			return next;
		});
	};

	const visibleTickers = chartTickers.slice(0, state.visibleCount);

	const gridColsClass = {
		1: "grid-cols-1",
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-3",
		4: "grid-cols-1 md:grid-cols-2 2xl:grid-cols-4",
		5: "grid-cols-1 md:grid-cols-3 2xl:grid-cols-5",
		6: "grid-cols-1 md:grid-cols-3 2xl:grid-cols-6",
	}[state.columns];

	return (
		<div>
			{/* Control Bar */}
			<div className="flex items-center gap-3 px-3 py-2 md:px-4 border-t border-b bg-background/50">
				{/* Charts count selector */}
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground hidden sm:inline">
						{t("common.charts")}
					</span>
					<Select
						value={String(state.visibleCount)}
						onValueChange={(val) => updateState({ visibleCount: Number(val) })}
					>
						<SelectTrigger size="sm" className="w-[70px] h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VALID_COUNTS.map((count) => (
								<SelectItem key={count} value={String(count)}>
									{count}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Columns selector */}
				<Separator orientation="vertical" className="h-4" />
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground hidden sm:inline">
						{t("common.columns")}
					</span>
					<Select
						value={String(state.columns)}
						onValueChange={(val) => updateState({ columns: Number(val) as HomeChartBarState["columns"] })}
					>
						<SelectTrigger size="sm" className="w-[70px] h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VALID_COLUMNS.map((col) => (
								<SelectItem key={col} value={String(col)}>
									{col}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Height select */}
				<Separator orientation="vertical" className="h-4" />
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground hidden sm:inline">
						{t("common.height")}
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

			{/* Charts Grid */}
			<div className="p-3 md:p-4">
				<div className={`grid ${gridColsClass} gap-4`}>
					{visibleTickers.map((ticker, index) => (
						<TradingViewChart
							key={`${ticker}-${index}`}
							ticker={ticker}
							onTickerChange={(symbol) => onChartTickerChange(index, symbol)}
							height={state.chartHeight}
							showControls={true}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
