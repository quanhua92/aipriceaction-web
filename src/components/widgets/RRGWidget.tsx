import * as React from "react";
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
import { useRefresh } from "@/contexts/RefreshContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getRRG, type RRGResponse, type RRGTicker } from "@/lib/api-client";
import { RRGCanvas } from "./RRGCanvas";
import { RRGDetailPanel } from "./RRGDetailPanel";
import { RRGTable } from "./RRGTable";

interface RRGWidgetProps {
	mode: "vn" | "crypto" | "yahoo";
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

export function RRGWidget({ mode }: RRGWidgetProps) {
	const { t } = useTranslation();
	const { lastRefresh } = useRefresh();

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
	const [jdkBenchmark, setJdkBenchmark] = React.useState(
		BENCHMARKS[mode]?.[0] || "VNINDEX",
	);
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

	const minVolume = React.useMemo(() => {
		return Math.round(10 ** (5 + (mascoreMinVol / 100) * 3));
	}, [mascoreMinVol]);

	const jdkMinVolume = React.useMemo(() => {
		return Math.round(10 ** (5 + (jdkMinVol / 100) * 3));
	}, [jdkMinVol]);

	// Data fetching - re-fetches when lastRefresh changes (auto-refresh pattern)
	React.useEffect(() => {
		let cancelled = false;

		async function fetchData() {
			setLoading(true);
			setError(null);

			try {
				const params = {
					algorithm: activeTab,
					mode,
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
		mode,
		mascoreTrails,
		minVolume,
		jdkTrails,
		jdkMinVolume,
		jdkBenchmark,
		jdkPeriod,
		lastRefresh,
	]);

	const maxTrails = activeTab === "mascore" ? mascoreTrails : jdkTrails;

	// Filter trails to match user slider — API may return more points than requested
	const displayData = React.useMemo(() => {
		if (!rrgData?.data) return null;
		if (maxTrails === 0) {
			return {
				...rrgData.data,
				tickers: rrgData.data.tickers.map((t) => ({ ...t, trails: undefined })),
			};
		}
		return {
			...rrgData.data,
			tickers: rrgData.data.tickers.map((t) => ({
				...t,
				trails: t.trails?.slice(-maxTrails),
			})),
		};
	}, [rrgData, maxTrails]);

	const tickers = displayData?.tickers ?? [];

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
						<h3 className="font-semibold text-sm">{t("common.rrg.help.title")}</h3>
						<p className="text-muted-foreground">{t("common.rrg.help.description")}</p>
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
							<p className="text-muted-foreground">{t("common.rrg.help.jdkMode")}</p>
						</div>
					</PopoverContent>
				</Popover>
			</div>

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
									{mascoreTrails === 0 ? t("common.rrg.noTrails") : mascoreTrails}
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
									{BENCHMARKS[mode]?.map((bm) => (
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
						{tableOpen ? t("common.rrg.table.collapse") : t("common.rrg.table.expand")}
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
