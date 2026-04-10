import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { ChartFullscreenDialog } from "@/components/ChartFullscreenDialog";
import { DateInput } from "@/components/DateInput";
import { TickerGroupSelector } from "@/components/TickerGroupSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAPI } from "@/contexts/APIContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getRRG, type RRGResponse, type RRGTicker } from "@/lib/api-client";
import {
	ALL_WATCHLIST_NAME,
	CRYPTO_WATCHLIST_NAME,
	GLOBAL_WATCHLIST_NAME,
} from "@/lib/constants";
import {
	getPredefinedWatchlistTickers,
	isPredefinedWatchlist,
} from "@/lib/predefined-watchlists";
import { getWatchlistTickers } from "@/lib/watchlist-storage";
import type { Quadrant, ViewBounds } from "./RRGCanvas";
import { getQuadrant, RRGCanvas } from "./RRGCanvas";
import { RRGDetailPanel } from "./RRGDetailPanel";
import { RRGTable } from "./RRGTable";

interface RRGWidgetProps {
	defaultGroup?: string;
}

const BENCHMARKS: Record<string, string[]> = {
	vn: ["VNINDEX", "VN30", "VN30F1M"],
	crypto: ["BTCUSDT", "ETHUSDT"],
	yahoo: ["^GSPC", "^DJI", "^NDX", "GC=F"],
};

function formatVolume(vol: number): string {
	if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
	if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
	return `${vol.toFixed(0)}`;
}

const DEFAULT_VISIBLE = 20;

/**
 * Exponential volume slider: slider=50 always shows ~DEFAULT_VISIBLE tickers.
 * slider=0 → all, slider=100 → ~1 ticker.
 * sortedVolumes must be ascending.
 */
function sliderToVolume(val: number, sortedVolumes: number[]): number {
	const N = sortedVolumes.length;
	if (val === 0 || N === 0) return 0;
	const target = Math.min(DEFAULT_VISIBLE, N);
	const k = 2 * Math.log(N / target);
	const fraction = Math.exp((-k * val) / 100);
	const visibleCount = Math.max(1, Math.round(N * fraction));
	const idx = Math.max(0, N - visibleCount);
	return sortedVolumes[idx];
}

/**
 * Compute default slider value to show approximately `targetCount` tickers.
 * Always returns ~50 for targetCount=20 (the DEFAULT_VISIBLE midpoint).
 */
function computeDefaultSlider(
	sortedVolumes: number[],
	targetCount: number,
): number {
	const N = sortedVolumes.length;
	if (N <= targetCount) return 0;
	const target = Math.min(DEFAULT_VISIBLE, N);
	const k = 2 * Math.log(N / target);
	const val = (-100 * Math.log(targetCount / N)) / k;
	return Math.round(Math.max(0, Math.min(100, val)));
}

/**
 * Determine API mode based on selected watchlist group.
 * Returns the narrowest mode possible; uses "all" only for mixed groups.
 */
function resolveApiMode(group: string): "vn" | "crypto" | "yahoo" | "all" {
	if (group === ALL_WATCHLIST_NAME) return "vn";
	if (group === CRYPTO_WATCHLIST_NAME) return "crypto";
	if (group === GLOBAL_WATCHLIST_NAME) return "yahoo";

	// Predefined watchlists (VN30, VINGROUP, etc.) are always VN stocks
	if (isPredefinedWatchlist(group)) return "vn";

	// Sectors are VN stocks (API tickerGroups only has VN sectors)
	// Custom watchlists could be mixed → use "all"
	return "all";
}

/**
 * Get benchmark options based on the resolved API mode.
 */
function getBenchmarksForMode(
	mode: "vn" | "crypto" | "yahoo" | "all",
): string[] {
	if (mode === "all") {
		// Combine all benchmarks when mode is all
		return [...BENCHMARKS.vn, ...BENCHMARKS.crypto, ...BENCHMARKS.yahoo];
	}
	return BENCHMARKS[mode] ?? BENCHMARKS.vn;
}

/**
 * Get the ticker symbols that belong to a selected group.
 * Returns null when no filtering is needed (ALL shows everything from API).
 */
function getGroupTickers(
	group: string,
	tickerGroups: Record<string, string[]> | null,
): string[] | null {
	if (group === ALL_WATCHLIST_NAME) return null; // Show all

	if (group === CRYPTO_WATCHLIST_NAME || group === GLOBAL_WATCHLIST_NAME)
		return null; // API mode already filters

	if (isPredefinedWatchlist(group)) {
		return getPredefinedWatchlistTickers(group);
	}

	// Custom watchlist
	const customTickers = getWatchlistTickers(group);
	if (customTickers.length > 0) return customTickers;

	// Sector group from API
	if (tickerGroups?.[group]) {
		return tickerGroups[group];
	}

	return null;
}

export function RRGWidget({
	defaultGroup = ALL_WATCHLIST_NAME,
}: RRGWidgetProps) {
	const { t } = useTranslation();
	const { lastRefresh } = useRefresh();
	const { tickerGroups, tickerNames, cryptoTickerNames, globalTickerNames } = useAPI();

	// Watchlist group state
	const [selectedGroup, setSelectedGroup] = React.useState(defaultGroup);

	// Tab state
	const [activeTab, setActiveTab] = React.useState<"mascore" | "jdk">(
		"mascore",
	);

	// MA Score controls
	const [mascoreTrails, setMascoreTrails] = React.useState(5);
	const [mascoreMinVol, setMascoreMinVol] = React.useState(67); // ~10M default

	// JdK controls
	const [jdkTrails, setJdkTrails] = React.useState(5);
	const [jdkMinVol, setJdkMinVol] = React.useState(67); // ~10M default
	const [jdkPeriod, setJdkPeriod] = React.useState(10);

	// Data state
	const [rrgData, setRrgData] = React.useState<RRGResponse | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	// Interaction state
	const [hoveredTicker, setHoveredTicker] = React.useState<RRGTicker | null>(
		null,
	);
	const [selectedTicker, setSelectedTicker] = React.useState<RRGTicker | null>(
		null,
	);

	// Table state
	const [tableOpen, setTableOpen] = React.useState(false);

	// Date state — default to today
	const [selectedDate, setSelectedDate] = React.useState<string | null>(() => {
		return new Date().toISOString().split("T")[0];
	});

	// Fullscreen chart dialog state
	const [fullscreenTicker, setFullscreenTicker] = React.useState<string | null>(
		null,
	);

	const handlePrevDate = React.useCallback(() => {
		if (!selectedDate) return;
		const d = new Date(selectedDate);
		d.setDate(d.getDate() - 1);
		setSelectedDate(d.toISOString().split("T")[0]);
	}, [selectedDate]);

	const handleNextDate = React.useCallback(() => {
		if (!selectedDate) return;
		const d = new Date(selectedDate);
		d.setDate(d.getDate() + 1);
		setSelectedDate(d.toISOString().split("T")[0]);
	}, [selectedDate]);

	// Quadrant visibility filter
	const [hiddenQuadrants, setHiddenQuadrants] = React.useState<Set<Quadrant>>(
		new Set(),
	);

	const toggleQuadrant = React.useCallback((q: Quadrant) => {
		setHiddenQuadrants((prev) => {
			const next = new Set(prev);
			if (next.has(q)) next.delete(q);
			else next.add(q);
			return next;
		});
	}, []);

	// Resolve API mode from selected group
	const apiMode = React.useMemo(
		() => resolveApiMode(selectedGroup),
		[selectedGroup],
	);

	// Benchmark options based on mode
	const benchmarkOptions = React.useMemo(
		() => getBenchmarksForMode(apiMode),
		[apiMode],
	);

	// Default benchmark: pick the first one matching the mode, or VNINDEX
	const defaultBenchmark = React.useMemo(() => {
		if (apiMode === "vn") return "VNINDEX";
		if (apiMode === "crypto") return "BTCUSDT";
		if (apiMode === "yahoo") return "^GSPC";
		return "VNINDEX";
	}, [apiMode]);

	const [jdkBenchmark, setJdkBenchmark] = React.useState(defaultBenchmark);

	// Reset benchmark when mode changes and current benchmark is not in new options
	// biome-ignore lint/correctness/useExhaustiveDependencies: apiMode triggers re-evaluation when group changes
	React.useEffect(() => {
		if (!benchmarkOptions.includes(jdkBenchmark)) {
			setJdkBenchmark(defaultBenchmark);
		}
	}, [apiMode, benchmarkOptions, jdkBenchmark, defaultBenchmark]);

	// Sorted volumes for percentile-based slider mapping
	const sortedVolumes = React.useMemo(() => {
		if (!rrgData?.data?.tickers?.length) return [];
		return [...rrgData.data.tickers].map((t) => t.volume).sort((a, b) => a - b);
	}, [rrgData]);

	const minVolume = React.useMemo(() => {
		return sliderToVolume(mascoreMinVol, sortedVolumes);
	}, [mascoreMinVol, sortedVolumes]);

	const jdkMinVolume = React.useMemo(() => {
		return sliderToVolume(jdkMinVol, sortedVolumes);
	}, [jdkMinVol, sortedVolumes]);

	// Get the ticker symbols for the selected group (for client-side filtering)
	const groupTickerSet = React.useMemo(() => {
		const symbols = getGroupTickers(selectedGroup, tickerGroups);
		if (!symbols) return null;
		return new Set(symbols.map((s) => s.toUpperCase()));
	}, [selectedGroup, tickerGroups]);

	// Compute default slider value to show ~20 dots within the selected group
	const defaultSliderVal = React.useMemo(() => {
		if (!rrgData?.data?.tickers?.length) return 0;
		// Filter to selected group's tickers first
		let tickers = rrgData.data.tickers;
		if (groupTickerSet) {
			tickers = tickers.filter((t) =>
				groupTickerSet.has(t.symbol.toUpperCase()),
			);
		}
		if (!tickers.length) return 0;
		const groupSorted = tickers.map((t) => t.volume).sort((a, b) => a - b);
		return computeDefaultSlider(groupSorted, 20);
	}, [rrgData, groupTickerSet]);

	// Auto-set volume slider when group changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: selectedGroup triggers update even if defaultSliderVal is same
	React.useEffect(() => {
		setMascoreMinVol(defaultSliderVal);
		setJdkMinVol(defaultSliderVal);
	}, [selectedGroup, defaultSliderVal]);

	// Data fetching - re-fetches when lastRefresh changes (auto-refresh pattern)
	// biome-ignore lint/correctness/useExhaustiveDependencies: lastRefresh intentionally triggers re-fetch
	React.useEffect(() => {
		let cancelled = false;

		async function fetchData() {
			setLoading(true);
			setError(null);

			try {
				const params = {
					algorithm: activeTab,
					mode: apiMode,
					trails: activeTab === "mascore" ? mascoreTrails : jdkTrails,
					// Yahoo tickers (e.g. ^GSPC) often have low volume; let client-side slider handle filtering
					...(apiMode === "yahoo" ? { min_volume: 0 } : {}),
					...(activeTab === "jdk"
						? { benchmark: jdkBenchmark, period: jdkPeriod }
						: {}),
					...(selectedDate ? { date: selectedDate } : {}),
				};

				const response = await getRRG(params);

				if (!cancelled) {
					setRrgData(response);
					setSelectedTicker(null);
					setHoveredTicker(null);
				}
			} catch (err) {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : String(err);
					setError(msg);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		fetchData();
		return () => {
			cancelled = true;
		};
	}, [
		activeTab,
		apiMode,
		selectedGroup,
		mascoreTrails,
		jdkTrails,
		jdkBenchmark,
		jdkPeriod,
		selectedDate,
		lastRefresh,
	]);

	const maxTrails = activeTab === "mascore" ? mascoreTrails : jdkTrails;

	// Filter trails to match user slider, then filter by selected group and volume
	const activeVolumeThreshold =
		activeTab === "mascore" ? minVolume : jdkMinVolume;
	const displayData = React.useMemo(() => {
		if (!rrgData?.data) return null;

		let filtered = rrgData.data.tickers;

		// Client-side filter by selected watchlist
		if (groupTickerSet) {
			filtered = filtered.filter((t) =>
				groupTickerSet.has(t.symbol.toUpperCase()),
			);
		}

		// Client-side filter by volume threshold
		if (activeVolumeThreshold > 0) {
			filtered = filtered.filter((t) => t.volume >= activeVolumeThreshold);
		}

		// Client-side filter by hidden quadrants
		if (hiddenQuadrants.size > 0) {
			filtered = filtered.filter((t) => {
				const q = getQuadrant(t.rs_ratio, t.rs_momentum, activeTab);
				return !hiddenQuadrants.has(q);
			});
		}

		// Filter trails to match user slider
		if (maxTrails === 0) {
			return {
				...rrgData.data,
				tickers: filtered.map((t) => ({ ...t, trails: undefined })),
			};
		}
		return {
			...rrgData.data,
			tickers: filtered.map((t) => ({
				...t,
				trails: t.trails?.slice(-maxTrails),
			})),
		};
	}, [
		rrgData,
		maxTrails,
		groupTickerSet,
		activeVolumeThreshold,
		hiddenQuadrants,
		activeTab,
	]);

	const tickers = displayData?.tickers ?? [];

	// Compute viewport bounds for consistent scaling between main canvas and detail panel
	const viewBounds = React.useMemo((): ViewBounds | null => {
		if (!displayData?.tickers?.length) return null;
		const center = activeTab === "mascore" ? 0 : 100;

		let dataXMin = Infinity;
		let dataXMax = -Infinity;
		let dataYMin = Infinity;
		let dataYMax = -Infinity;

		for (const ticker of displayData.tickers) {
			dataXMin = Math.min(dataXMin, ticker.rs_ratio);
			dataXMax = Math.max(dataXMax, ticker.rs_ratio);
			dataYMin = Math.min(dataYMin, ticker.rs_momentum);
			dataYMax = Math.max(dataYMax, ticker.rs_momentum);

			if (ticker.trails) {
				for (const trail of ticker.trails) {
					dataXMin = Math.min(dataXMin, trail.rs_ratio);
					dataXMax = Math.max(dataXMax, trail.rs_ratio);
					dataYMin = Math.min(dataYMin, trail.rs_momentum);
					dataYMax = Math.max(dataYMax, trail.rs_momentum);
				}
			}
		}

		const margin = activeTab === "mascore" ? 5 : 3;
		dataXMin = Math.min(dataXMin, center - margin);
		dataXMax = Math.max(dataXMax, center + margin);
		dataYMin = Math.min(dataYMin, center - margin);
		dataYMax = Math.max(dataYMax, center + margin);

		const xRange = dataXMax - dataXMin;
		const yRange = dataYMax - dataYMin;
		const xPad = xRange * 0.1;
		const yPad = yRange * 0.1;

		return {
			xMin: dataXMin - xPad,
			xMax: dataXMax + xPad,
			yMin: dataYMin - yPad,
			yMax: dataYMax + yPad,
		};
	}, [displayData, activeTab]);

	// Handle group change
	const handleGroupChange = React.useCallback((group: string) => {
		setSelectedGroup(group);
		setSelectedTicker(null);
		setHoveredTicker(null);
	}, []);

	return (
		<div className="border rounded-lg bg-card p-3 md:p-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<h2 className="text-sm md:text-base font-semibold">
						{t("common.rrg.title")}
					</h2>
					{tickers.length > 0 && (
						<Badge variant="secondary" className="text-[10px]">
							{t("common.rrg.tickersCount", { count: tickers.length })}
						</Badge>
					)}
				</div>

				{/* Help popover */}
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted"
						>
							?
						</button>
					</PopoverTrigger>
					<PopoverContent
						className="w-80 text-xs space-y-2"
						side="bottom"
						align="end"
					>
						<h3 className="font-semibold text-sm">
							{t("common.rrg.help.title")}
						</h3>
						<p className="text-muted-foreground">
							{t("common.rrg.help.description")}
						</p>
						<div className="space-y-1">
							<p className="font-medium text-green-500">
								{t("common.rrg.help.leading")}
							</p>
							<p className="font-medium text-blue-500">
								{t("common.rrg.help.improving")}
							</p>
							<p className="font-medium text-red-500">
								{t("common.rrg.help.weakening")}
							</p>
							<p className="font-medium text-orange-500">
								{t("common.rrg.help.lagging")}
							</p>
						</div>
						<div className="border-t pt-2 space-y-1">
							<p className="text-muted-foreground">
								{t("common.rrg.help.mascoreMode")}
							</p>
							<p className="text-muted-foreground">
								{t("common.rrg.help.jdkMode")}
							</p>
						</div>
					</PopoverContent>
				</Popover>
			</div>

			{/* Watchlist + Date row */}
			<div className="flex items-center gap-2 mb-3">
				<TickerGroupSelector
					value={selectedGroup}
					onValueChange={handleGroupChange}
					showAll={true}
					showCrypto={true}
					showGlobal={true}
					showPredefined={true}
					showCustom={true}
					showSectors={true}
					refreshKey={0}
					className="h-8 text-xs flex-1 min-w-0"
				/>
				<div className="flex items-center gap-1 flex-shrink-0">
					<Button
						variant="outline"
						size="sm"
						className="h-8 w-8 p-0"
						onClick={handlePrevDate}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="h-8 font-mono text-xs"
							>
								{selectedDate ?? "—"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-2" align="center">
							<DateInput
								value={selectedDate || undefined}
								onChange={(val) => setSelectedDate(val ?? null)}
								clearable={true}
							/>
						</PopoverContent>
					</Popover>
					<Button
						variant="outline"
						size="sm"
						className="h-8 w-8 p-0"
						onClick={handleNextDate}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as "mascore" | "jdk")}
			>
				<TabsList className="grid grid-cols-2 w-full mb-3">
					<TabsTrigger value="mascore" className="flex-1 text-xs md:text-sm">
						{t("common.rrg.mascoreTab")}
					</TabsTrigger>
					<TabsTrigger value="jdk" className="flex-1 text-xs md:text-sm">
						{t("common.rrg.jdkTab")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="mascore" className="space-y-3">
					{/* MA Score controls */}
					<div className="flex flex-col md:flex-row md:items-center gap-3">
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs text-muted-foreground">
									{t("common.rrg.trails")}
								</span>
								<span className="text-xs font-mono">
									{mascoreTrails === 0
										? t("common.rrg.noTrails")
										: mascoreTrails}
								</span>
							</div>
							<Slider
								value={[mascoreTrails]}
								onValueChange={([v]) => setMascoreTrails(v)}
								min={0}
								max={20}
								step={1}
								className="w-full"
							/>
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs text-muted-foreground">
									{t("common.rrg.minVolume")}
								</span>
								<span className="text-xs font-mono">
									{formatVolume(minVolume)}
								</span>
							</div>
							<Slider
								value={[mascoreMinVol]}
								onValueChange={([v]) => setMascoreMinVol(v)}
								min={0}
								max={100}
								step={1}
								className="w-full"
							/>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="jdk" className="space-y-3">
					{/* JdK controls */}
					<div className="flex flex-col md:flex-row md:items-end gap-3">
						<div className="md:w-40">
							<span className="text-xs text-muted-foreground mb-1 block">
								{t("common.rrg.benchmark")}
							</span>
							<Select value={jdkBenchmark} onValueChange={setJdkBenchmark}>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{benchmarkOptions.map((bm) => (
										<SelectItem key={bm} value={bm} className="text-xs">
											{bm}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs text-muted-foreground">
									{t("common.rrg.period")}
								</span>
								<span className="text-xs font-mono">{jdkPeriod}</span>
							</div>
							<Slider
								value={[jdkPeriod]}
								onValueChange={([v]) => setJdkPeriod(v)}
								min={4}
								max={50}
								step={1}
								className="w-full"
							/>
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs text-muted-foreground">
									{t("common.rrg.trails")}
								</span>
								<span className="text-xs font-mono">
									{jdkTrails === 0 ? t("common.rrg.noTrails") : jdkTrails}
								</span>
							</div>
							<Slider
								value={[jdkTrails]}
								onValueChange={([v]) => setJdkTrails(v)}
								min={0}
								max={20}
								step={1}
								className="w-full"
							/>
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs text-muted-foreground">
									{t("common.rrg.minVolume")}
								</span>
								<span className="text-xs font-mono">
									{formatVolume(jdkMinVolume)}
								</span>
							</div>
							<Slider
								value={[jdkMinVol]}
								onValueChange={([v]) => setJdkMinVol(v)}
								min={0}
								max={100}
								step={1}
								className="w-full"
							/>
						</div>
					</div>
				</TabsContent>
			</Tabs>

			{/* Quadrant filter checkboxes */}
			{!loading && rrgData && (
				<div className="flex items-center gap-3 flex-wrap mt-4 mb-2">
					{(
						[
							{ key: "leading", color: "text-green-500" },
							{ key: "improving", color: "text-blue-500" },
							{ key: "weakening", color: "text-red-500" },
							{ key: "lagging", color: "text-orange-500" },
						] as const
					).map(({ key, color }) => (
						// biome-ignore lint/a11y/useSemanticElements: checkbox wraps label text
						<div
							key={key}
							className="flex items-center gap-1.5 cursor-pointer select-none"
							onClick={() => toggleQuadrant(key)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") toggleQuadrant(key);
							}}
							role="checkbox"
							aria-checked={!hiddenQuadrants.has(key)}
							tabIndex={0}
						>
							<Checkbox
								checked={!hiddenQuadrants.has(key)}
								onCheckedChange={() => toggleQuadrant(key)}
								onClick={(e) => e.stopPropagation()}
								className={`${color} border-current data-[state=checked]:${color}`}
							/>
							<span className={`text-xs ${color}`}>
								{t(`common.rrg.quadrants.${key}`)}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Canvas area */}
			<div className="relative mt-3">
				{loading ? (
					<Skeleton className="w-full h-[300px] md:h-[400px]" />
				) : error ? (
					<div className="flex items-center justify-center h-[300px] md:h-[400px] text-sm text-muted-foreground">
						{t("common.rrg.noData")}
					</div>
				) : tickers.length === 0 ? (
					<div className="flex items-center justify-center h-[300px] md:h-[400px] text-sm text-muted-foreground">
						{t("common.rrg.noData")}
					</div>
				) : (
					displayData && (
						<RRGCanvas
							data={displayData}
							algorithm={activeTab}
							hoveredTicker={hoveredTicker}
							selectedTicker={selectedTicker}
							onHover={setHoveredTicker}
							onSelect={setSelectedTicker}
							showLabels={true}
							viewBounds={viewBounds}
						/>
					)
				)}
			</div>

			{/* Collapsible table */}
			{tickers.length > 0 && (
				<Collapsible open={tableOpen} onOpenChange={setTableOpen}>
					<CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-3 mb-2 transition-colors">
						<span className="text-[10px]">
							{tableOpen ? "\u25BC" : "\u25B6"}
						</span>
						{tableOpen
							? t("common.rrg.table.collapse")
							: t("common.rrg.table.expand")}
					</CollapsibleTrigger>
					<CollapsibleContent>
						<RRGTable
							tickers={tickers}
							allTickers={rrgData?.data?.tickers ?? []}
							selectedTicker={selectedTicker}
							algorithm={activeTab}
							onSelectTicker={setSelectedTicker}
							tickerNamesMap={{ ...tickerNames, ...cryptoTickerNames, ...globalTickerNames }}
						/>
					</CollapsibleContent>
				</Collapsible>
			)}

			{/* Detail Dialog */}
			<RRGDetailPanel
				ticker={selectedTicker}
				algorithm={activeTab}
				onClose={() => setSelectedTicker(null)}
				onFullscreen={() =>
					selectedTicker && setFullscreenTicker(selectedTicker.symbol)
				}
				viewBounds={viewBounds}
			/>

			{/* Fullscreen Chart Dialog */}
			<ChartFullscreenDialog
				ticker={fullscreenTicker}
				onClose={() => setFullscreenTicker(null)}
			/>
		</div>
	);
}
