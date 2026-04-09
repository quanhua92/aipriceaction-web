import * as React from "react";
import { TickerGroupSelector } from "@/components/TickerGroupSelector";
import { Badge } from "@/components/ui/badge";
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
import { RRGCanvas } from "./RRGCanvas";
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

// Slider value 0-100 maps to volume 100K-100M via 10**(5 + value/100 * 3)
// slider=0 → 100K, slider=67 → ~10M, slider=100 → 100M
function formatVolumeSlider(val: number): string {
	const vol = 10 ** (5 + (val / 100) * 3);
	if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
	return `${(vol / 1_000).toFixed(0)}K`;
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
	const { tickerGroups } = useAPI();

	// Watchlist group state
	const [selectedGroup, setSelectedGroup] = React.useState(defaultGroup);

	// Tab state
	const [activeTab, setActiveTab] = React.useState<"mascore" | "jdk">(
		"mascore",
	);

	// MA Score controls
	const [mascoreTrails, setMascoreTrails] = React.useState(2);
	const [mascoreMinVol, setMascoreMinVol] = React.useState(67); // ~10M default

	// JdK controls
	const [jdkTrails, setJdkTrails] = React.useState(2);
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

	const minVolume = React.useMemo(() => {
		return Math.round(10 ** (5 + (mascoreMinVol / 100) * 3));
	}, [mascoreMinVol]);

	const jdkMinVolume = React.useMemo(() => {
		return Math.round(10 ** (5 + (jdkMinVol / 100) * 3));
	}, [jdkMinVol]);

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
					min_volume: activeTab === "mascore" ? minVolume : jdkMinVolume,
					...(activeTab === "jdk"
						? { benchmark: jdkBenchmark, period: jdkPeriod }
						: {}),
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
		mascoreTrails,
		minVolume,
		jdkTrails,
		jdkMinVolume,
		jdkBenchmark,
		jdkPeriod,
		lastRefresh,
	]);

	const maxTrails = activeTab === "mascore" ? mascoreTrails : jdkTrails;

	// Get the ticker symbols for the selected group (for client-side filtering)
	const groupTickerSet = React.useMemo(() => {
		const symbols = getGroupTickers(selectedGroup, tickerGroups);
		if (!symbols) return null;
		return new Set(symbols.map((s) => s.toUpperCase()));
	}, [selectedGroup, tickerGroups]);

	// Filter trails to match user slider, then filter by selected group
	const displayData = React.useMemo(() => {
		if (!rrgData?.data) return null;

		let filtered = rrgData.data.tickers;

		// Client-side filter by selected watchlist
		if (groupTickerSet) {
			filtered = filtered.filter((t) =>
				groupTickerSet.has(t.symbol.toUpperCase()),
			);
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
	}, [rrgData, maxTrails, groupTickerSet]);

	const tickers = displayData?.tickers ?? [];

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

			{/* Watchlist selector row */}
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
				className="h-8 text-xs mb-3"
			/>

			{/* Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as "mascore" | "jdk")}
			>
				<TabsList className="w-full mb-3">
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
									{formatVolumeSlider(mascoreMinVol)}
								</span>
							</div>
							<Slider
								value={[mascoreMinVol]}
								onValueChange={([v]) => setMascoreMinVol(v)}
								min={0}
								max={100}
								step={5}
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
									{formatVolumeSlider(jdkMinVol)}
								</span>
							</div>
							<Slider
								value={[jdkMinVol]}
								onValueChange={([v]) => setJdkMinVol(v)}
								min={0}
								max={100}
								step={5}
								className="w-full"
							/>
						</div>
					</div>
				</TabsContent>
			</Tabs>

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
						<>
							<RRGCanvas
								data={displayData}
								algorithm={activeTab}
								hoveredTicker={hoveredTicker}
								selectedTicker={selectedTicker}
								onHover={setHoveredTicker}
								onSelect={setSelectedTicker}
								showLabels={true}
							/>
							{selectedTicker && (
								<RRGDetailPanel
									ticker={selectedTicker}
									algorithm={activeTab}
									onClose={() => setSelectedTicker(null)}
								/>
							)}
						</>
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
							selectedTicker={selectedTicker}
							algorithm={activeTab}
							onSelectTicker={setSelectedTicker}
						/>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
	);
}
